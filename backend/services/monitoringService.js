/**
 * monitoringService.js - Polls all Proxmox clusters, detects status
 * transitions of managed resources, records them in status_events and
 * notifies opted-in users by e-mail (down / recovered).
 *
 * Design decisions:
 * - Debounce: a transition is only reported after DEBOUNCE_CHECKS
 *   consecutive polls with the new status (avoids flapping/reboot noise).
 * - Only resources that are managed in the portal (resources table)
 *   trigger e-mails; raw cluster changes are still recorded as events.
 * - Never throws: monitoring must not take down the API.
 */

const { all, run } = require('../config/database');
const { decrypt } = require('./cryptoService');
const { getClusterResources } = require('./proxmoxService');
const { sendEmail } = require('./emailService');
const { resourceDownTemplate, resourceRecoveredTemplate } = require('./emailTemplates');

const INTERVAL_MS = Math.max(15, parseInt(process.env.MONITOR_INTERVAL_SECONDS || '60', 10)) * 1000;
const DEBOUNCE_CHECKS = Math.max(1, parseInt(process.env.MONITOR_DEBOUNCE_CHECKS || '2', 10));
const EVENT_RETENTION_DAYS = Math.max(1, parseInt(process.env.MONITOR_EVENT_RETENTION_DAYS || '30', 10));

// clusterId -> Map<containerId, { status, pendingStatus, pendingCount }>
const stateByCluster = new Map();
let timer = null;
let running = false;

function isDown(status) {
  return status !== 'running';
}

/**
 * All portal users that should be notified for a given managed resource:
 * the owner plus members of the shared group (deduplicated),
 * filtered by their notification preference column.
 */
async function getRecipients(clusterId, containerId, prefColumn) {
  return all(
    `
    SELECT DISTINCT u.id, u.email, u.name, u.preferred_language
    FROM resources r
    LEFT JOIN user_groups ug ON ug.group_id = r.group_id
    JOIN users u ON u.id = r.user_id OR u.id = ug.user_id
    WHERE r.cluster_id = ? AND r.container_id = ? AND u.${prefColumn} = 1
    `,
    [clusterId, String(containerId)]
  );
}

async function getManagedResourceName(clusterId, containerId) {
  const rows = await all(
    'SELECT name FROM resources WHERE cluster_id = ? AND container_id = ? LIMIT 1',
    [clusterId, String(containerId)]
  );
  return rows[0]?.name || null;
}

async function recordEvent(clusterId, containerId, resourceName, oldStatus, newStatus) {
  try {
    await run(
      'INSERT INTO status_events (cluster_id, container_id, resource_name, old_status, new_status) VALUES (?, ?, ?, ?, ?)',
      [clusterId, String(containerId), resourceName || '', oldStatus || '', newStatus || '']
    );
  } catch (err) {
    console.error('Monitoring: could not record status event:', err.message);
  }
}

async function notifyTransition(cluster, resource, oldStatus, newStatus) {
  const wentDown = !isDown(oldStatus) && isDown(newStatus);
  const recovered = isDown(oldStatus) && !isDown(newStatus);
  if (!wentDown && !recovered) return;

  const managedName = await getManagedResourceName(cluster.id, resource.id);
  const displayName = managedName || resource.name;

  await recordEvent(cluster.id, resource.id, displayName, oldStatus, newStatus);

  // E-mails go only to users of resources managed in the portal -
  // the recipients query returns nothing for unmanaged cluster resources.
  const prefColumn = wentDown ? 'notify_resource_down' : 'notify_resource_recovered';
  let recipients = [];
  try {
    recipients = await getRecipients(cluster.id, resource.id, prefColumn);
  } catch (err) {
    console.error('Monitoring: recipient lookup failed:', err.message);
    return;
  }

  for (const user of recipients) {
    const template = wentDown
      ? resourceDownTemplate({
          name: user.name,
          resourceName: displayName,
          containerId: resource.id,
          clusterName: cluster.name,
          since: new Date(),
          language: user.preferred_language || 'en'
        })
      : resourceRecoveredTemplate({
          name: user.name,
          resourceName: displayName,
          containerId: resource.id,
          clusterName: cluster.name,
          since: new Date(),
          language: user.preferred_language || 'en'
        });
    try {
      await sendEmail(user.email, template.subject, template.text, template.html);
    } catch (err) {
      console.error(`Monitoring: mail to ${user.email} failed:`, err.message);
    }
  }

  console.log(
    `Monitoring: ${cluster.name} / ${resource.id} (${displayName}) ${oldStatus} -> ${newStatus}` +
    (recipients.length ? ` - ${recipients.length} Benachrichtigung(en) versendet` : '')
  );
}

async function pollCluster(cluster) {
  let resources;
  try {
    resources = await getClusterResources(cluster.url, decrypt(cluster.api_token));
  } catch (err) {
    // Cluster unreachable - do not flap all resources to "down"; skip this round.
    console.error(`Monitoring: cluster "${cluster.name}" unreachable:`, err.message);
    return;
  }

  let state = stateByCluster.get(cluster.id);
  const firstRun = !state;
  if (firstRun) {
    state = new Map();
    stateByCluster.set(cluster.id, state);
  }

  const seen = new Set();

  for (const resource of resources) {
    const key = String(resource.id);
    seen.add(key);
    const current = resource.status || 'unknown';
    const entry = state.get(key);

    if (!entry) {
      // Baseline - never alert on the very first observation
      state.set(key, { status: current, pendingStatus: null, pendingCount: 0 });
      continue;
    }

    if (current === entry.status) {
      entry.pendingStatus = null;
      entry.pendingCount = 0;
      continue;
    }

    // Status differs from confirmed state → debounce
    if (entry.pendingStatus === current) {
      entry.pendingCount += 1;
    } else {
      entry.pendingStatus = current;
      entry.pendingCount = 1;
    }

    if (entry.pendingCount >= DEBOUNCE_CHECKS) {
      const oldStatus = entry.status;
      entry.status = current;
      entry.pendingStatus = null;
      entry.pendingCount = 0;
      await notifyTransition(cluster, resource, oldStatus, current);
    }
  }

  // Resources removed from the cluster: drop state silently
  for (const key of [...state.keys()]) {
    if (!seen.has(key)) state.delete(key);
  }
}

async function pollAll() {
  if (running) return; // never overlap
  running = true;
  try {
    const clusters = await all('SELECT id, name, url, api_token FROM proxmox_clusters');
    for (const cluster of clusters) {
      await pollCluster(cluster);
    }
    // Housekeeping: prune old events roughly once per ~100 polls
    if (Math.random() < 0.01) {
      await run(`DELETE FROM status_events WHERE created_at < datetime('now', ?)`, [`-${EVENT_RETENTION_DAYS} days`]);
    }
  } catch (err) {
    console.error('Monitoring: poll cycle failed:', err.message);
  } finally {
    running = false;
  }
}

function startMonitoring() {
  if (timer) return;
  timer = setInterval(pollAll, INTERVAL_MS);
  timer.unref?.();
  // First poll shortly after boot so the baseline is established early
  setTimeout(pollAll, 10 * 1000).unref?.();
  console.log(`✓ Monitoring gestartet (Intervall ${INTERVAL_MS / 1000}s, Debounce ${DEBOUNCE_CHECKS} Checks)`);
}

function stopMonitoring() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { startMonitoring, stopMonitoring };

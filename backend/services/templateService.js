const { get, run, all } = require('../config/database');
const { decrypt } = require('./cryptoService');
const { getOnlineNodes, getNodeTemplates, getPreparedLxcTemplates } = require('./proxmoxService');

function parseAllowedTemplates(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function cleanVersion(value) {
  return String(value || '').replace(/[_-]+/g, '.').replace(/\.+/g, '.').replace(/^\.|\.$/g, '');
}

function inferTemplateMetadata(value) {
  const file = String(value || '').split('/').pop() || String(value || '');
  const lower = file.toLowerCase();
  let osFamily = 'Linux';
  let osVersion = '';
  if (lower.includes('debian')) {
    osFamily = 'Debian';
    osVersion = cleanVersion((lower.match(/debian[-_]?([0-9]+(?:[._-][0-9]+)?)/) || [])[1]);
  } else if (lower.includes('ubuntu')) {
    osFamily = 'Ubuntu';
    osVersion = cleanVersion((lower.match(/ubuntu[-_]?([0-9]+(?:[._-][0-9]+)?)/) || [])[1]);
  } else if (lower.includes('alpine')) {
    osFamily = 'Alpine Linux';
    osVersion = cleanVersion((lower.match(/alpine[-_]?([0-9]+(?:[._-][0-9]+)?)/) || [])[1]);
  }
  let profileType = 'base';
  if (lower.includes('docker')) profileType = 'docker';
  else if (lower.includes('nginx')) profileType = 'nginx';
  const profileSuffix = profileType === 'docker' ? ' with Docker' : profileType === 'nginx' ? ' with Nginx' : '';
  const displayName = `${osFamily}${osVersion ? ` ${osVersion}` : ''}${profileSuffix}`;
  return { displayName, osFamily, osVersion, profileType };
}

async function upsertTemplate(clusterId, item, allowed) {
  const inferred = inferTemplateMetadata(`${item.name || item.volid} ${item.tags || ''} ${item.description || ''}`);
  const displayName = item.displayName || item.name || inferred.displayName;
  const osFamily = item.osFamily || inferred.osFamily;
  const osVersion = item.osVersion || inferred.osVersion;
  const profileType = item.profileType || inferred.profileType;
  const enabled = allowed.has(item.volid) ? 1 : 0;
  await run(`
    INSERT INTO template_profiles
      (cluster_id, volid, storage, display_name, os_family, os_version, profile_type,
       description, tags, enabled, present, source_type, source_node, source_vmid, min_disk_gb)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
    ON CONFLICT(cluster_id, volid) DO UPDATE SET
      storage = excluded.storage,
      source_type = excluded.source_type,
      source_node = excluded.source_node,
      source_vmid = excluded.source_vmid,
      min_disk_gb = excluded.min_disk_gb,
      present = 1,
      updated_at = CURRENT_TIMESTAMP
  `, [
    clusterId, item.volid, item.storage || '', displayName, osFamily, osVersion, profileType,
    item.description || '', item.tags || '', enabled, item.sourceType || 'archive', item.sourceNode || '',
    item.sourceVmid || null, Math.max(Number(item.minDiskGb) || 4, 4)
  ]);
}

async function syncClusterTemplates(clusterId) {
  const cluster = await get('SELECT * FROM proxmox_clusters WHERE id = ?', [clusterId]);
  if (!cluster) throw new Error('Cluster not found');
  const token = decrypt(cluster.api_token);
  const nodes = await getOnlineNodes(cluster.url, token);
  if (!nodes.length) throw new Error('No online node available');
  const storage = cluster.template_storage || 'local';
  const allowed = new Set(parseAllowedTemplates(cluster.allowed_templates));
  const discovered = new Map();

  for (const node of nodes) {
    const archives = await getNodeTemplates(cluster.url, token, node.node, storage).catch(() => []);
    for (const archive of archives) {
      if (discovered.has(archive.volid)) continue;
      discovered.set(archive.volid, {
        ...archive,
        storage,
        sourceType: 'archive',
        sourceNode: node.node,
        sourceVmid: null,
        minDiskGb: 4
      });
    }
  }

  const preparedTemplates = await getPreparedLxcTemplates(cluster.url, token).catch(() => []);
  for (const template of preparedTemplates) discovered.set(template.volid, template);

  await run('UPDATE template_profiles SET present = 0, updated_at = CURRENT_TIMESTAMP WHERE cluster_id = ?', [clusterId]);
  for (const item of discovered.values()) await upsertTemplate(clusterId, item, allowed);
  return listClusterTemplates(clusterId);
}

async function ensureClusterTemplates(clusterId) {
  const count = await get('SELECT COUNT(*) AS count FROM template_profiles WHERE cluster_id = ?', [clusterId]);
  if (!Number(count?.count || 0)) {
    try { await syncClusterTemplates(clusterId); } catch (_) { /* cluster may be temporarily offline */ }
  }
  return listClusterTemplates(clusterId);
}

async function listClusterTemplates(clusterId) {
  return all(`
    SELECT id, cluster_id AS clusterId, volid, storage, display_name AS displayName,
      os_family AS osFamily, os_version AS osVersion, profile_type AS profileType,
      description, tags, enabled, present, source_type AS sourceType,
      source_node AS sourceNode, source_vmid AS sourceVmid, min_disk_gb AS minDiskGb,
      created_at AS createdAt, updated_at AS updatedAt
    FROM template_profiles
    WHERE cluster_id = ?
    ORDER BY present DESC, enabled DESC, source_type DESC, display_name COLLATE NOCASE
  `, [clusterId]);
}

module.exports = { inferTemplateMetadata, syncClusterTemplates, ensureClusterTemplates, listClusterTemplates };

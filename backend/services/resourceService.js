const { getClusterResources, getResourceDiskDetails, getContainerIps } = require('./proxmoxService');
const { decrypt } = require('./cryptoService');

function stripCidr(ip) {
  return String(ip || '').split('/')[0].trim();
}

function isUsableIpv4(ip) {
  const value = stripCidr(ip);
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return false;
  const parts = value.split('.').map(Number);
  if (parts.some(part => part < 0 || part > 255)) return false;
  if (parts[0] === 127 || parts[0] === 0) return false;
  if (parts[0] === 169 && parts[1] === 254) return false;
  return value !== '255.255.255.255';
}

function normalizeIpEntries(entries = []) {
  return entries
    .map((entry) => {
      const ipv4 = stripCidr(entry.ipv4 || entry.ip || '');
      const ipv6 = String(entry.ipv6 || '').trim();
      if (!isUsableIpv4(ipv4) && !ipv6) return null;
      return {
        interface: entry.interface || entry.name || '',
        ipv4: isUsableIpv4(ipv4) ? ipv4 : '',
        ipv6
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const aEth = /^(eth0|net0)$/i.test(a.interface || '') ? 0 : 1;
      const bEth = /^(eth0|net0)$/i.test(b.interface || '') ? 0 : 1;
      if (aEth !== bEth) return aEth - bEth;
      return String(a.interface || '').localeCompare(String(b.interface || ''), undefined, { numeric: true });
    });
}


function templateDisplayName(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const withoutStorage = raw.includes(':') ? raw.slice(raw.indexOf(':') + 1) : raw;
  return withoutStorage.replace(/^vztmpl\//i, '');
}

function inferOperatingSystemFromTemplate(value) {
  const filename = templateDisplayName(value).toLowerCase();
  if (!filename) return '';
  const labels = [
    ['ubuntu', 'Ubuntu'], ['debian', 'Debian'], ['alpine', 'Alpine Linux'],
    ['archlinux', 'Arch Linux'], ['centos', 'CentOS'], ['rockylinux', 'Rocky Linux'],
    ['rocky', 'Rocky Linux'], ['alma', 'AlmaLinux'], ['fedora', 'Fedora'],
    ['opensuse', 'openSUSE'], ['devuan', 'Devuan'], ['gentoo', 'Gentoo Linux'],
    ['nixos', 'NixOS']
  ];
  const match = labels.find(([needle]) => filename.includes(needle));
  if (!match) return '';
  const version = filename.match(/(?:^|[-_])(\d+(?:\.\d+){0,2})(?:[-_]|$)/)?.[1];
  return version ? `${match[1]} ${version}` : match[1];
}

function normalizeResourceRow(row, liveResource = null, error = null, diskInfo = null, ipEntries = [], systemInfo = null) {
  const liveName = liveResource?.name || liveResource?.id || liveResource?.vmid;
  const disks = Array.isArray(diskInfo?.disks) ? diskInfo.disks : [];
  const filesystems = Array.isArray(diskInfo?.filesystems) ? diskInfo.filesystems : [];
  const ips = normalizeIpEntries(ipEntries);
  const manualIp = stripCidr(row.manual_ip || '');
  const provisionedIp = stripCidr(row.provisioned_ip || '');
  const livePrimaryIp = ips.find(item => item.ipv4)?.ipv4 || '';
  const detectedIp = provisionedIp || livePrimaryIp;
  const isSelfService = !!row.provisioned_id && String(row.provisioned_user_id || '') === String(row.user_id || '');
  const resourceType = String(liveResource?.type || row.resource_type || row.container_type || 'unknown').toLowerCase();
  // Manual service IPs are intentionally limited to administrator-assigned
  // QEMU VMs. LXC addresses remain API/provisioning managed and self-service
  // containers continue using their automatically allocated pool address.
  const canConfigureManualIp = !row.provisioned_id && resourceType === 'qemu';
  const effectiveManualIp = canConfigureManualIp && isUsableIpv4(manualIp) ? manualIp : '';
  const primaryIp = effectiveManualIp || detectedIp;
  const sourceTemplate = String(row.provisioned_template || systemInfo?.sourceTemplate || '').trim();
  const operatingSystem = String(systemInfo?.operatingSystem || inferOperatingSystemFromTemplate(sourceTemplate) || '').trim();

  if (provisionedIp && !ips.some(item => item.ipv4 === provisionedIp)) {
    ips.unshift({ interface: 'reserved', ipv4: provisionedIp, ipv6: '' });
  }
  if (effectiveManualIp && !ips.some(item => item.ipv4 === effectiveManualIp)) {
    ips.unshift({ interface: 'manual', ipv4: effectiveManualIp, ipv6: '' });
  }

  return {
    id: row.id,
    name: row.name || liveName || `Ressource ${row.container_id}`,
    containerId: String(row.container_id),
    vmid: liveResource?.vmid || row.container_id,
    type: resourceType,
    status: liveResource?.status || 'unknown',
    node: liveResource?.node || row.node || '',
    cpu: Number(liveResource?.cpu || 0),
    maxcpu: Number(liveResource?.maxcpu || 0),
    mem: Number(liveResource?.mem || 0),
    maxmem: Number(liveResource?.maxmem || 0),
    disk: Number(diskInfo?.disk ?? liveResource?.disk ?? 0),
    maxdisk: Number(diskInfo?.maxdisk ?? liveResource?.maxdisk ?? 0),
    disks,
    filesystems,
    uptime: Number(liveResource?.uptime || 0),
    ips,
    primaryIp,
    detectedIp,
    manualIp: effectiveManualIp,
    canConfigureManualIp,
    sshPort: Number(row.ssh_port || 22),
    clusterId: row.cluster_id,
    clusterName: row.cluster_name || '',
    clusterPublishingEnabled: Number(row.allow_publishing ?? 1) === 1,
    userId: row.user_id,
    userName: row.user_name || '',
    userEmail: row.user_email || '',
    groupId: row.group_id || null,
    groupName: row.group_name || '',
    operatingSystem,
    operatingSystemCode: String(systemInfo?.operatingSystemCode || '').trim(),
    sourceTemplate,
    sourceTemplateName: templateDisplayName(sourceTemplate),
    manualPublicUrl: row.manual_public_url || '',
    webUrl: row.public_url || row.web_url || '',
    publicUrl: row.public_url || row.web_url || '',
    adminUrl: row.admin_url || '',
    canDelete: !!row.provisioned_id,
    isSelfService,
    adminReadOnly: isSelfService,
    source: isSelfService ? 'self-service' : 'admin',
    monitorError: error || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function enrichResources(rows) {
  const grouped = rows.reduce((acc, row) => {
    const key = String(row.cluster_id);
    if (!acc[key]) {
      acc[key] = {
        clusterUrl: row.cluster_url,
        apiToken: decrypt(row.api_token),
        rows: []
      };
    }
    acc[key].rows.push(row);
    return acc;
  }, {});

  const result = [];

  for (const group of Object.values(grouped)) {
    let liveResources = [];
    let clusterError = null;

    try {
      liveResources = await getClusterResources(group.clusterUrl, group.apiToken);
    } catch (err) {
      clusterError = err.message || 'Monitoring konnte nicht geladen werden.';
    }

    for (const row of group.rows) {
      const liveResource = liveResources.find(item => String(item.vmid) === String(row.container_id));
      let diskInfo = null;
      let ipEntries = [];
      let rowError = clusterError;

      if (liveResource && !clusterError) {
        const [diskResult, ipResult] = await Promise.allSettled([
          getResourceDiskDetails(group.clusterUrl, group.apiToken, liveResource),
          getContainerIps(group.clusterUrl, group.apiToken, liveResource.node, liveResource.type, liveResource.vmid)
        ]);

        if (diskResult.status === 'fulfilled') diskInfo = diskResult.value;
        else rowError = diskResult.reason?.message || 'Disk-Informationen konnten nicht geladen werden.';

        if (ipResult.status === 'fulfilled') ipEntries = ipResult.value;
      }

      result.push(normalizeResourceRow(row, liveResource, rowError, diskInfo, ipEntries, diskInfo?.systemInfo || null));
    }
  }

  return result;
}

module.exports = {
  enrichResources
};

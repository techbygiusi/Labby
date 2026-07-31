function normalizeNamePart(value, fallback) {
  const normalized = String(value || '')
    .replace(/ß/gi, 'ss')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return normalized || fallback;
}

function buildPangolinResourceName({
  userName,
  userEmail,
  userId,
  containerName,
  containerId,
  protocol,
  targetPort,
  publicPort
} = {}) {
  const normalizedUser = normalizeNamePart(
    userName || String(userEmail || '').split('@')[0],
    `User_${userId || 'unknown'}`
  );
  const normalizedContainer = normalizeNamePart(
    containerName,
    `Container_${containerId || 'unknown'}`
  );
  const normalizedProtocol = ['HTTP', 'TCP', 'UDP'].includes(String(protocol || '').toUpperCase())
    ? String(protocol).toUpperCase()
    : 'HTTP';
  const port = normalizedProtocol === 'HTTP' ? Number(targetPort) : Number(publicPort || targetPort);
  const normalizedPort = Number.isInteger(port) && port > 0 ? String(port) : 'unknown';
  const suffix = `_${normalizedProtocol}_${normalizedPort}`;
  const identityLimit = Math.max(1, 255 - suffix.length);
  const identity = `${normalizedUser}_${normalizedContainer}`
    .slice(0, identityLimit)
    .replace(/_+$/g, '') || 'User_Container';

  return `${identity}${suffix}`;
}

module.exports = {
  normalizeNamePart,
  buildPangolinResourceName
};

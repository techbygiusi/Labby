function cleanOrigin(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    return `${url.protocol}//${url.host}`.replace(/\/+$/, '');
  } catch (_) {
    return '';
  }
}

function firstConfiguredUrl(value) {
  return String(value || '')
    .split(',')
    .map(item => cleanOrigin(item))
    .find(Boolean) || '';
}

function getPublicFrontendUrl(req) {
  const configuredFrontend = firstConfiguredUrl(process.env.FRONTEND_URL);
  if (configuredFrontend) return configuredFrontend;

  const configuredOrigin = firstConfiguredUrl(process.env.FRONTEND_ORIGIN);
  if (configuredOrigin) return configuredOrigin;

  const origin = cleanOrigin(req?.headers?.origin);
  if (origin) return origin;

  const referer = cleanOrigin(req?.headers?.referer);
  if (referer) return referer;

  const forwardedHost = String(req?.headers?.['x-forwarded-host'] || '').split(',')[0].trim();
  const host = forwardedHost || String(req?.headers?.host || '').trim();
  if (host) {
    const forwardedProto = String(req?.headers?.['x-forwarded-proto'] || '').split(',')[0].trim();
    const proto = forwardedProto || (req?.secure ? 'https' : 'http');
    return `${proto}://${host}`.replace(/\/+$/, '');
  }

  return 'http://localhost:3000';
}

module.exports = { getPublicFrontendUrl };

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;
const DATA_DIR = process.env.DATA_DIR || '/data';
const DB_PATH = path.join(DATA_DIR, 'labby.json');

// ── SSO / Auth configuration ───────────────────────────────────────────────
const AUTH_ENABLED      = (process.env.AUTH_ENABLED || 'false').toLowerCase() === 'true';
const AUTH_USER_HEADER  = (process.env.AUTH_USER_HEADER || 'x-auth-request-user').toLowerCase();
const AUTH_ALLOWED_USERS = (process.env.AUTH_ALLOWED_USERS || '')
  .split(',').map(u => u.trim()).filter(Boolean);

/**
 * Extracts the authenticated user from the request.
 * Supports:
 *   1. X-Auth-Request-User header  — set by oauth2-proxy, Authentik, Authelia
 *   2. Authorization: Bearer <jwt> — set by Keycloak / any OIDC provider
 *      (reads the "sub" or "preferred_username" claim without verifying signature;
 *       signature verification is expected to happen at the reverse-proxy layer)
 */
function getAuthUser(req) {
  // 1. Forwarded-user header (oauth2-proxy / Authentik / Authelia)
  const headerUser = req.headers[AUTH_USER_HEADER];
  if (headerUser) return headerUser;

  // 2. Bearer JWT — decode payload without verification
  const authHeader = req.headers['authorization'] || '';
  if (authHeader.startsWith('Bearer ')) {
    try {
      const payload = JSON.parse(
        Buffer.from(authHeader.slice(7).split('.')[1], 'base64url').toString('utf8')
      );
      return payload.preferred_username || payload.email || payload.sub || null;
    } catch {
      // malformed token — fall through to null
    }
  }

  return null;
}

/**
 * Authentication middleware.
 * Only active when AUTH_ENABLED=true.
 * Returns 401 if no valid user identity can be found, or if the user
 * is not in the AUTH_ALLOWED_USERS list (when that list is non-empty).
 */
function authMiddleware(req, res, next) {
  if (!AUTH_ENABLED) return next();

  const user = getAuthUser(req);

  if (!user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required. No valid user identity found in request headers.',
      hint: 'Place an SSO reverse proxy (oauth2-proxy, Authentik, Keycloak, Authelia) in front of Labby and set AUTH_ENABLED=true.'
    });
  }

  if (AUTH_ALLOWED_USERS.length > 0 && !AUTH_ALLOWED_USERS.includes(user)) {
    return res.status(403).json({
      error: 'Forbidden',
      message: `User "${user}" is not in the allowed users list.`
    });
  }

  // Attach user to request for downstream use
  req.labbyUser = user;
  next();
}

// ── Ensure data directory exists ───────────────────────────────────────────
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

app.use(express.json({ limit: '10mb' }));

// ── CORS ───────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Auth-Request-User, X-Auth-Request-Email');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ── Apply auth to all API routes ───────────────────────────────────────────
app.use('/api', authMiddleware);

// ── GET /api/data ──────────────────────────────────────────────────────────
app.get('/api/data', (req, res) => {
  try {
    if (!fs.existsSync(DB_PATH)) return res.json({ items: [], locations: [], racks: [] });
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return res.json({ items: parsed, locations: [], racks: [] });
    }
    res.json({
      items:     Array.isArray(parsed.items)     ? parsed.items     : [],
      locations: Array.isArray(parsed.locations) ? parsed.locations : [],
      racks:     Array.isArray(parsed.racks)     ? parsed.racks     : [],
    });
  } catch {
    res.json({ items: [], locations: [], racks: [] });
  }
});

// ── POST /api/data ─────────────────────────────────────────────────────────
app.post('/api/data', (req, res) => {
  const body = req.body;
  let data;
  if (Array.isArray(body)) {
    let existing = { locations: [], racks: [] };
    try {
      if (fs.existsSync(DB_PATH)) {
        const raw = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        if (!Array.isArray(raw)) {
          existing.locations = raw.locations || [];
          existing.racks = raw.racks || [];
        }
      }
    } catch {}
    data = { items: body, locations: existing.locations, racks: existing.racks };
  } else if (body && typeof body === 'object') {
    data = {
      items:     Array.isArray(body.items)     ? body.items     : [],
      locations: Array.isArray(body.locations) ? body.locations : [],
      racks:     Array.isArray(body.racks)     ? body.racks     : [],
    };
  } else {
    return res.status(400).json({ error: 'Body must be a JSON array or { items, locations, racks } object.' });
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(data), 'utf8');
  res.json({ ok: true, count: data.items.length });
});

// ── GET /api/health ────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    auth: {
      enabled:      AUTH_ENABLED,
      userHeader:   AUTH_USER_HEADER,
      allowedUsers: AUTH_ALLOWED_USERS.length > 0 ? AUTH_ALLOWED_USERS : 'all',
    }
  });
});

// ── POST /api/ping ─────────────────────────────────────────────────────────
app.post('/api/ping', (req, res) => {
  const { ip } = req.body;
  if (!ip || typeof ip !== 'string') {
    return res.status(400).json({ error: 'IP address required' });
  }
  const { exec } = require('child_process');
  const pingCmd = process.platform === 'win32'
    ? `ping -n 1 -w 1000 ${ip}`
    : `ping -c 1 -W 1000 ${ip}`;

  exec(pingCmd, { timeout: 5000 }, (error) => {
    res.json({ status: error ? 'offline' : 'online', ip });
  });
});

// ── POST /api/check-url ────────────────────────────────────────────────────
app.post('/api/check-url', (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL required' });
  }
  const isHttps = url.startsWith('https');
  const http = require(isHttps ? 'https' : 'http');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  const request = http.request(url, { method: 'HEAD', signal: controller.signal }, (response) => {
    clearTimeout(timeoutId);
    const ok = response.statusCode >= 200 && response.statusCode < 400;
    res.json({ status: ok ? 'online' : 'offline', url, statusCode: response.statusCode });
  });

  request.on('error', () => {
    clearTimeout(timeoutId);
    res.json({ status: 'offline', url });
  });

  request.end();
});

app.listen(PORT, () => {
  console.log(`Labby backend running on port ${PORT}`);
  if (AUTH_ENABLED) {
    console.log(`Auth ENABLED — user header: "${AUTH_USER_HEADER}"`);
    if (AUTH_ALLOWED_USERS.length > 0) {
      console.log(`Allowed users: ${AUTH_ALLOWED_USERS.join(', ')}`);
    }
  } else {
    console.log('Auth DISABLED (set AUTH_ENABLED=true to enable SSO)');
  }
});

/*
 * Labby Backend API
 * -----------------------------------------------------------------------------
 * Stores the homelab inventory JSON, serves the static app, and validates scoped
 * Agent API keys for automation clients. Keep this file dependency-light so the
 * self-hosted Docker deployment stays simple.
 *
 * Security notes for contributors:
 *  - Never persist one-time API key tokens, only hashes and metadata.
 *  - Agent key records are exported/imported only when encrypted by the client export key.
 *  - Validate scopes before every agent write or ping operation.
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;
const DATA_DIR = process.env.DATA_DIR || '/data';
const DB_PATH = path.join(DATA_DIR, 'labby.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});



// Public demo safety: my-labby.com is intentionally visual/browser-only.
// Do not allow this demo backend to open SSH sessions or accept Agent API keys.
function rejectDemoRuntimeApi(req, res) {
  res.status(403).json({
    error: 'Disabled in the public Labby demo. Use the self-hosted Main version for real SSH and Agent API access.',
    demoOnly: true,
  });
}

app.use(['/api/ssh', '/api/agent', '/api/agent-keys'], rejectDemoRuntimeApi);

// ── Agent API keys and automation endpoints ────────────────────────────────
const crypto = require('crypto');

function readDb() {
  try {
    if (!fs.existsSync(DB_PATH)) return { items: [], locations: [], racks: [], agentKeys: [], agentStatus: {} };
    const raw = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    if (Array.isArray(raw)) return { items: raw, locations: [], racks: [], agentKeys: [], agentStatus: {} };
    return {
      items: Array.isArray(raw.items) ? raw.items : [],
      locations: Array.isArray(raw.locations) ? raw.locations : [],
      racks: Array.isArray(raw.racks) ? raw.racks : [],
      agentKeys: Array.isArray(raw.agentKeys) ? raw.agentKeys : [],
      agentStatus: raw.agentStatus && typeof raw.agentStatus === 'object' ? raw.agentStatus : {},
    };
  } catch {
    return { items: [], locations: [], racks: [], agentKeys: [], agentStatus: {} };
  }
}

function writeDb(data) {
  const existing = readDb();
  const next = {
    items: Array.isArray(data.items) ? data.items : existing.items,
    locations: Array.isArray(data.locations) ? data.locations : existing.locations,
    racks: Array.isArray(data.racks) ? data.racks : existing.racks,
    agentKeys: Array.isArray(data.agentKeys) ? data.agentKeys : existing.agentKeys,
    agentStatus: data.agentStatus && typeof data.agentStatus === 'object' ? data.agentStatus : existing.agentStatus,
  };
  fs.writeFileSync(DB_PATH, JSON.stringify(next), 'utf8');
  return next;
}

function hashKey(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function normalizeAgentExpiry(value) {
  const max = Date.now() + 365 * 24 * 60 * 60 * 1000;
  const fallback = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const parsed = Date.parse(value || '');
  const target = Number.isFinite(parsed) ? parsed : fallback;
  return new Date(Math.min(Math.max(target, Date.now() + 60 * 1000), max)).toISOString();
}

function isAgentKeyExpired(key) {
  return !!key.expiresAt && Date.parse(key.expiresAt) <= Date.now();
}

function publicAgentKey(key) {
  return {
    id: key.id,
    name: key.name,
    prefix: key.prefix,
    scopes: Array.isArray(key.scopes) ? key.scopes : [],
    enabled: key.enabled !== false,
    createdAt: key.createdAt,
    expiresAt: key.expiresAt || '',
    lastUsed: key.lastUsed || '',
  };
}

function requireAgentScope(scope) {
  return (req, res, next) => {
    const header = req.get('Authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) return res.status(401).json({ error: 'Missing bearer token.' });

    const data = readDb();
    const tokenHash = hashKey(token);
    const key = data.agentKeys.find((entry) => entry.hash === tokenHash && entry.enabled !== false);
    if (!key || isAgentKeyExpired(key)) return res.status(401).json({ error: 'Invalid, expired or disabled API key.' });

    const scopes = Array.isArray(key.scopes) ? key.scopes : [];
    if (!scopes.includes(scope) && !scopes.includes('*')) {
      return res.status(403).json({ error: `Missing scope: ${scope}` });
    }

    key.lastUsed = new Date().toISOString();
    writeDb(data);
    req.agentKey = key;
    next();
  };
}


function agentHasScope(key, scope) {
  const scopes = Array.isArray(key?.scopes) ? key.scopes : [];
  return scopes.includes(scope) || scopes.includes('*');
}

function stripCredentialsFromItems(items) {
  return (Array.isArray(items) ? items : []).map((item) => {
    const clone = { ...item };
    delete clone.credentials;
    return clone;
  });
}

function mergeCredentialsFromExisting(nextItems, existingItems) {
  const existingById = new Map((Array.isArray(existingItems) ? existingItems : []).map((item) => [item.id, item]));
  return (Array.isArray(nextItems) ? nextItems : []).map((item) => {
    const existing = existingById.get(item.id);
    if (existing?.credentials && !item.credentials) return { ...item, credentials: existing.credentials };
    return item;
  });
}

app.get('/api/agent-keys', (req, res) => {
  const data = readDb();
  res.json({ keys: data.agentKeys.map(publicAgentKey) });
});

app.post('/api/agent-keys', (req, res) => {
  const body = req.body || {};
  const name = String(body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Name is required.' });

  const scopes = Array.isArray(body.scopes) ? body.scopes.map(String) : [];
  const rawKey = `labby_${crypto.randomBytes(24).toString('hex')}`;
  const data = readDb();
  const entry = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    prefix: rawKey.slice(0, 12),
    hash: hashKey(rawKey),
    scopes,
    enabled: true,
    createdAt: new Date().toISOString(),
    expiresAt: normalizeAgentExpiry(body.expiresAt),
    lastUsed: '',
  };
  data.agentKeys.push(entry);
  writeDb(data);
  res.json({ key: publicAgentKey(entry), token: rawKey });
});

app.patch('/api/agent-keys/:id', (req, res) => {
  const data = readDb();
  const key = data.agentKeys.find((entry) => entry.id === req.params.id);
  if (!key) return res.status(404).json({ error: 'API key not found.' });
  if (typeof req.body.name === 'string') key.name = req.body.name.trim() || key.name;
  if (Array.isArray(req.body.scopes)) key.scopes = req.body.scopes.map(String);
  if (typeof req.body.expiresAt === 'string') key.expiresAt = normalizeAgentExpiry(req.body.expiresAt);
  if (typeof req.body.enabled === 'boolean') key.enabled = req.body.enabled;
  writeDb(data);
  res.json({ key: publicAgentKey(key) });
});

app.delete('/api/agent-keys/:id', (req, res) => {
  const data = readDb();
  const before = data.agentKeys.length;
  data.agentKeys = data.agentKeys.filter((entry) => entry.id !== req.params.id);
  writeDb(data);
  res.json({ ok: true, removed: before - data.agentKeys.length });
});

app.get('/api/agent/inventory', requireAgentScope('inventory:read'), (req, res) => {
  const data = readDb();
  const canReadCredentials = agentHasScope(req.agentKey, 'credentials:read');
  res.json({
    items: canReadCredentials ? data.items : stripCredentialsFromItems(data.items),
    locations: data.locations,
    racks: data.racks,
    agentStatus: data.agentStatus,
    credentials: canReadCredentials ? 'included' : 'excluded',
  });
});

app.put('/api/agent/inventory', requireAgentScope('inventory:write'), (req, res) => {
  const body = req.body || {};
  const data = readDb();
  if (Array.isArray(body.items)) {
    data.items = agentHasScope(req.agentKey, 'credentials:write')
      ? body.items
      : mergeCredentialsFromExisting(stripCredentialsFromItems(body.items), data.items);
  }
  data.locations = Array.isArray(body.locations) ? body.locations : data.locations;
  data.racks = Array.isArray(body.racks) ? body.racks : data.racks;
  writeDb(data);
  res.json({ ok: true, count: data.items.length });
});

app.get('/api/agent/status', requireAgentScope('status:read'), (req, res) => {
  res.json({ status: readDb().agentStatus });
});

app.post('/api/agent/status', requireAgentScope('status:write'), (req, res) => {
  const { itemId, ipStatus, urlStatus, message } = req.body || {};
  if (!itemId) return res.status(400).json({ error: 'itemId is required.' });
  const data = readDb();
  data.agentStatus[String(itemId)] = {
    ...(data.agentStatus[String(itemId)] || {}),
    ...(ipStatus ? { ipStatus: String(ipStatus) } : {}),
    ...(urlStatus ? { urlStatus: String(urlStatus) } : {}),
    ...(message ? { message: String(message) } : {}),
    checkedAt: new Date().toISOString(),
    source: req.agentKey.name,
  };
  writeDb(data);
  res.json({ ok: true, status: data.agentStatus[String(itemId)] });
});

app.post('/api/agent/ping', requireAgentScope('ping:run'), (req, res) => {
  const { ip } = req.body || {};
  if (!ip || typeof ip !== 'string') return res.status(400).json({ error: 'IP address required' });
  const { exec } = require('child_process');
  const isWindows = process.platform === 'win32';
  const pingCmd = isWindows ? `ping -n 1 -w 1000 ${ip}` : `ping -c 1 -W 1000 ${ip}`;
  exec(pingCmd, { timeout: 5000 }, (error) => {
    res.json({ status: error ? 'offline' : 'online', ip });
  });
});



// ── Browser SSH bridge ─────────────────────────────────────────────────────
// Starts the system SSH client and streams stdout/stderr through small polling
// endpoints. When Labby credentials include a password, sshpass is used through
// the SSHPASS environment variable so the password is not written into the
// command line or terminal output.
const { spawn, execFile } = require('child_process');
const sshSessions = new Map();
const SSH_TMP_DIR = '/tmp/labby-ssh';

function ensureSshTmpDir() {
  try { fs.mkdirSync(SSH_TMP_DIR, { recursive: true, mode: 0o700 }); } catch {}
}

function cleanupSessionFiles(session) {
  if (!session?.tempDir) return;
  try { fs.rmSync(session.tempDir, { recursive: true, force: true }); } catch {}
}


function safeSshHost(value) {
  const host = String(value || '').trim();
  if (!/^[a-zA-Z0-9_.:-]+$/.test(host)) return '';
  return host;
}

function safeSshUser(value) {
  const user = String(value || '').trim();
  if (!user) return '';
  if (!/^[a-zA-Z0-9_.-]+$/.test(user)) return '';
  return user;
}

function clearKnownHost(host) {
  return new Promise((resolve) => {
    const cleanHost = safeSshHost(host);
    if (!cleanHost) return resolve({ ok: false, error: 'Valid SSH host/IP is required.' });
    execFile('ssh-keygen', ['-R', cleanHost], { timeout: 5000 }, (error, stdout, stderr) => {
      // ssh-keygen -R returns non-zero when the host was not present. For this
      // workflow that is not fatal: the next SSH connection can still create a
      // fresh known-host entry through StrictHostKeyChecking=accept-new.
      resolve({ ok: true, output: `${stdout || ''}${stderr || ''}`.trim() });
    });
  });
}

app.post('/api/ssh/known-host/clear', async (req, res) => {
  const host = safeSshHost(req.body?.host);
  if (!host) return res.status(400).json({ error: 'Valid SSH host/IP is required.' });
  const result = await clearKnownHost(host);
  if (!result.ok) return res.status(400).json({ error: result.error || 'Could not clear SSH key.' });
  res.json({ ok: true, output: result.output || '' });
});

app.post('/api/ssh/start', async (req, res) => {
  const host = safeSshHost(req.body?.host);
  const username = safeSshUser(req.body?.username);
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const privateKey = typeof req.body?.privateKey === 'string' ? req.body.privateKey.trim() : '';
  // A private key is enough to select key-based auth. Username is optional:
  // when empty, OpenSSH uses the backend container's default SSH user.
  const authMethod = req.body?.authMethod === 'key' || privateKey ? 'key' : 'password';
  const keyPassphrase = typeof req.body?.keyPassphrase === 'string' ? req.body.keyPassphrase : '';
  if (!host) return res.status(400).json({ error: 'Valid SSH host/IP is required.' });
  if (req.body?.clearKnownHost === true) await clearKnownHost(host);

  const sessionId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const target = username ? `${username}@${host}` : host;
  let tempDir = '';
  let keyPath = '';
  let askPassPath = '';

  if (authMethod === 'key') {
    if (!privateKey || !privateKey.includes('PRIVATE KEY')) {
      return res.status(400).json({ error: 'A valid SSH private key is required.' });
    }
    ensureSshTmpDir();
    tempDir = path.join(SSH_TMP_DIR, sessionId);
    fs.mkdirSync(tempDir, { recursive: true, mode: 0o700 });
    keyPath = path.join(tempDir, 'id_key');
    fs.writeFileSync(keyPath, privateKey.endsWith('\n') ? privateKey : `${privateKey}\n`, { mode: 0o600 });
    try { fs.chmodSync(keyPath, 0o600); } catch {}
    if (keyPassphrase) {
      askPassPath = path.join(tempDir, 'askpass.sh');
      fs.writeFileSync(askPassPath, `#!/bin/sh
printf '%s\n' "$LABBY_SSH_KEY_PASSPHRASE"
`, { mode: 0o700 });
      try { fs.chmodSync(askPassPath, 0o700); } catch {}
    }
  }

  const sshArgs = [
    '-tt',
    '-o', 'StrictHostKeyChecking=accept-new',
    '-o', 'ServerAliveInterval=30',
    '-o', 'NumberOfPasswordPrompts=1',
  ];
  if (keyPath) sshArgs.push('-i', keyPath, '-o', 'IdentitiesOnly=yes', '-o', 'PreferredAuthentications=publickey');
  sshArgs.push(target);

  const command = authMethod === 'password' && password ? 'sshpass' : 'ssh';
  const args = command === 'sshpass' ? ['-e', 'ssh', ...sshArgs] : sshArgs;
  const env = { ...process.env };
  if (command === 'sshpass') env.SSHPASS = password;
  if (askPassPath) {
    env.SSH_ASKPASS = askPassPath;
    env.SSH_ASKPASS_REQUIRE = 'force';
    env.DISPLAY = env.DISPLAY || ':0';
    env.LABBY_SSH_KEY_PASSPHRASE = keyPassphrase;
  }

  let proc;
  try {
    proc = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'], env });
  } catch (err) {
    if (tempDir) cleanupSessionFiles({ tempDir });
    return res.status(500).json({ error: `Unable to start ssh: ${err.message}` });
  }

  const session = { id: sessionId, proc, tempDir, output: `ssh ${target}${authMethod === 'key' ? ' [key]' : ''}
`, closed: false, createdAt: Date.now() };
  sshSessions.set(sessionId, session);

  const collect = (chunk) => {
    session.output += chunk.toString('utf8');
    if (session.output.length > 200000) session.output = session.output.slice(-100000);
  };
  proc.stdout.on('data', collect);
  proc.stderr.on('data', collect);
  proc.on('close', (code) => {
    session.closed = true;
    session.output += `
[process exited with code ${code ?? 'unknown'}]
`;
    setTimeout(() => { cleanupSessionFiles(session); sshSessions.delete(sessionId); }, 5 * 60 * 1000);
  });
  proc.on('error', (err) => {
    session.closed = true;
    cleanupSessionFiles(session);
    session.output += `
[ssh error: ${err.message}]
`;
  });

  res.json({ sessionId, output: session.output });
});

app.get('/api/ssh/:id/output', (req, res) => {
  const session = sshSessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'SSH session not found.', closed: true });
  const output = session.output;
  session.output = '';
  res.json({ output, closed: session.closed });
});

app.post('/api/ssh/:id/input', (req, res) => {
  const session = sshSessions.get(req.params.id);
  if (!session || session.closed) return res.status(404).json({ error: 'SSH session not found or closed.' });
  const input = String(req.body?.input || '');
  if (input) session.proc.stdin.write(input);
  res.json({ ok: true });
});

app.post('/api/ssh/:id/close', (req, res) => {
  const session = sshSessions.get(req.params.id);
  if (session && !session.closed) {
    try { session.proc.stdin.write('exit\n'); } catch {}
    setTimeout(() => {
      try { if (!session.proc.killed) session.proc.kill('SIGTERM'); } catch {}
    }, 600);
    session.closed = true;
  }
  cleanupSessionFiles(session);
  sshSessions.delete(req.params.id);
  res.json({ ok: true });
});


app.get('/api/data', (req, res) => {
  try {
    if (!fs.existsSync(DB_PATH)) return res.json({ items: [], locations: [], racks: [], agentKeys: [], agentStatus: {}, commandSnippets: [] });
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    // Backward-compat: if stored as a bare array, wrap it
    if (Array.isArray(parsed)) {
      return res.json({ items: parsed, locations: [], racks: [], agentKeys: [], agentStatus: {}, commandSnippets: [] });
    }
    const data = {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      locations: Array.isArray(parsed.locations) ? parsed.locations : [],
      racks: Array.isArray(parsed.racks) ? parsed.racks : [],
      agentKeys: Array.isArray(parsed.agentKeys) ? parsed.agentKeys : [],
      agentStatus: parsed.agentStatus && typeof parsed.agentStatus === 'object' ? parsed.agentStatus : {},
      commandSnippets: Array.isArray(parsed.commandSnippets) ? parsed.commandSnippets : [],
    };
    res.json(data);
  } catch {
    res.json({ items: [], locations: [], racks: [], agentKeys: [], agentStatus: {}, commandSnippets: [] });
  }
});

app.post('/api/data', (req, res) => {
  const body = req.body;
  let data;
  if (Array.isArray(body)) {
    // Legacy bare-array format: preserve locations/racks from disk if they exist
    let existing = { locations: [], racks: [], agentKeys: [], agentStatus: {}, commandSnippets: [] };
    try {
      if (fs.existsSync(DB_PATH)) {
        const raw = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        if (!Array.isArray(raw)) {
          existing.locations = raw.locations || [];
          existing.racks = raw.racks || [];
          existing.agentKeys = raw.agentKeys || [];
          existing.agentStatus = raw.agentStatus || {};
          existing.commandSnippets = Array.isArray(raw.commandSnippets) ? raw.commandSnippets : [];
        }
      }
    } catch {}
    data = { items: body, locations: existing.locations, racks: existing.racks, agentKeys: existing.agentKeys, agentStatus: existing.agentStatus, commandSnippets: existing.commandSnippets };
  } else if (body && typeof body === 'object') {
    data = {
      items: Array.isArray(body.items) ? body.items : [],
      locations: Array.isArray(body.locations) ? body.locations : [],
      racks: Array.isArray(body.racks) ? body.racks : [],
      agentKeys: Array.isArray(body.agentKeys) ? body.agentKeys : (readDb().agentKeys || []),
      agentStatus: body.agentStatus && typeof body.agentStatus === 'object' ? body.agentStatus : (readDb().agentStatus || {}),
      commandSnippets: Array.isArray(body.commandSnippets) ? body.commandSnippets : (readDb().commandSnippets || []),
    };
  } else {
    return res.status(400).json({ error: 'Body must be a JSON array or { items, locations, racks } object.' });
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(data), 'utf8');
  res.json({ ok: true, count: data.items.length });
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// Ping endpoint - checks if an IP is reachable
app.post('/api/ping', (req, res) => {
  const { ip } = req.body;
  if (!ip || typeof ip !== 'string') {
    return res.status(400).json({ error: 'IP address required' });
  }

  const { exec } = require('child_process');
  const isWindows = process.platform === 'win32';
  const pingCmd = isWindows
    ? `ping -n 1 -w 1000 ${ip}`
    : `ping -c 1 -W 1000 ${ip}`;

  exec(pingCmd, { timeout: 5000 }, (error) => {
    if (error) {
      return res.json({ status: 'offline', ip });
    }
    res.json({ status: 'online', ip });
  });
});

// URL check endpoint - checks if a URL is reachable with HTTP
app.post('/api/check-url', (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL required' });
  }

  const https = url.startsWith('https');
  const http = require(https ? 'https' : 'http');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  const request = http.request(url, { method: 'HEAD', signal: controller.signal }, (response) => {
    clearTimeout(timeoutId);
    const isSuccess = response.statusCode >= 200 && response.statusCode < 400;
    res.json({ status: isSuccess ? 'online' : 'offline', url, statusCode: response.statusCode });
  });

  request.on('error', () => {
    clearTimeout(timeoutId);
    res.json({ status: 'offline', url });
  });

  request.end();
});

app.listen(PORT, () => {
  console.log(`Labby backend running on port ${PORT}`);
});

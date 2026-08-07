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



// ── Agent API keys and automation endpoints ────────────────────────────────
const crypto = require('crypto');

function readDb() {
  try {
    if (!fs.existsSync(DB_PATH)) return { items: [], locations: [], racks: [], agentKeys: [], agentStatus: {}, commandSnippets: [], backupConfig: defaultBackupConfig(), backupLogs: [] };
    const raw = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    if (Array.isArray(raw)) return { items: raw, locations: [], racks: [], agentKeys: [], agentStatus: {}, commandSnippets: [], backupConfig: defaultBackupConfig(), backupLogs: [] };
    return {
      items: Array.isArray(raw.items) ? raw.items : [],
      locations: Array.isArray(raw.locations) ? raw.locations : [],
      racks: Array.isArray(raw.racks) ? raw.racks : [],
      agentKeys: Array.isArray(raw.agentKeys) ? raw.agentKeys : [],
      agentStatus: raw.agentStatus && typeof raw.agentStatus === 'object' ? raw.agentStatus : {},
      commandSnippets: Array.isArray(raw.commandSnippets) ? raw.commandSnippets : [],
      backupConfig: normalizeBackupConfig(raw.backupConfig),
      backupLogs: normalizeBackupLogs(raw.backupLogs),
    };
  } catch {
    return { items: [], locations: [], racks: [], agentKeys: [], agentStatus: {}, commandSnippets: [], backupConfig: defaultBackupConfig(), backupLogs: [] };
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
    commandSnippets: Array.isArray(data.commandSnippets) ? data.commandSnippets : existing.commandSnippets,
    backupConfig: normalizeBackupConfig(data.backupConfig || existing.backupConfig),
    backupLogs: normalizeBackupLogs(data.backupLogs || existing.backupLogs),
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



// ── Encrypted Labby config backups ─────────────────────────────────────────
// Local backups are written into the persistent Labby data volume. SMB backups
// use smbclient directly, so no host mount or bind mount is required.
const LOCAL_BACKUP_DIR = path.join(DATA_DIR, 'backups');
const BACKUP_KEY_PATH = path.join(DATA_DIR, 'backup.key');
const SMB_SECRET_PATH = path.join(DATA_DIR, 'backup-smb-secret.json');
const SMB_TMP_ROOT = '/tmp/labby-backups';
const { spawnSync: spawnSyncProcess, execFile: execFileProcess } = require('child_process');
let backupTimer = null;
const SMB_STATUS_CACHE_MS = 60 * 1000;
let smbStatusCache = { key: '', checkedAt: 0, value: null, backups: [] };
let smbStatusRefresh = { key: '', promise: null };

function defaultBackupConfig() {
  return {
    enabled: false,
    frequency: 'daily',
    time: '02:00',
    weekday: '1',
    target: 'local',
    maxBackups: 10,
    smbServer: '',
    smbShare: '',
    smbFolder: 'Labby',
    smbUsername: '',
    smbDomain: '',
    smbPort: 445,
    smbEncrypt: false,
    smbGuest: false,
    lastRunAt: '',
    updatedAt: '',
  };
}

function normalizeSingleLine(value, maxLength = 255) {
  return String(value || '').replace(/[\r\n\0]/g, '').trim().slice(0, maxLength);
}

function normalizeSmbFolder(value) {
  const folder = normalizeSingleLine(value, 500).replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  if (!folder) return '';
  if (/[";\r\n\0]/.test(folder)) return '';
  const segments = folder.split('/').filter(Boolean);
  if (segments.some((segment) => segment === '.' || segment === '..')) return '';
  return segments.join('/');
}

function normalizeBackupConfig(value) {
  const base = defaultBackupConfig();
  const raw = value && typeof value === 'object' ? value : {};
  const frequency = ['hourly', 'daily', 'weekly'].includes(raw.frequency) ? raw.frequency : base.frequency;
  const target = ['local', 'smb'].includes(raw.target) ? raw.target : base.target;
  const time = /^\d{2}:\d{2}$/.test(String(raw.time || '')) ? String(raw.time) : base.time;
  const weekday = /^[0-6]$/.test(String(raw.weekday || '')) ? String(raw.weekday) : base.weekday;
  const maxBackups = Math.min(100, Math.max(1, Number.parseInt(raw.maxBackups, 10) || base.maxBackups));
  const smbPort = Math.min(65535, Math.max(1, Number.parseInt(raw.smbPort, 10) || base.smbPort));
  return {
    ...base,
    enabled: raw.enabled === true,
    frequency,
    time,
    weekday,
    target,
    maxBackups,
    smbServer: normalizeSingleLine(raw.smbServer, 255).replace(/^smb:\/\//i, '').replace(/^\\\\/, '').replace(/[\\/]+$/, ''),
    smbShare: normalizeSingleLine(raw.smbShare, 255).replace(/^[/\\]+|[/\\]+$/g, ''),
    smbFolder: normalizeSmbFolder(raw.smbFolder),
    smbUsername: normalizeSingleLine(raw.smbUsername, 255),
    smbDomain: normalizeSingleLine(raw.smbDomain, 255),
    smbPort,
    smbEncrypt: raw.smbEncrypt === true,
    smbGuest: raw.smbGuest === true,
    lastRunAt: typeof raw.lastRunAt === 'string' ? raw.lastRunAt : '',
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : '',
  };
}

function normalizeBackupLogs(value) {
  return (Array.isArray(value) ? value : []).slice(-80).map((entry) => ({
    at: typeof entry?.at === 'string' ? entry.at : new Date().toISOString(),
    level: entry?.level === 'error' ? 'error' : 'info',
    message: String(entry?.message || '').slice(0, 500),
  }));
}

function addBackupLog(level, message) {
  const data = readDb();
  data.backupLogs = normalizeBackupLogs(data.backupLogs);
  data.backupLogs.push({ at: new Date().toISOString(), level: level === 'error' ? 'error' : 'info', message: String(message || '') });
  data.backupLogs = data.backupLogs.slice(-80);
  writeDb(data);
}

function ensureBackupKey() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(BACKUP_KEY_PATH)) return fs.readFileSync(BACKUP_KEY_PATH);
  const key = crypto.randomBytes(32);
  fs.writeFileSync(BACKUP_KEY_PATH, key.toString('base64'), { mode: 0o600 });
  try { fs.chmodSync(BACKUP_KEY_PATH, 0o600); } catch {}
  return key;
}

function getBackupKeyBuffer() {
  const raw = ensureBackupKey();
  if (Buffer.isBuffer(raw) && raw.length === 32) return raw;
  const str = Buffer.isBuffer(raw) ? raw.toString('utf8').trim() : String(raw || '').trim();
  const decoded = Buffer.from(str, 'base64');
  return decoded.length === 32 ? decoded : crypto.createHash('sha256').update(str).digest();
}

function encryptProtectedValue(payload, kind) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getBackupKeyBuffer(), iv);
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return {
    app: 'Labby',
    kind,
    algorithm: 'AES-256-GCM',
    createdAt: new Date().toISOString(),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    ciphertext: encrypted.toString('base64'),
  };
}

function decryptProtectedValue(payload) {
  if (!payload || payload.algorithm !== 'AES-256-GCM') throw new Error('Unsupported encrypted data format.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getBackupKeyBuffer(), Buffer.from(payload.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(payload.ciphertext, 'base64')), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
}

function getStoredSmbPassword() {
  try {
    if (!fs.existsSync(SMB_SECRET_PATH)) return '';
    const protectedValue = JSON.parse(fs.readFileSync(SMB_SECRET_PATH, 'utf8'));
    const secret = decryptProtectedValue(protectedValue);
    return typeof secret?.password === 'string' ? secret.password : '';
  } catch {
    return '';
  }
}

function saveSmbPassword(password) {
  const value = String(password ?? '');
  if (!value) return;
  if (/[\r\n\0]/.test(value)) throw new Error('The SMB password cannot contain line breaks.');
  fs.writeFileSync(SMB_SECRET_PATH, JSON.stringify(encryptProtectedValue({ password: value }, 'smb-credentials'), null, 2), { mode: 0o600 });
  try { fs.chmodSync(SMB_SECRET_PATH, 0o600); } catch {}
}

function clearSmbPassword() {
  try { fs.unlinkSync(SMB_SECRET_PATH); } catch {}
}

function smbPasswordConfigured(cfg, passwordOverride) {
  return cfg.smbGuest || Boolean(typeof passwordOverride === 'string' ? passwordOverride : getStoredSmbPassword());
}

function validateSmbConfig(cfg, passwordOverride) {
  if (!cfg.smbServer || !/^[a-zA-Z0-9_.:\-]+$/.test(cfg.smbServer)) throw new Error('Enter a valid SMB server name or IP address.');
  if (!cfg.smbShare || /[\\/\r\n\0]/.test(cfg.smbShare)) throw new Error('Enter a valid SMB share name.');
  if (!cfg.smbGuest && !cfg.smbUsername) throw new Error('Enter an SMB username or enable guest access.');
  if (!smbPasswordConfigured(cfg, passwordOverride)) throw new Error('Enter and save the SMB password first.');
  return cfg;
}

function smbTargetPath(cfg) {
  if (!cfg.smbServer || !cfg.smbShare) return 'Not configured';
  const folder = cfg.smbFolder ? `/${cfg.smbFolder}` : '';
  return `smb://${cfg.smbServer}:${cfg.smbPort}/${cfg.smbShare}${folder}`;
}

function smbCommandPath(value) {
  const clean = String(value || '').replace(/\\/g, '/');
  if (!clean || /[";\r\n\0]/.test(clean)) throw new Error('The SMB folder contains unsupported characters.');
  return `"${clean}"`;
}

function withSmbAuthFile(cfg, passwordOverride, callback) {
  if (cfg.smbGuest) return callback(null);
  const password = typeof passwordOverride === 'string' && passwordOverride !== '' ? passwordOverride : getStoredSmbPassword();
  if (!password) throw new Error('No SMB password is saved.');
  if (/[\r\n\0]/.test(password)) throw new Error('The SMB password cannot contain line breaks.');
  fs.mkdirSync(SMB_TMP_ROOT, { recursive: true, mode: 0o700 });
  const tempDir = fs.mkdtempSync(path.join(SMB_TMP_ROOT, 'auth-'));
  const authFile = path.join(tempDir, 'credentials');
  const lines = [
    `username = ${cfg.smbUsername}`,
    `password = ${password}`,
    ...(cfg.smbDomain ? [`domain = ${cfg.smbDomain}`] : []),
  ];
  fs.writeFileSync(authFile, `${lines.join('\n')}\n`, { mode: 0o600 });
  try { return callback(authFile); }
  finally { try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {} }
}

function runSmbClient(cfgInput, command, options = {}) {
  const cfg = validateSmbConfig(normalizeBackupConfig(cfgInput), options.password);
  return withSmbAuthFile(cfg, options.password, (authFile) => {
    const args = [`//${cfg.smbServer}/${cfg.smbShare}`, '-m', 'SMB3', '-p', String(cfg.smbPort)];
    if (cfg.smbEncrypt) args.push('-e');
    if (cfg.smbGuest) args.push('-N');
    else args.push('-A', authFile);
    args.push('-c', command);
    const result = spawnSyncProcess('smbclient', args, {
      encoding: 'utf8',
      timeout: options.timeout || 30000,
      env: { ...process.env, LC_ALL: 'C', LANG: 'C' },
      maxBuffer: 4 * 1024 * 1024,
    });
    const output = `${result.stdout || ''}\n${result.stderr || ''}`.trim();
    if (result.error) {
      if (result.error.code === 'ENOENT') throw new Error('smbclient is not installed in the Labby container. Rebuild the current Docker image.');
      throw new Error(result.error.message);
    }
    if (result.status !== 0 && !options.allowFailure) {
      const useful = output.split('\n').map((line) => line.trim()).filter(Boolean).slice(-4).join(' ');
      throw new Error(useful || `SMB command failed with exit code ${result.status}.`);
    }
    return { ok: result.status === 0, status: result.status, stdout: result.stdout || '', stderr: result.stderr || '', output };
  });
}

function runSmbClientAsync(cfgInput, command, options = {}) {
  const cfg = validateSmbConfig(normalizeBackupConfig(cfgInput), options.password);
  let tempDir = '';
  let authFile = null;

  if (!cfg.smbGuest) {
    const password = typeof options.password === 'string' && options.password !== '' ? options.password : getStoredSmbPassword();
    if (!password) return Promise.reject(new Error('No SMB password is saved.'));
    if (/[\r\n\0]/.test(password)) return Promise.reject(new Error('The SMB password cannot contain line breaks.'));
    fs.mkdirSync(SMB_TMP_ROOT, { recursive: true, mode: 0o700 });
    tempDir = fs.mkdtempSync(path.join(SMB_TMP_ROOT, 'auth-'));
    authFile = path.join(tempDir, 'credentials');
    const lines = [
      `username = ${cfg.smbUsername}`,
      `password = ${password}`,
      ...(cfg.smbDomain ? [`domain = ${cfg.smbDomain}`] : []),
    ];
    fs.writeFileSync(authFile, `${lines.join('\n')}\n`, { mode: 0o600 });
  }

  const args = [`//${cfg.smbServer}/${cfg.smbShare}`, '-m', 'SMB3', '-p', String(cfg.smbPort)];
  if (cfg.smbEncrypt) args.push('-e');
  if (cfg.smbGuest) args.push('-N');
  else args.push('-A', authFile);
  args.push('-c', command);

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      if (!tempDir) return;
      try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
      tempDir = '';
    };

    execFileProcess('smbclient', args, {
      encoding: 'utf8',
      timeout: options.timeout || 30000,
      env: { ...process.env, LC_ALL: 'C', LANG: 'C' },
      maxBuffer: 4 * 1024 * 1024,
    }, (error, stdout = '', stderr = '') => {
      cleanup();
      const output = `${stdout || ''}\n${stderr || ''}`.trim();
      if (error) {
        if (error.code === 'ENOENT') return reject(new Error('smbclient is not installed in the Labby container. Rebuild the current Docker image.'));
        if (options.allowFailure && Number.isInteger(error.code)) {
          return resolve({ ok: false, status: error.code, stdout, stderr, output });
        }
        const useful = output.split('\n').map((line) => line.trim()).filter(Boolean).slice(-4).join(' ');
        if (error.killed) return reject(new Error('SMB request timed out.'));
        return reject(new Error(useful || error.message || 'SMB command failed.'));
      }
      resolve({ ok: true, status: 0, stdout, stderr, output });
    });
  });
}

function ensureSmbFolder(cfgInput, passwordOverride) {
  const cfg = normalizeBackupConfig(cfgInput);
  if (!cfg.smbFolder) return;
  let current = '';
  for (const segment of cfg.smbFolder.split('/').filter(Boolean)) {
    current = current ? `${current}/${segment}` : segment;
    const result = runSmbClient(cfg, `mkdir ${smbCommandPath(current)}`, { password: passwordOverride, allowFailure: true });
    if (!result.ok && !/NT_STATUS_OBJECT_NAME_COLLISION|NT_STATUS_OBJECT_NAME_EXISTS/i.test(result.output)) {
      throw new Error(result.output || `Could not create SMB folder ${current}.`);
    }
  }
}

function remoteBackupPath(cfg, fileName) {
  const safeName = path.basename(String(fileName || ''));
  if (!safeName.endsWith('.labbybackup')) throw new Error('Invalid backup file name.');
  return cfg.smbFolder ? `${cfg.smbFolder}/${safeName}` : safeName;
}

function withBackupTempDir(callback) {
  fs.mkdirSync(SMB_TMP_ROOT, { recursive: true, mode: 0o700 });
  const tempDir = fs.mkdtempSync(path.join(SMB_TMP_ROOT, 'file-'));
  try { return callback(tempDir); }
  finally { try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {} }
}

function parseSmbBackupList(output, cfg) {
  const backups = [];
  String(output || '').split(/\r?\n/).forEach((line) => {
    const match = line.match(/^\s*(\S+\.labbybackup)\s+\S*\s+(\d+)\s+(.+?)\s*$/i);
    if (!match) return;
    const parsedDate = Date.parse(match[3]);
    backups.push({
      id: match[1],
      name: match[1],
      target: 'smb',
      path: smbTargetPath(cfg),
      size: Number.parseInt(match[2], 10) || 0,
      createdAt: Number.isFinite(parsedDate) ? new Date(parsedDate).toISOString() : '',
    });
  });
  return backups.sort((a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0));
}

function listLocalBackups() {
  try {
    fs.mkdirSync(LOCAL_BACKUP_DIR, { recursive: true });
    return fs.readdirSync(LOCAL_BACKUP_DIR)
      .filter((name) => name.endsWith('.labbybackup'))
      .map((name) => {
        const full = path.join(LOCAL_BACKUP_DIR, name);
        const stat = fs.statSync(full);
        return { id: name, name, target: 'local', path: LOCAL_BACKUP_DIR, size: stat.size, createdAt: stat.mtime.toISOString() };
      })
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  } catch {
    return [];
  }
}

function listSmbBackups(cfgInput, passwordOverride) {
  const cfg = normalizeBackupConfig(cfgInput);
  const commands = cfg.smbFolder ? `cd ${smbCommandPath(cfg.smbFolder)}; ls` : 'ls';
  const result = runSmbClient(cfg, commands, { password: passwordOverride });
  return parseSmbBackupList(result.stdout, cfg);
}

function listBackupsForTarget(target, cfgInput, passwordOverride) {
  return target === 'smb' ? listSmbBackups(cfgInput, passwordOverride) : listLocalBackups();
}

function encryptBackupPayload(payload) {
  return encryptProtectedValue(payload, 'encrypted-config-backup');
}

function decryptBackupPayload(payload) {
  return decryptProtectedValue(payload);
}

function writeBackupFile(target, cfg, fileName, content) {
  if (target === 'local') {
    fs.mkdirSync(LOCAL_BACKUP_DIR, { recursive: true });
    fs.writeFileSync(path.join(LOCAL_BACKUP_DIR, fileName), content, { mode: 0o600 });
    return LOCAL_BACKUP_DIR;
  }
  ensureSmbFolder(cfg);
  return withBackupTempDir((tempDir) => {
    const localFile = path.join(tempDir, fileName);
    fs.writeFileSync(localFile, content, { mode: 0o600 });
    const remoteFile = remoteBackupPath(cfg, fileName);
    runSmbClient(cfg, `put ${smbCommandPath(localFile)} ${smbCommandPath(remoteFile)}`);
    return smbTargetPath(cfg);
  });
}

function readBackupFile(target, cfg, fileName) {
  const safeName = path.basename(String(fileName || ''));
  if (!safeName.endsWith('.labbybackup')) throw new Error('Invalid backup id.');
  if (target === 'local') {
    const full = path.join(LOCAL_BACKUP_DIR, safeName);
    if (!fs.existsSync(full)) throw new Error('Backup not found.');
    return fs.readFileSync(full, 'utf8');
  }
  return withBackupTempDir((tempDir) => {
    const localFile = path.join(tempDir, safeName);
    runSmbClient(cfg, `get ${smbCommandPath(remoteBackupPath(cfg, safeName))} ${smbCommandPath(localFile)}`);
    if (!fs.existsSync(localFile)) throw new Error('Backup could not be downloaded from SMB.');
    return fs.readFileSync(localFile, 'utf8');
  });
}

function deleteBackupFile(target, cfg, fileName) {
  const safeName = path.basename(String(fileName || ''));
  if (!safeName.endsWith('.labbybackup')) throw new Error('Invalid backup id.');
  if (target === 'local') {
    const full = path.join(LOCAL_BACKUP_DIR, safeName);
    if (!fs.existsSync(full)) throw new Error('Backup not found.');
    fs.unlinkSync(full);
    return;
  }
  runSmbClient(cfg, `del ${smbCommandPath(remoteBackupPath(cfg, safeName))}`);
}

function pruneBackups(target, cfg, maxBackups) {
  const backups = listBackupsForTarget(target, cfg);
  backups.slice(maxBackups).forEach((backup) => {
    try { deleteBackupFile(target, cfg, backup.name); } catch {}
  });
}

function backupFileName(date = new Date()) {
  return `labby-config-backup-${date.toISOString().replace(/[:.]/g, '-')}.labbybackup`;
}

function createEncryptedBackup(reason = 'manual') {
  const data = readDb();
  const cfg = normalizeBackupConfig(data.backupConfig);
  const target = cfg.target;
  if (target === 'smb') validateSmbConfig(cfg);
  const now = new Date();
  const encrypted = encryptBackupPayload({ ...data, backupMeta: { createdAt: now.toISOString(), reason } });
  const file = backupFileName(now);
  const destination = writeBackupFile(target, cfg, file, JSON.stringify(encrypted, null, 2));
  pruneBackups(target, cfg, cfg.maxBackups);
  cfg.lastRunAt = now.toISOString();
  data.backupConfig = cfg;
  data.backupLogs = normalizeBackupLogs(data.backupLogs);
  data.backupLogs.push({ at: now.toISOString(), level: 'info', message: `Backup saved to ${destination}: ${file}` });
  data.backupLogs = data.backupLogs.slice(-80);
  writeDb(data);
  smbStatusCache.checkedAt = 0;
  return { file, target, destination, createdAt: now.toISOString() };
}

function isBackupDue(cfg, now = new Date()) {
  if (!cfg.enabled) return false;
  const last = cfg.lastRunAt ? new Date(cfg.lastRunAt) : null;
  const [hh, mm] = String(cfg.time || '02:00').split(':').map((v) => Number.parseInt(v, 10));
  const sameMinute = now.getMinutes() === (Number.isFinite(mm) ? mm : 0);
  if (!sameMinute) return false;
  if (cfg.frequency === 'hourly') return !last || now.getTime() - last.getTime() >= 55 * 60 * 1000;
  if (now.getHours() !== (Number.isFinite(hh) ? hh : 2)) return false;
  if (cfg.frequency === 'daily') return !last || last.toDateString() !== now.toDateString();
  if (cfg.frequency === 'weekly') {
    const wanted = Number.parseInt(cfg.weekday, 10);
    return now.getDay() === wanted && (!last || now.getTime() - last.getTime() >= 6 * 24 * 60 * 60 * 1000);
  }
  return false;
}

function startBackupScheduler() {
  if (backupTimer) clearInterval(backupTimer);
  backupTimer = setInterval(() => {
    try {
      const cfg = normalizeBackupConfig(readDb().backupConfig);
      if (isBackupDue(cfg)) createEncryptedBackup('scheduled');
    } catch (err) {
      addBackupLog('error', `Scheduled backup failed: ${err.message}`);
    }
  }, 60 * 1000);
}

function testSmbConnection(cfgInput, passwordOverride) {
  const cfg = validateSmbConfig(normalizeBackupConfig(cfgInput), passwordOverride);
  ensureSmbFolder(cfg, passwordOverride);
  return withBackupTempDir((tempDir) => {
    const testName = `.labby-smb-test-${crypto.randomBytes(5).toString('hex')}.tmp`;
    const localFile = path.join(tempDir, testName);
    fs.writeFileSync(localFile, `Labby SMB connection test ${new Date().toISOString()}\n`, { mode: 0o600 });
    const remoteFile = cfg.smbFolder ? `${cfg.smbFolder}/${testName}` : testName;
    runSmbClient(cfg, `put ${smbCommandPath(localFile)} ${smbCommandPath(remoteFile)}`, { password: passwordOverride });
    try { runSmbClient(cfg, `del ${smbCommandPath(remoteFile)}`, { password: passwordOverride }); } catch {}
    return { ok: true, path: smbTargetPath(cfg) };
  });
}

function smbStatusKey(cfg, passwordConfigured = smbPasswordConfigured(cfg)) {
  return JSON.stringify({
    server: cfg.smbServer, share: cfg.smbShare, folder: cfg.smbFolder, username: cfg.smbUsername,
    domain: cfg.smbDomain, port: cfg.smbPort, encrypt: cfg.smbEncrypt, guest: cfg.smbGuest, passwordConfigured,
  });
}

function baseSmbStatus(cfgInput) {
  const cfg = normalizeBackupConfig(cfgInput);
  const passwordConfigured = smbPasswordConfigured(cfg);
  const configured = Boolean(cfg.smbServer && cfg.smbShare && (cfg.smbGuest || cfg.smbUsername) && passwordConfigured);
  return {
    cfg,
    key: smbStatusKey(cfg, passwordConfigured),
    value: {
      configured,
      available: false,
      passwordConfigured,
      path: smbTargetPath(cfg),
      error: configured ? '' : 'SMB destination is not fully configured.',
    },
  };
}

function cachedSmbStatus(cfgInput) {
  const base = baseSmbStatus(cfgInput);
  if (!base.value.configured) return { ...base.value, checking: false, checkedAt: '' };
  const sameCache = smbStatusCache.key === base.key && smbStatusCache.value;
  if (!sameCache) return { ...base.value, checking: true, checkedAt: '' };
  const fresh = Date.now() - smbStatusCache.checkedAt < SMB_STATUS_CACHE_MS;
  return {
    ...smbStatusCache.value,
    checking: !fresh,
    checkedAt: smbStatusCache.checkedAt ? new Date(smbStatusCache.checkedAt).toISOString() : '',
  };
}

function cachedSmbBackups(cfgInput) {
  const base = baseSmbStatus(cfgInput);
  return smbStatusCache.key === base.key && Array.isArray(smbStatusCache.backups) ? smbStatusCache.backups : [];
}

async function refreshSmbStatusCache(cfgInput) {
  const base = baseSmbStatus(cfgInput);
  if (!base.value.configured) {
    smbStatusCache = { key: base.key, checkedAt: Date.now(), value: base.value, backups: [] };
    return smbStatusCache;
  }

  let value;
  let backups = [];
  try {
    const commands = base.cfg.smbFolder ? `cd ${smbCommandPath(base.cfg.smbFolder)}; ls` : 'ls';
    const result = await runSmbClientAsync(base.cfg, commands, { timeout: 12000 });
    backups = parseSmbBackupList(result.stdout, base.cfg);
    value = { ...base.value, available: true, error: '' };
  } catch (err) {
    value = { ...base.value, available: false, error: err.message };
  }

  smbStatusCache = { key: base.key, checkedAt: Date.now(), value, backups };
  return smbStatusCache;
}

function queueSmbStatusRefresh(cfgInput) {
  const base = baseSmbStatus(cfgInput);
  if (!base.value.configured) return Promise.resolve(refreshSmbStatusCache(base.cfg));
  if (smbStatusRefresh.key === base.key && smbStatusRefresh.promise) return smbStatusRefresh.promise;
  const promise = refreshSmbStatusCache(base.cfg).finally(() => {
    if (smbStatusRefresh.promise === promise) smbStatusRefresh = { key: '', promise: null };
  });
  smbStatusRefresh = { key: base.key, promise };
  return promise;
}

function safeBackupConfigForClient(cfgInput) {
  const cfg = normalizeBackupConfig(cfgInput);
  return { ...cfg, smbPasswordConfigured: smbPasswordConfigured(cfg) };
}

app.get('/api/backups/status', async (req, res) => {
  const data = readDb();
  const cfg = normalizeBackupConfig(data.backupConfig);
  const forceRefresh = req.query.refresh === '1';

  if (forceRefresh) {
    try { await queueSmbStatusRefresh(cfg); } catch {}
  } else {
    const snapshot = cachedSmbStatus(cfg);
    if (snapshot.configured && snapshot.checking) queueSmbStatusRefresh(cfg).catch(() => {});
  }

  const smb = cachedSmbStatus(cfg);
  let backups = [];
  try {
    backups = cfg.target === 'smb' ? cachedSmbBackups(cfg) : listLocalBackups();
  } catch {}

  res.json({
    config: safeBackupConfigForClient(cfg),
    targets: {
      local: { available: true, configured: true, path: LOCAL_BACKUP_DIR, label: `Local (${LOCAL_BACKUP_DIR})` },
      smb: { ...smb, label: `Direct SMB (${smb.path})` },
    },
    logs: normalizeBackupLogs(data.backupLogs).slice(-20).reverse(),
    backups: backups.slice(0, 30),
  });
});

app.post('/api/backups/settings', (req, res) => {
  try {
    const data = readDb();
    const previous = normalizeBackupConfig(data.backupConfig);
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    if (body.clearSmbPassword === true) clearSmbPassword();
    else if (typeof body.smbPassword === 'string' && body.smbPassword !== '') saveSmbPassword(body.smbPassword);
    const cfg = normalizeBackupConfig(body);
    cfg.updatedAt = new Date().toISOString();
    cfg.lastRunAt = previous.lastRunAt;
    data.backupConfig = cfg;
    data.backupLogs = normalizeBackupLogs(data.backupLogs);
    data.backupLogs.push({ at: cfg.updatedAt, level: 'info', message: `Backup settings updated (${cfg.enabled ? cfg.frequency : 'disabled'}, target: ${cfg.target}).` });
    data.backupLogs = data.backupLogs.slice(-80);
    writeDb(data);
    smbStatusCache.checkedAt = 0;
    res.json({ ok: true, config: safeBackupConfigForClient(cfg) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/backups/test-smb', (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const cfg = normalizeBackupConfig(body);
    const password = typeof body.smbPassword === 'string' && body.smbPassword !== '' ? body.smbPassword : undefined;
    const result = testSmbConnection(cfg, password);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/backups/run', (req, res) => {
  try { res.json({ ok: true, backup: createEncryptedBackup('manual') }); }
  catch (err) { addBackupLog('error', `Manual backup failed: ${err.message}`); res.status(500).json({ error: err.message }); }
});

app.get('/api/backups/list', (req, res) => {
  try {
    const cfg = normalizeBackupConfig(readDb().backupConfig);
    const target = req.query.target === 'smb' ? 'smb' : 'local';
    res.json({ backups: listBackupsForTarget(target, cfg).slice(0, 50) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/backups/restore', (req, res) => {
  try {
    const current = readDb();
    const cfg = normalizeBackupConfig(current.backupConfig);
    const target = req.body?.target === 'smb' ? 'smb' : 'local';
    const id = path.basename(String(req.body?.id || ''));
    if (!id.endsWith('.labbybackup')) return res.status(400).json({ error: 'Invalid backup id.' });
    const encrypted = JSON.parse(readBackupFile(target, cfg, id));
    const restored = decryptBackupPayload(encrypted);
    restored.backupConfig = current.backupConfig;
    restored.backupLogs = normalizeBackupLogs(current.backupLogs);
    restored.backupLogs.push({ at: new Date().toISOString(), level: 'info', message: `Config restored from ${target}: ${id}.` });
    writeDb(restored);
    res.json({ ok: true });
  } catch (err) {
    addBackupLog('error', `Restore failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/backups/:target/:id', (req, res) => {
  try {
    const cfg = normalizeBackupConfig(readDb().backupConfig);
    const target = req.params.target === 'smb' ? 'smb' : 'local';
    const id = path.basename(String(req.params.id || ''));
    if (!id.endsWith('.labbybackup')) return res.status(400).json({ error: 'Invalid backup id.' });
    deleteBackupFile(target, cfg, id);
    addBackupLog('info', `Backup deleted from ${target}: ${id}`);
    res.json({ ok: true });
  } catch (err) {
    addBackupLog('error', `Delete backup failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});


// ── Browser SSH bridge ─────────────────────────────────────────────────────
// Starts the system SSH client and streams stdout/stderr through small polling
// endpoints. When Labby credentials include a password, sshpass is used through
// the SSHPASS environment variable so the password is not written into the
// command line or terminal output.
const { spawn, execFile } = require('child_process');
const sshSessions = new Map();
const SSH_TMP_DIR = '/tmp/labby-ssh';

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\''`)}'`;
}


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
    '-o', 'RequestTTY=force',
    '-o', 'SendEnv=TERM',
  ];
  if (keyPath) sshArgs.push('-i', keyPath, '-o', 'IdentitiesOnly=yes', '-o', 'PreferredAuthentications=publickey');
  sshArgs.push(target);

  const command = authMethod === 'password' && password ? 'sshpass' : 'ssh';
  const args = command === 'sshpass' ? ['-e', 'ssh', ...sshArgs] : sshArgs;
  const env = { ...process.env };
  env.TERM = 'xterm-256color';
  env.COLORTERM = env.COLORTERM || 'truecolor';
  env.COLUMNS = env.COLUMNS || '160';
  env.LINES = env.LINES || '34';
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

  const session = { id: sessionId, proc, tempDir, output: '', closed: false, createdAt: Date.now(), term: env.TERM, complete: { command, args, env, target } };
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

  const initialOutput = session.output;
  session.output = '';
  res.json({ sessionId, output: initialOutput });
});

app.get('/api/ssh/:id/output', (req, res) => {
  const session = sshSessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'SSH session not found.', closed: true });
  const output = session.output;
  session.output = '';
  res.json({ output, closed: session.closed });
});


app.post('/api/ssh/:id/complete', (req, res) => {
  const session = sshSessions.get(req.params.id);
  if (!session || session.closed || !session.complete) return res.status(404).json({ error: 'SSH session not found or closed.' });
  const token = String(req.body?.token || '').slice(0, 300);
  const line = String(req.body?.line || '').slice(0, 1000);
  const beforeToken = line.slice(0, Math.max(0, line.length - token.length));
  const mode = beforeToken.trim() ? 'file' : 'command';
  const quotedToken = shellQuote(token);
  const remoteScript = mode === 'command'
    ? `bash -lc ${shellQuote(`compgen -c -- ${quotedToken} | sort -u | head -80`)}`
    : `bash -lc ${shellQuote(`compgen -f -- ${quotedToken} | sort -u | head -80`)}`;
  const args = [...session.complete.args, remoteScript];
  const child = spawn(session.complete.command, args, { stdio: ['ignore', 'pipe', 'pipe'], env: session.complete.env });
  let stdout = '';
  let stderr = '';
  const timer = setTimeout(() => { try { child.kill('SIGTERM'); } catch {} }, 3000);
  child.stdout.on('data', (chunk) => { stdout += chunk.toString('utf8'); if (stdout.length > 10000) stdout = stdout.slice(-10000); });
  child.stderr.on('data', (chunk) => { stderr += chunk.toString('utf8'); if (stderr.length > 2000) stderr = stderr.slice(-2000); });
  child.on('close', () => {
    clearTimeout(timer);
    const matches = stdout.split(/\r?\n/).map((v) => v.trim()).filter(Boolean).slice(0, 80);
    res.json({ matches, mode });
  });
  child.on('error', (err) => {
    clearTimeout(timer);
    res.status(500).json({ error: err.message || 'Completion failed.' });
  });
});


app.get('/api/ssh/:id/history', (req, res) => {
  const session = sshSessions.get(req.params.id);
  if (!session || session.closed || !session.complete) return res.status(404).json({ error: 'SSH session not found or closed.' });
  // Keep this remote command deliberately simple: OpenSSH executes it
  // through the target user's login shell, and nested quoting easily breaks on
  // minimal systems. Read common shell history files directly instead.
  const remoteScript = 'test -r ~/.bash_history && tail -n 250 ~/.bash_history; test -r ~/.zsh_history && tail -n 250 ~/.zsh_history';
  const args = [...session.complete.args, remoteScript];
  const child = spawn(session.complete.command, args, { stdio: ['ignore', 'pipe', 'pipe'], env: session.complete.env });
  let stdout = '';
  let stderr = '';
  const timer = setTimeout(() => { try { child.kill('SIGTERM'); } catch {} }, 4000);
  child.stdout.on('data', (chunk) => { stdout += chunk.toString('utf8'); if (stdout.length > 30000) stdout = stdout.slice(-30000); });
  child.stderr.on('data', (chunk) => { stderr += chunk.toString('utf8'); if (stderr.length > 3000) stderr = stderr.slice(-3000); });
  child.on('close', () => {
    clearTimeout(timer);
    const history = stdout
      .split(/\r?\n/)
      .map((v) => v.replace(/^: \d+:\d+;/, '').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '').trim())
      .filter((v) => v && !/^\d+\s+/.test(v))
      .slice(-200);
    res.json({ history });
  });
  child.on('error', (err) => {
    clearTimeout(timer);
    res.status(500).json({ error: err.message || 'Could not read remote history.' });
  });
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
    if (!fs.existsSync(DB_PATH)) return res.json({ items: [], locations: [], racks: [], agentKeys: [], agentStatus: {}, commandSnippets: [], backupConfig: defaultBackupConfig(), backupLogs: [] });
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    // Backward-compat: if stored as a bare array, wrap it
    if (Array.isArray(parsed)) {
      return res.json({ items: parsed, locations: [], racks: [], agentKeys: [], agentStatus: {}, commandSnippets: [], backupConfig: defaultBackupConfig(), backupLogs: [] });
    }
    const data = {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      locations: Array.isArray(parsed.locations) ? parsed.locations : [],
      racks: Array.isArray(parsed.racks) ? parsed.racks : [],
      agentKeys: Array.isArray(parsed.agentKeys) ? parsed.agentKeys : [],
      agentStatus: parsed.agentStatus && typeof parsed.agentStatus === 'object' ? parsed.agentStatus : {},
      commandSnippets: Array.isArray(parsed.commandSnippets) ? parsed.commandSnippets : [],
      backupConfig: normalizeBackupConfig(parsed.backupConfig),
      backupLogs: normalizeBackupLogs(parsed.backupLogs),
    };
    res.json(data);
  } catch {
    res.json({ items: [], locations: [], racks: [], agentKeys: [], agentStatus: {}, commandSnippets: [], backupConfig: defaultBackupConfig(), backupLogs: [] });
  }
});

app.post('/api/data', (req, res) => {
  const body = req.body;
  let data;
  if (Array.isArray(body)) {
    // Legacy bare-array format: preserve locations/racks from disk if they exist
    let existing = { locations: [], racks: [], agentKeys: [], agentStatus: {}, commandSnippets: [], backupConfig: defaultBackupConfig(), backupLogs: [] };
    try {
      if (fs.existsSync(DB_PATH)) {
        const raw = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        if (!Array.isArray(raw)) {
          existing.locations = raw.locations || [];
          existing.racks = raw.racks || [];
          existing.agentKeys = raw.agentKeys || [];
          existing.agentStatus = raw.agentStatus || {};
          existing.commandSnippets = Array.isArray(raw.commandSnippets) ? raw.commandSnippets : [];
          existing.backupConfig = normalizeBackupConfig(raw.backupConfig);
          existing.backupLogs = normalizeBackupLogs(raw.backupLogs);
        }
      }
    } catch {}
    data = { items: body, locations: existing.locations, racks: existing.racks, agentKeys: existing.agentKeys, agentStatus: existing.agentStatus, commandSnippets: existing.commandSnippets, backupConfig: existing.backupConfig, backupLogs: existing.backupLogs };
  } else if (body && typeof body === 'object') {
    data = {
      items: Array.isArray(body.items) ? body.items : [],
      locations: Array.isArray(body.locations) ? body.locations : [],
      racks: Array.isArray(body.racks) ? body.racks : [],
      agentKeys: Array.isArray(body.agentKeys) ? body.agentKeys : (readDb().agentKeys || []),
      agentStatus: body.agentStatus && typeof body.agentStatus === 'object' ? body.agentStatus : (readDb().agentStatus || {}),
      commandSnippets: Array.isArray(body.commandSnippets) ? body.commandSnippets : (readDb().commandSnippets || []),
      backupConfig: normalizeBackupConfig(body.backupConfig || readDb().backupConfig),
      backupLogs: normalizeBackupLogs(body.backupLogs || readDb().backupLogs),
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

startBackupScheduler();
app.listen(PORT, () => {
  console.log(`Labby backend running on port ${PORT}`);
});

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/api/data', (req, res) => {
  try {
    if (!fs.existsSync(DB_PATH)) return res.json({ items: [], locations: [], racks: [] });
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    // Backward-compat: if stored as a bare array, wrap it
    if (Array.isArray(parsed)) {
      return res.json({ items: parsed, locations: [], racks: [] });
    }
    const data = {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      locations: Array.isArray(parsed.locations) ? parsed.locations : [],
      racks: Array.isArray(parsed.racks) ? parsed.racks : [],
    };
    res.json(data);
  } catch {
    res.json({ items: [], locations: [], racks: [] });
  }
});

app.post('/api/data', (req, res) => {
  const body = req.body;
  let data;
  if (Array.isArray(body)) {
    // Legacy bare-array format: preserve locations/racks from disk if they exist
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
      items: Array.isArray(body.items) ? body.items : [],
      locations: Array.isArray(body.locations) ? body.locations : [],
      racks: Array.isArray(body.racks) ? body.racks : [],
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

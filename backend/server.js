const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;
const DATA_DIR = process.env.DATA_DIR || '/data';
const DB_PATH = path.join(DATA_DIR, 'labby.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS store (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
`);

app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/api/data', (req, res) => {
  const row = db.prepare('SELECT value FROM store WHERE key = ?').get('items');
  if (!row) return res.json([]);
  try {
    res.json(JSON.parse(row.value));
  } catch {
    res.json([]);
  }
});

app.post('/api/data', (req, res) => {
  const items = req.body;
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Body must be a JSON array.' });
  }
  db.prepare(
    'INSERT INTO store (key, value, updated_at) VALUES (?, ?, unixepoch()) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = unixepoch()'
  ).run('items', JSON.stringify(items));
  res.json({ ok: true, count: items.length });
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, db: DB_PATH });
});

app.listen(PORT, () => {
  console.log(`Labby backend running on port ${PORT}`);
  console.log(`Database: ${DB_PATH}`);
});

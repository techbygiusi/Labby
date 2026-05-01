const express = require('express');
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const app = express();
const PORT = 3001;
const DATA_DIR = process.env.DATA_DIR || '/data';
const DB_PATH = path.join(DATA_DIR, 'labby.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let db;

async function initDB() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }
  db.run(`
    CREATE TABLE IF NOT EXISTS store (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  saveDB();
}

function saveDB() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
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
  const result = db.exec("SELECT value FROM store WHERE key = 'items'");
  if (!result.length || !result[0].values.length) return res.json([]);
  try {
    res.json(JSON.parse(result[0].values[0][0]));
  } catch {
    res.json([]);
  }
});

app.post('/api/data', (req, res) => {
  const items = req.body;
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Body must be a JSON array.' });
  }
  db.run(
    "INSERT INTO store (key, value) VALUES ('items', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [JSON.stringify(items)]
  );
  saveDB();
  res.json({ ok: true, count: items.length });
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Labby backend running on port ${PORT}`);
  });
});

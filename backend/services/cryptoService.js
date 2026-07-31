const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PREFIX = 'enc:v1:';

/**
 * Encryption key resolution:
 * 1. ENCRYPTION_KEY env (hex, 64 chars = 32 bytes) - recommended for production
 * 2. Auto-generated key persisted at data/.encryption-key (chmod 600)
 */
function resolveKey() {
  const envKey = String(process.env.ENCRYPTION_KEY || '').trim();
  if (envKey) {
    if (/^[0-9a-fA-F]{64}$/.test(envKey)) return Buffer.from(envKey, 'hex');
    // Any other string: derive a stable 32-byte key
    return crypto.createHash('sha256').update(envKey).digest();
  }

  const dataDir = path.dirname(process.env.DB_PATH || path.join(__dirname, '../data/hosting.db'));
  const keyFile = path.join(dataDir, '.encryption-key');

  try {
    if (fs.existsSync(keyFile)) {
      const stored = fs.readFileSync(keyFile, 'utf8').trim();
      if (/^[0-9a-fA-F]{64}$/.test(stored)) return Buffer.from(stored, 'hex');
    }
  } catch (err) {
    console.error('Could not read encryption key file:', err.message);
  }

  const generated = crypto.randomBytes(32);
  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(keyFile, generated.toString('hex'), { mode: 0o600 });
    console.log('✓ Generated new encryption key at', keyFile);
  } catch (err) {
    console.error('Could not persist encryption key - set ENCRYPTION_KEY env!', err.message);
  }
  return generated;
}

const KEY = resolveKey();

/**
 * Encrypt a string using AES-256-GCM. Output: enc:v1:<iv>:<tag>:<ciphertext> (base64 parts)
 */
function encrypt(plain) {
  if (plain === undefined || plain === null || plain === '') return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const encrypted = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

/**
 * Decrypt. Falls back gracefully:
 * - enc:v1: prefix -> AES-256-GCM
 * - legacy base64 (old SMTP storage) -> decoded
 * - anything else -> returned as-is (legacy plaintext, e.g. old cluster tokens)
 */
function decrypt(value) {
  const raw = String(value || '');
  if (!raw) return '';

  if (raw.startsWith(PREFIX)) {
    try {
      const [ivB64, tagB64, dataB64] = raw.slice(PREFIX.length).split(':');
      const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, Buffer.from(ivB64, 'base64'));
      decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
      return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
    } catch (err) {
      console.error('Decryption failed (wrong ENCRYPTION_KEY?):', err.message);
      return '';
    }
  }

  // Legacy base64 (old emailService "encryption")
  if (/^[A-Za-z0-9+/]+={0,2}$/.test(raw) && raw.length % 4 === 0) {
    try {
      const decoded = Buffer.from(raw, 'base64').toString('utf8');
      // Heuristic: valid printable UTF-8 round trip means it was base64
      if (Buffer.from(decoded, 'utf8').toString('base64') === raw && /^[\x20-\x7E]*$/.test(decoded)) {
        return decoded;
      }
    } catch (_) { /* fall through */ }
  }

  return raw; // legacy plaintext
}

function isEncrypted(value) {
  return String(value || '').startsWith(PREFIX);
}

module.exports = { encrypt, decrypt, isEncrypted };

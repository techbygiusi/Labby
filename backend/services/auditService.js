const { run } = require('../config/database');

/**
 * Write an audit log entry. Never throws - auditing must not break requests.
 */
async function logAudit(req, action, target = '', details = '') {
  try {
    const userId = req?.user?.id || null;
    const userEmail = req?.user?.email || '';
    const ip = req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req?.socket?.remoteAddress || '';
    await run(
      'INSERT INTO audit_log (user_id, user_email, action, target, details, ip) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, userEmail, String(action), String(target || ''), String(details || ''), ip]
    );
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
}

module.exports = { logAudit };

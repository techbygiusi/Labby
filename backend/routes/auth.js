const express = require('express');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

const { get, run, all } = require('../config/database');
const { generateToken, authMiddleware, generateResetToken, verifyResetToken } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const { HTTP_STATUS, ERROR_MESSAGES, ROLES } = require('../config/constants');
const { sendEmail, testSmtpConnection, initializeEmailService, encryptString } = require('../services/emailService');
const { testConnection } = require('../services/proxmoxService');
const { passwordResetTemplate } = require('../services/emailTemplates');
const { logAudit } = require('../services/auditService');
const { getPublicFrontendUrl } = require('../utils/publicUrl');

const SETUP_KEYS = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_password'];

async function getSetupState() {
  const adminUser = await get(
    'SELECT id, email, name, role, preferred_language FROM users WHERE role = ? ORDER BY id ASC LIMIT 1',
    [ROLES.ADMIN]
  );
  const proxmoxCluster = await get('SELECT id FROM proxmox_clusters ORDER BY id ASC LIMIT 1');
  const smtpRows = await all(
    `SELECT key, value FROM settings WHERE key IN (${SETUP_KEYS.map(() => '?').join(',')})`,
    SETUP_KEYS
  );

  const smtpSettings = smtpRows.reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});

  const adminConfigured = Boolean(adminUser);
  const proxmoxConfigured = Boolean(proxmoxCluster);
  const smtpConfigured = SETUP_KEYS.every(
    key => typeof smtpSettings[key] === 'string' && smtpSettings[key].trim() !== ''
  );

  const missing = [];
  if (!adminConfigured) missing.push('admin');
  if (!proxmoxConfigured) missing.push('proxmox');
  if (!smtpConfigured) missing.push('smtp');

  return {
    setupRequired: missing.length > 0,
    setupComplete: missing.length === 0,
    adminConfigured,
    proxmoxConfigured,
    smtpConfigured,
    missing,
    adminUser: adminUser ? {
      id: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
      role: adminUser.role,
      preferredLanguage: adminUser.preferred_language || 'en'
    } : null
  };
}

async function assertSetupOpen() {
  const state = await getSetupState();
  if (state.setupComplete) {
    throw new AppError(ERROR_MESSAGES.SETUP_ALREADY_COMPLETED, HTTP_STATUS.CONFLICT);
  }
  return state;
}

function normalizeUrl(url) {
  if (!url || typeof url !== 'string') return '';
  return url.trim().replace(/\/+$/, '');
}

function validateSmtp({ smtpHost, smtpPort, smtpUser, smtpPassword }) {
  if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
    throw new AppError('SMTP host, port, user, and password are required', HTTP_STATUS.BAD_REQUEST);
  }

  const parsedPort = Number(smtpPort);
  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    throw new AppError('SMTP port is invalid', HTTP_STATUS.BAD_REQUEST);
  }
}

function validateProxmox({ proxmoxName, proxmoxUrl, proxmoxApiToken }) {
  if (!proxmoxName || !proxmoxUrl || !proxmoxApiToken) {
    throw new AppError('Proxmox name, URL, and API token are required', HTTP_STATUS.BAD_REQUEST);
  }
  if (!/^https?:\/\//i.test(proxmoxUrl)) {
    throw new AppError('Proxmox URL must start with http:// or https://', HTTP_STATUS.BAD_REQUEST);
  }
}

router.get('/setup-required', async (req, res, next) => {
  try {
    const state = await getSetupState();
    res.json(state);
  } catch (err) {
    next(err);
  }
});

router.post('/setup/test-smtp', async (req, res, next) => {
  try {
    await assertSetupOpen();
    const { smtpHost, smtpPort, smtpUser, smtpPassword } = req.body;
    validateSmtp({ smtpHost, smtpPort, smtpUser, smtpPassword });

    const result = await testSmtpConnection(
      smtpHost.trim(),
      String(smtpPort).trim(),
      smtpUser.trim(),
      smtpPassword
    );
    res.status(result.success ? HTTP_STATUS.OK : HTTP_STATUS.BAD_REQUEST).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/setup/test-proxmox', async (req, res, next) => {
  try {
    await assertSetupOpen();
    const proxmoxName = req.body.proxmoxName || 'Proxmox';
    const proxmoxUrl = normalizeUrl(req.body.proxmoxUrl);
    const proxmoxApiToken = req.body.proxmoxApiToken;
    validateProxmox({ proxmoxName, proxmoxUrl, proxmoxApiToken });

    const result = await testConnection(proxmoxUrl, proxmoxApiToken.trim());
    res.status(result.success ? HTTP_STATUS.OK : HTTP_STATUS.BAD_REQUEST).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/setup', async (req, res, next) => {
  try {
    const state = await assertSetupOpen();
    const {
      adminName,
      adminEmail,
      adminPassword,
      proxmoxName,
      proxmoxUrl,
      proxmoxApiToken,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPassword,
      preferredLanguage
    } = req.body;

    let adminUser = state.adminUser;

    if (!state.adminConfigured) {
      if (!adminName || !adminEmail || !adminPassword) {
        throw new AppError('Admin name, email, and password are required', HTTP_STATUS.BAD_REQUEST);
      }
      if (adminPassword.length < 8) {
        throw new AppError('Admin password must be at least 8 characters', HTTP_STATUS.BAD_REQUEST);
      }

      const existingUser = await get('SELECT id FROM users WHERE email = ?', [adminEmail.trim().toLowerCase()]);
      if (existingUser) {
        throw new AppError(ERROR_MESSAGES.USER_EXISTS, HTTP_STATUS.CONFLICT);
      }

      const passwordHash = await bcryptjs.hash(adminPassword, 12);
      const result = await run(
        'INSERT INTO users (email, name, password_hash, role, preferred_language) VALUES (?, ?, ?, ?, ?)',
        [adminEmail.trim().toLowerCase(), adminName.trim(), passwordHash, ROLES.ADMIN, ['de', 'en'].includes(String(preferredLanguage || '').toLowerCase()) ? String(preferredLanguage).toLowerCase() : 'en']
      );

      adminUser = {
        id: result.lastID,
        email: adminEmail.trim().toLowerCase(),
        name: adminName.trim(),
        role: ROLES.ADMIN,
        preferredLanguage: ['de', 'en'].includes(String(preferredLanguage || '').toLowerCase()) ? String(preferredLanguage).toLowerCase() : 'en'
      };
    }

    if (!state.proxmoxConfigured) {
      const normalizedProxmoxUrl = normalizeUrl(proxmoxUrl);
      validateProxmox({ proxmoxName, proxmoxUrl: normalizedProxmoxUrl, proxmoxApiToken });

      const proxmoxTest = await testConnection(normalizedProxmoxUrl, proxmoxApiToken.trim());
      if (!proxmoxTest.success) {
        throw new AppError(`Proxmox test failed: ${proxmoxTest.message}`, HTTP_STATUS.BAD_REQUEST);
      }

      await run(
        'INSERT INTO proxmox_clusters (name, url, api_token) VALUES (?, ?, ?)',
        [proxmoxName.trim(), normalizedProxmoxUrl, encryptString(proxmoxApiToken.trim())]
      );
    }

    if (!state.smtpConfigured) {
      validateSmtp({ smtpHost, smtpPort, smtpUser, smtpPassword });

      const smtpTest = await testSmtpConnection(
        smtpHost.trim(),
        String(smtpPort).trim(),
        smtpUser.trim(),
        smtpPassword
      );
      if (!smtpTest.success) {
        throw new AppError(`SMTP test failed: ${smtpTest.message}`, HTTP_STATUS.BAD_REQUEST);
      }

      await run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['smtp_host', smtpHost.trim()]);
      await run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['smtp_port', String(smtpPort).trim()]);
      await run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['smtp_user', smtpUser.trim()]);
      await run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['smtp_password', encryptString(smtpPassword)]);
      await initializeEmailService();
    }

    const finalState = await getSetupState();
    if (finalState.setupRequired) {
      throw new AppError(`Setup incomplete. Missing: ${finalState.missing.join(', ')}`, HTTP_STATUS.BAD_REQUEST);
    }

    await run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['setup_complete', 'true']);

    const token = generateToken(adminUser.id, adminUser.email, adminUser.role);

    res.status(HTTP_STATUS.CREATED).json({
      message: 'Setup completed successfully',
      setupComplete: true,
      token,
      user: adminUser
    });
  } catch (err) {
    next(err);
  }
});

// Brute-force lockout: 5 failed attempts per email lock login for 15 minutes
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCK_MS = 15 * 60 * 1000;
const loginAttempts = new Map();

function checkLoginLock(email) {
  const entry = loginAttempts.get(email);
  if (!entry) return;
  if (entry.lockedUntil && Date.now() < entry.lockedUntil) {
    throw new AppError('Account temporarily locked. Try again later.', HTTP_STATUS.UNAUTHORIZED);
  }
}

function registerFailedLogin(email) {
  const entry = loginAttempts.get(email) || { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= LOGIN_MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOGIN_LOCK_MS;
    entry.count = 0;
  }
  loginAttempts.set(email, entry);
}

function clearFailedLogins(email) {
  loginAttempts.delete(email);
}

router.post('/login', async (req, res, next) => {
  try {
    const { email, password, preferredLanguage } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password required', HTTP_STATUS.BAD_REQUEST);
    }

    const setupState = await getSetupState();
    if (setupState.setupRequired) {
      throw new AppError(ERROR_MESSAGES.SETUP_REQUIRED, HTTP_STATUS.FORBIDDEN);
    }

    const normalizedEmail = email.trim().toLowerCase();
    checkLoginLock(normalizedEmail);

    const user = await get('SELECT * FROM users WHERE email = ?', [normalizedEmail]);

    if (!user) {
      registerFailedLogin(normalizedEmail);
      await logAudit(req, 'auth.login_failed', normalizedEmail, 'unknown user');
      throw new AppError(ERROR_MESSAGES.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);
    }

    const passwordMatch = await bcryptjs.compare(password, user.password_hash);

    if (!passwordMatch) {
      registerFailedLogin(normalizedEmail);
      await logAudit(req, 'auth.login_failed', normalizedEmail, 'wrong password');
      throw new AppError(ERROR_MESSAGES.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);
    }

    clearFailedLogins(normalizedEmail);
    const requestedLanguage = ['en', 'de'].includes(String(preferredLanguage || '').toLowerCase())
      ? String(preferredLanguage).toLowerCase()
      : (user.preferred_language || 'en');
    if (requestedLanguage !== (user.preferred_language || 'en')) {
      await run('UPDATE users SET preferred_language = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [requestedLanguage, user.id]);
      user.preferred_language = requestedLanguage;
    }
    await logAudit({ user: { id: user.id, email: user.email }, headers: req.headers, socket: req.socket }, 'auth.login', user.email);
    const token = generateToken(user.id, user.email, user.role);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        preferredLanguage: user.preferred_language || 'en'
      }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/verify', authMiddleware, async (req, res, next) => {
  try {
    const setupState = await getSetupState();
    const storedUser = await get('SELECT id, email, name, role, preferred_language FROM users WHERE id = ?', [req.user.id]);
    res.json({
      valid: true,
      user: storedUser ? {
        id: storedUser.id,
        email: storedUser.email,
        name: storedUser.name,
        role: storedUser.role,
        preferredLanguage: storedUser.preferred_language || null
      } : req.user,
      setupRequired: setupState.setupRequired
    });
  } catch (err) {
    next(err);
  }
});

router.post('/change-password', authMiddleware, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError('Current and new password required', HTTP_STATUS.BAD_REQUEST);
    }
    if (newPassword.length < 8) {
      throw new AppError('New password must be at least 8 characters', HTTP_STATUS.BAD_REQUEST);
    }

    const user = await get('SELECT * FROM users WHERE id = ?', [req.user.id]);

    if (!user) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    const passwordMatch = await bcryptjs.compare(currentPassword, user.password_hash);

    if (!passwordMatch) {
      throw new AppError('Current password is incorrect', HTTP_STATUS.UNAUTHORIZED);
    }

    const newPasswordHash = await bcryptjs.hash(newPassword, 12);

    await run(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newPasswordHash, req.user.id]
    );

    await logAudit(req, 'auth.password_changed', req.user.email);

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
});

router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email, preferredLanguage } = req.body;

    if (!email) {
      throw new AppError('Email is required', HTTP_STATUS.BAD_REQUEST);
    }

    const user = await get('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);

    if (!user) {
      return res.json({ message: 'If email exists, password reset link has been sent' });
    }

    const requestedLanguage = ['en', 'de'].includes(String(preferredLanguage || '').toLowerCase())
      ? String(preferredLanguage).toLowerCase()
      : (user.preferred_language || 'en');
    if (requestedLanguage !== (user.preferred_language || 'en')) {
      await run('UPDATE users SET preferred_language = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [requestedLanguage, user.id]);
      user.preferred_language = requestedLanguage;
    }

    const resetToken = generateResetToken(user.id, user.email);
    const resetLink = `${getPublicFrontendUrl(req)}/reset-password?token=${encodeURIComponent(resetToken)}`;

    const template = passwordResetTemplate({ name: user.name, resetLink, language: user.preferred_language || 'en' });
    await sendEmail(user.email, template.subject, template.text, template.html);
    await logAudit(req, 'auth.password_reset_requested', user.email);

    res.json({ message: 'Password reset link sent to your email' });
  } catch (err) {
    next(err);
  }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      throw new AppError('Token and new password required', HTTP_STATUS.BAD_REQUEST);
    }
    if (newPassword.length < 8) {
      throw new AppError('New password must be at least 8 characters', HTTP_STATUS.BAD_REQUEST);
    }

    let decoded;
    try {
      decoded = verifyResetToken(token);
    } catch (err) {
      throw new AppError(ERROR_MESSAGES.INVALID_TOKEN, HTTP_STATUS.UNAUTHORIZED);
    }
    const user = await get('SELECT * FROM users WHERE id = ?', [decoded.id]);

    if (!user) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    const newPasswordHash = await bcryptjs.hash(newPassword, 12);

    await run(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newPasswordHash, user.id]
    );

    await logAudit(req, 'auth.password_reset_completed', user.email);
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', authMiddleware, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;

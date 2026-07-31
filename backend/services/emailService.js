const nodemailer = require('nodemailer');
const { get } = require('../config/database');

let transporter = null;
let transporterSender = '';

/**
 * Initialize email transporter with settings
 */
async function initializeEmailService() {
  try {
    const smtpHost = await get('SELECT value FROM settings WHERE key = ?', ['smtp_host']);
    const smtpPort = await get('SELECT value FROM settings WHERE key = ?', ['smtp_port']);
    const smtpUser = await get('SELECT value FROM settings WHERE key = ?', ['smtp_user']);
    const smtpPassword = await get('SELECT value FROM settings WHERE key = ?', ['smtp_password']);

    if (!smtpHost || !smtpPort) {
      console.warn('SMTP not configured - email service disabled');
      return false;
    }

    const decryptedPassword = decryptString(smtpPassword?.value || '');
    transporterSender = String(smtpUser?.value || '').trim();

    transporter = nodemailer.createTransport({
      host: smtpHost.value,
      port: parseInt(smtpPort.value),
      secure: parseInt(smtpPort.value) === 465, // true for 465, false for other ports
      auth: {
        user: smtpUser?.value || '',
        pass: decryptedPassword
      }
    });

    // Verify connection
    try {
      await transporter.verify();
      console.log('✓ SMTP connection verified');
      return true;
    } catch (err) {
      console.error('✗ SMTP verification failed:', err.message);
      return false;
    }
  } catch (error) {
    console.error('Error initializing email service:', error.message);
    return false;
  }
}

/**
 * Send email
 */
async function sendEmail(to, subject, text, html = null) {
  try {
    if (!transporter) {
      const initialized = await initializeEmailService();
      if (!initialized) {
        console.warn('Email service not configured, skipping email send');
        return { success: false, message: 'Email service not configured' };
      }
    }

    const storedSmtpUser = transporterSender || (await get('SELECT value FROM settings WHERE key = ?', ['smtp_user']))?.value || '';
    const sender = String(process.env.SMTP_FROM || storedSmtpUser || 'noreply@hosting-portal.local').trim();

    const mailOptions = {
      from: sender,
      envelope: {
        from: sender,
        to
      },
      to,
      subject,
      text,
      ...(html && { html })
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error.message);
    return { success: false, message: error.message };
  }
}

/**
 * Test SMTP configuration
 */
async function testSmtpConnection(smtpHost, smtpPort, smtpUser, smtpPassword) {
  try {
    const testTransporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: parseInt(smtpPort) === 465,
      auth: {
        user: smtpUser,
        pass: smtpPassword
      }
    });

    await testTransporter.verify();
    return { success: true, message: 'Connection successful' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Encryption utilities - delegate to cryptoService (AES-256-GCM).
 * decrypt() transparently handles legacy base64 values from older versions.
 */
const cryptoService = require('./cryptoService');

function encryptString(str) {
  return cryptoService.encrypt(str);
}

function decryptString(str) {
  return cryptoService.decrypt(str);
}

// Initialize on startup
initializeEmailService().catch(err => {
  console.error('Failed to initialize email service on startup:', err.message);
});

module.exports = {
  sendEmail,
  testSmtpConnection,
  initializeEmailService,
  encryptString,
  decryptString
};

/**
 * Branded bilingual HTML e-mail templates.
 * Every template accepts language: 'en' | 'de'. English is the fallback.
 */

const BRAND_NAME = process.env.BRAND_NAME || 'Hosting by TechByGiusi';
const BRAND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const COLORS = {
  accent: '#7A876F', text: '#111111', muted: '#6B7280', surface: '#f4f4f2',
  border: '#e3e3e0', danger: '#b42318', warning: '#b7791f', success: '#2f7d46'
};

function normalizeLanguage(language) {
  return String(language || '').toLowerCase() === 'de' ? 'de' : 'en';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatDateTime(value, language = 'en') {
  const lang = normalizeLanguage(language);
  try {
    const formatted = new Date(value).toLocaleString(lang === 'de' ? 'de-DE' : 'en-GB', {
      weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: process.env.TZ || 'Europe/Berlin'
    });
    return lang === 'de' ? `${formatted} Uhr` : formatted;
  } catch (_) {
    return String(value);
  }
}

function baseLayout({ language = 'en', preheader = '', title, bodyHtml, footerNote = '' }) {
  const lang = normalizeLanguage(language);
  const footer = lang === 'de'
    ? `Diese Nachricht wurde automatisch von <a href="${BRAND_URL}" style="color:${COLORS.accent};text-decoration:none;">${escapeHtml(BRAND_NAME)}</a> versendet.`
    : `This message was sent automatically by <a href="${BRAND_URL}" style="color:${COLORS.accent};text-decoration:none;">${escapeHtml(BRAND_NAME)}</a>.`;
  return `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${COLORS.text};">
<span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr><td style="padding:0 8px 20px"><div style="font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:${COLORS.accent};font-weight:600;">${escapeHtml(BRAND_NAME)}</div></td></tr>
<tr><td style="background:${COLORS.surface};border:1px solid ${COLORS.border};border-radius:14px;padding:32px 28px;">
<h1 style="margin:0 0 16px;font-size:22px;font-weight:600;line-height:1.3;color:${COLORS.text};">${escapeHtml(title)}</h1>${bodyHtml}</td></tr>
<tr><td style="padding:20px 8px 0"><p style="margin:0;font-size:12px;line-height:1.6;color:${COLORS.muted};">${footer}${footerNote ? `<br>${escapeHtml(footerNote)}` : ''}</p></td></tr>
</table></td></tr></table></body></html>`;
}

function button(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td style="border-radius:10px;background:${COLORS.accent};"><a href="${escapeHtml(href)}" target="_blank" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;color:#fff;text-decoration:none;border-radius:10px;">${escapeHtml(label)}</a></td></tr></table>`;
}
function infoRow(label, value) { return `<tr><td style="padding:6px 12px 6px 0;font-size:13px;color:${COLORS.muted};white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:6px 0;font-size:14px;color:${COLORS.text};font-weight:500;">${escapeHtml(value)}</td></tr>`; }
function paragraph(html) { return `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${COLORS.text};">${html}</p>`; }
function statusPill(text, color) { return `<span style="display:inline-block;padding:3px 12px;border-radius:999px;background:${color};color:#fff;font-size:12px;font-weight:600;letter-spacing:.04em;">${escapeHtml(text)}</span>`; }
function hello(name, lang) { return lang === 'de' ? `Hallo ${escapeHtml(name || '')},` : `Hello ${escapeHtml(name || '')},`; }

function passwordResetTemplate({ name, resetLink, language = 'en' }) {
  const lang = normalizeLanguage(language);
  const de = lang === 'de';
  const subject = de ? `${BRAND_NAME} - Passwort zurücksetzen` : `${BRAND_NAME} - Reset your password`;
  const title = de ? 'Passwort zurücksetzen' : 'Reset your password';
  const html = baseLayout({ language: lang, preheader: de ? 'Der Link ist 1 Stunde gültig.' : 'The link is valid for 1 hour.', title, bodyHtml: `
    ${paragraph(hello(name, lang))}
    ${paragraph(de ? 'Für dein Konto wurde das Zurücksetzen des Passworts angefordert. Klicke auf den Button, um ein neues Passwort festzulegen.' : 'A password reset was requested for your account. Use the button below to set a new password.')}
    ${button(resetLink, de ? 'Neues Passwort festlegen' : 'Set new password')}
    ${paragraph(de ? 'Der Link ist <strong>1 Stunde</strong> gültig. Falls du die Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.' : 'The link is valid for <strong>1 hour</strong>. If you did not request this, you can ignore this email.')}
    <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:${COLORS.muted};word-break:break-all;">${de ? 'Falls der Button nicht funktioniert' : 'If the button does not work'}: ${escapeHtml(resetLink)}</p>` });
  const text = de
    ? `Hallo ${name || ''},\n\nfür dein Konto wurde das Zurücksetzen des Passworts angefordert.\n\nLink (1 Stunde gültig):\n${resetLink}\n\n${BRAND_NAME}`
    : `Hello ${name || ''},\n\na password reset was requested for your account.\n\nLink (valid for 1 hour):\n${resetLink}\n\n${BRAND_NAME}`;
  return { subject, text, html };
}

function welcomeTemplate({ name, email, loginUrl, language = 'en' }) {
  const lang = normalizeLanguage(language); const de = lang === 'de';
  const subject = de ? `Willkommen bei ${BRAND_NAME}` : `Welcome to ${BRAND_NAME}`;
  const title = de ? 'Willkommen im Hosting Portal' : 'Welcome to the Hosting Portal';
  const html = baseLayout({ language: lang, preheader: de ? 'Dein Zugang wurde eingerichtet.' : 'Your account has been created.', title, bodyHtml: `
    ${paragraph(hello(name, lang))}
    ${paragraph(de ? 'Für dich wurde ein Zugang zum Hosting Portal eingerichtet. Dort kannst du deine Dienste einsehen, verwalten und überwachen.' : 'An account has been created for you. You can use the portal to view, manage and monitor your services.')}
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0;">${infoRow(de ? 'Benutzername' : 'Username', email)}${infoRow('Portal', loginUrl)}</table>
    ${paragraph(de ? 'Dein Passwort hast du separat von deinem Administrator erhalten. Bitte ändere es nach der ersten Anmeldung.' : 'Your administrator provided your password separately. Please change it after your first sign-in.')}
    ${button(loginUrl, de ? 'Zum Portal' : 'Open portal')}` });
  const text = de
    ? `Hallo ${name || ''},\n\nfür dich wurde ein Zugang zum Hosting Portal eingerichtet.\n\nBenutzername: ${email}\nPortal: ${loginUrl}\n\n${BRAND_NAME}`
    : `Hello ${name || ''},\n\nan account has been created for you.\n\nUsername: ${email}\nPortal: ${loginUrl}\n\n${BRAND_NAME}`;
  return { subject, text, html };
}

function resourceDownTemplate({ name, resourceName, containerId, clusterName, since, language = 'en' }) {
  const lang = normalizeLanguage(language); const de = lang === 'de'; const service = resourceName || containerId;
  const subject = de ? `⚠ Dienst offline: ${service}` : `⚠ Service offline: ${service}`;
  const title = de ? 'Dienst offline' : 'Service offline';
  const html = baseLayout({ language: lang, preheader: de ? `${service} ist nicht mehr erreichbar.` : `${service} is no longer available.`, title, bodyHtml: `
    <div style="margin:0 0 16px;">${statusPill('OFFLINE', COLORS.danger)}</div>${paragraph(hello(name, lang))}
    ${paragraph(de ? 'Einer deiner Dienste wird als <strong>gestoppt</strong> gemeldet:' : 'One of your services is reported as <strong>stopped</strong>:')}
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0;">${infoRow(de ? 'Dienst' : 'Service', service)}${infoRow('ID', containerId)}${infoRow('Cluster', clusterName || (de ? 'Unbekannt' : 'Unknown'))}${infoRow(de ? 'Erkannt am' : 'Detected at', formatDateTime(since || new Date(), lang))}</table>
    ${paragraph(de ? 'Du kannst den Dienst im Portal prüfen und bei Bedarf neu starten.' : 'You can check the service in the portal and restart it if necessary.')}${button(BRAND_URL, de ? 'Portal öffnen' : 'Open portal')}
    <p style="margin:0;font-size:12px;color:${COLORS.muted};">${de ? 'Diese Meldung ist in deinen Benachrichtigungseinstellungen aktiviert.' : 'This notification is enabled in your notification settings.'}</p>` });
  const text = de
    ? `Hallo ${name || ''},\n\nDienst offline:\nDienst: ${service}\nID: ${containerId}\nCluster: ${clusterName || 'Unbekannt'}\nErkannt am: ${formatDateTime(since || new Date(), lang)}\n\nPortal: ${BRAND_URL}`
    : `Hello ${name || ''},\n\nService offline:\nService: ${service}\nID: ${containerId}\nCluster: ${clusterName || 'Unknown'}\nDetected at: ${formatDateTime(since || new Date(), lang)}\n\nPortal: ${BRAND_URL}`;
  return { subject, text, html };
}

function resourceRecoveredTemplate({ name, resourceName, containerId, clusterName, since, language = 'en' }) {
  const lang = normalizeLanguage(language); const de = lang === 'de'; const service = resourceName || containerId;
  const subject = de ? `✓ Dienst wieder online: ${service}` : `✓ Service back online: ${service}`;
  const title = de ? 'Dienst wieder online' : 'Service back online';
  const html = baseLayout({ language: lang, preheader: de ? `${service} läuft wieder.` : `${service} is running again.`, title, bodyHtml: `
    <div style="margin:0 0 16px;">${statusPill('ONLINE', COLORS.success)}</div>${paragraph(hello(name, lang))}
    ${paragraph(de ? 'Gute Nachricht - der folgende Dienst läuft wieder:' : 'Good news - the following service is running again:')}
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0;">${infoRow(de ? 'Dienst' : 'Service', service)}${infoRow('ID', containerId)}${infoRow('Cluster', clusterName || (de ? 'Unbekannt' : 'Unknown'))}${infoRow(de ? 'Erkannt am' : 'Detected at', formatDateTime(since || new Date(), lang))}</table>${button(BRAND_URL, de ? 'Portal öffnen' : 'Open portal')}` });
  const text = de
    ? `Hallo ${name || ''},\n\nDienst wieder online:\nDienst: ${service}\nID: ${containerId}\nCluster: ${clusterName || 'Unbekannt'}\n\nPortal: ${BRAND_URL}`
    : `Hello ${name || ''},\n\nService back online:\nService: ${service}\nID: ${containerId}\nCluster: ${clusterName || 'Unknown'}\n\nPortal: ${BRAND_URL}`;
  return { subject, text, html };
}

function maintenanceTemplate({ name, title, message, startsAt, endsAt, severity, language = 'en' }) {
  const lang = normalizeLanguage(language); const de = lang === 'de';
  const labels = de
    ? { critical: 'Kritische Wartung', warning: 'Wartung mit Einschränkungen', info: 'Geplante Wartung' }
    : { critical: 'Critical maintenance', warning: 'Maintenance with restrictions', info: 'Scheduled maintenance' };
  const severityLabel = labels[severity] || labels.info;
  const severityColor = severity === 'critical' ? COLORS.danger : severity === 'warning' ? COLORS.warning : COLORS.accent;
  const subject = `🔧 ${severityLabel}: ${title}`;
  const html = baseLayout({ language: lang, preheader: `${severityLabel}: ${formatDateTime(startsAt, lang)} - ${formatDateTime(endsAt, lang)}.`, title, bodyHtml: `
    <div style="margin:0 0 16px;">${statusPill(severityLabel.toUpperCase(), severityColor)}</div>${paragraph(hello(name, lang))}
    ${paragraph(de ? 'Für das Hosting Portal wurde eine Wartung angekündigt:' : 'Maintenance has been announced for the Hosting Portal:')}
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0;">${infoRow(de ? 'Beginn' : 'Start', formatDateTime(startsAt, lang))}${infoRow(de ? 'Ende' : 'End', formatDateTime(endsAt, lang))}</table>
    ${message ? paragraph(escapeHtml(message).replace(/\n/g, '<br>')) : ''}
    ${paragraph(de ? 'Während der Wartung kann es zu Unterbrechungen kommen. Details findest du im Portal.' : 'Service interruptions may occur during maintenance. Details are available in the portal.')}${button(BRAND_URL, de ? 'Portal öffnen' : 'Open portal')}
    <p style="margin:0;font-size:12px;color:${COLORS.muted};">${de ? 'Diese Meldung ist in deinen Benachrichtigungseinstellungen aktiviert.' : 'This notification is enabled in your notification settings.'}</p>` });
  const text = de
    ? `Hallo ${name || ''},\n\n${severityLabel}: ${title}\n\nBeginn: ${formatDateTime(startsAt, lang)}\nEnde: ${formatDateTime(endsAt, lang)}\n\n${message || ''}\n\nPortal: ${BRAND_URL}`
    : `Hello ${name || ''},\n\n${severityLabel}: ${title}\n\nStart: ${formatDateTime(startsAt, lang)}\nEnd: ${formatDateTime(endsAt, lang)}\n\n${message || ''}\n\nPortal: ${BRAND_URL}`;
  return { subject, text, html };
}

function testMailTemplate({ name, language = 'en' }) {
  const lang = normalizeLanguage(language); const de = lang === 'de';
  const subject = de ? `${BRAND_NAME} - Test-E-Mail` : `${BRAND_NAME} - Test email`;
  const title = de ? 'Test erfolgreich' : 'Test successful';
  const html = baseLayout({ language: lang, preheader: de ? 'Die SMTP-Konfiguration funktioniert.' : 'The SMTP configuration works.', title, bodyHtml: `
    <div style="margin:0 0 16px;">${statusPill('SMTP OK', COLORS.success)}</div>${paragraph(hello(name, lang))}
    ${paragraph(de ? 'Diese Test-E-Mail bestätigt, dass der E-Mail-Versand des Hosting Portals korrekt konfiguriert ist.' : 'This test email confirms that outgoing email for the Hosting Portal is configured correctly.')}` });
  const text = de
    ? `Hallo ${name || ''},\n\ndiese Test-E-Mail bestätigt, dass der E-Mail-Versand korrekt konfiguriert ist.\n\n${BRAND_NAME}`
    : `Hello ${name || ''},\n\nthis test email confirms that outgoing email is configured correctly.\n\n${BRAND_NAME}`;
  return { subject, text, html };
}

module.exports = { passwordResetTemplate, welcomeTemplate, resourceDownTemplate, resourceRecoveredTemplate, maintenanceTemplate, testMailTemplate };

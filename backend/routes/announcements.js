const express = require('express');
const router = express.Router();
const { all } = require('../config/database');

/**
 * GET /api/announcements
 * Public (unauthenticated): active and upcoming maintenance windows for the
 * top banner - shown on the login screen as well, so no auth required.
 * Only exposes title, message, severity and the time window.
 * Upcoming windows are announced up to 7 days in advance.
 */
router.get('/', async (req, res, next) => {
  try {
    const rows = await all(
      `
      SELECT id, title, message, severity, starts_at, ends_at
      FROM maintenance_windows
      WHERE datetime(ends_at) > datetime('now')
        AND datetime(starts_at) < datetime('now', '+7 days')
      ORDER BY datetime(starts_at) ASC
      LIMIT 5
      `
    );

    const now = Date.now();
    const announcements = rows.map(row => {
      const starts = new Date(row.starts_at).getTime();
      const ends = new Date(row.ends_at).getTime();
      return {
        id: row.id,
        title: row.title,
        message: row.message || '',
        severity: row.severity || 'info',
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        active: now >= starts && now <= ends
      };
    });

    res.json({ announcements });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

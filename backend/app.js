require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');

const { initDatabase } = require('./config/database');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/user');
const announcementRoutes = require('./routes/announcements');
const wikiRoutes = require('./routes/wiki');
const { authMiddleware } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');
const { attachConsoleProxy } = require('./services/consoleService');
const { startMonitoring } = require('./services/monitoringService');
const { resumeProvisioningJobs } = require('./services/provisioningJobService');

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Behind nginx / a reverse proxy: trust X-Forwarded-For for rate limiting & audit IPs
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 1));

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'same-site' }
}));

// CORS: restrict to the configured frontend origin(s) in production.
// FRONTEND_ORIGIN can be a comma-separated list, e.g. "https://portal.example.com"
const allowedOrigins = String(process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

if (allowedOrigins.length === 0 && process.env.NODE_ENV === 'production') {
  console.warn('⚠ FRONTEND_ORIGIN is not set - CORS allows all origins. Set it in production!');
}

app.use(cors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : true,
  credentials: true
}));

app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ limit: '1mb', extended: true }));

// Rate limiting: strict on auth (brute force), generous on the rest of the API
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests', message: 'Too many login attempts. Please try again later.' }
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests', message: 'Rate limit exceeded.' }
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);
app.use('/api', apiLimiter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

initDatabase().then(() => {
  console.log('✓ Database initialized');
  startMonitoring();
  resumeProvisioningJobs();
}).catch(err => {
  console.error('✗ Database initialization failed:', err);
  process.exit(1);
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', authMiddleware, userRoutes);
// Public: maintenance announcements for the top banner (also on login screen)
app.use('/api/announcements', announcementRoutes);
// Wiki: admin-authored knowledge base. Auth is applied per route because the
// image endpoint must stay reachable for <img> tags without an auth header.
app.use('/api/wiki', wikiRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

app.use(errorHandler);

// HTTP server (instead of app.listen) so the console WebSocket proxy can attach
const server = http.createServer(app);
attachConsoleProxy(server);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║   🚀 Hosting Portal Backend v3.1.73 Started      ║
║   Port: ${PORT}                                 ║
║   Environment: ${process.env.NODE_ENV || 'development'}              ║
║   API: http://localhost:${PORT}/api           ║
╚═══════════════════════════════════════════════╝
  `);
});

module.exports = app;

const initialMongoUri = process.env.MONGODB_URI;
require('dotenv').config();
if (process.env.NODE_ENV === 'test' && initialMongoUri) {
  process.env.MONGODB_URI = initialMongoUri;
}
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');

const connectDB = require('./src/config/db');
const { initSocket } = require('./src/config/socket');
const { setupSwagger } = require('./src/config/swagger');
const { apiLimiter } = require('./src/middleware/rateLimiter');
const { sanitizeMongoAndXSS, securityAuditTracker } = require('./src/middleware/security');
const { logSecurityEvent, SEVERITY } = require('./src/utils/auditLogger');
const routes = require('./src/routes/index');
const { errorHandler, notFound } = require('./src/middleware/errorHandler');

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

// ─── 1. Security HTTP Headers (Helmet) ──────────────────────────────────────
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false, // Allows Swagger UI assets & inline scripts
    xFrameOptions: { action: 'deny' },
    xContentTypeOptions: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

// ─── 2. CORS (Cross-Origin Resource Sharing) Security ─────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'test') {
        callback(null, true);
      } else {
        logSecurityEvent({
          eventType: 'CORS_BLOCKED',
          severity: SEVERITY.WARN,
          message: `Blocked unauthorized CORS origin: ${origin}`,
        });
        callback(new Error('Not allowed by CORS security policy'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400, // 24 hours preflight cache
  })
);

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(process.env.COOKIE_SECRET));

// ─── 3. NoSQL Mongo Injection & XSS Protection ────────────────────────────────
app.use(sanitizeMongoAndXSS);

// ─── 4. SOC Security Audit Tracker ───────────────────────────────────────────
app.use(securityAuditTracker);

// ─── 5. Rate Limiting ────────────────────────────────────────────────────────
app.use('/api', apiLimiter);

// Static files (uploaded avatars etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── 6. Swagger API Documentation ─────────────────────────────────────────────
setupSwagger(app);

// ─── 7. API Routes ────────────────────────────────────────────────────────────
app.use('/api', routes);

// ─── Root Route ───────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: '🏥 MediQueue Hospital Smart Appointment & Live Queue Backend API (Security Hardened)',
    version: '1.0.0',
    documentation: `http://${req.headers.host || 'localhost:5000'}/api-docs`,
    health: `http://${req.headers.host || 'localhost:5000'}/api/health`,
    timestamp: new Date().toISOString(),
  });
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Hospital Queue System API is running (Security Hardened)',
    swagger: `http://${req.headers.host || 'localhost:5000'}/api-docs`,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ─── 404 & Error Handling ─────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`\n🏥 Hospital Queue System Backend (Security Hardened)`);
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📑 Swagger Documentation: http://localhost:${PORT}/api-docs`);
    console.log(`🛡️  Helmet, Rate Limiting, Mongo Sanitize, XSS Protection & SOC Audit Logging Active`);
    console.log(`📡 Socket.IO listening for connections\n`);
  });
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err.message);
  logSecurityEvent({
    eventType: 'UNHANDLED_REJECTION',
    severity: SEVERITY.CRITICAL,
    message: `Unhandled Promise Rejection: ${err.message}`,
  });
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  logSecurityEvent({
    eventType: 'UNCAUGHT_EXCEPTION',
    severity: SEVERITY.CRITICAL,
    message: `Uncaught Exception: ${err.message}`,
  });
  process.exit(1);
});

module.exports = { app, server };

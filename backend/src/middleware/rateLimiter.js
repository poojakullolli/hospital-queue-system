/**
 * @fileoverview Express Rate Limiters for Brute-Force & Anti-DDoS defense.
 * Automatically skips rate limits in test environments (NODE_ENV === 'test').
 * Triggers SOC audit log entries whenever rate limits are breached.
 */

const rateLimit = require('express-rate-limit');
const { logSecurityEvent, SEVERITY } = require('../utils/auditLogger');

const skipInTest = () => process.env.NODE_ENV === 'test';

/**
 * 1. Global API Rate Limiter (100 requests per 15 minutes per IP)
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again after 15 minutes.',
  },
  handler: (req, res, next, options) => {
    logSecurityEvent({
      eventType: 'RATE_LIMIT_EXCEEDED',
      severity: SEVERITY.MEDIUM,
      message: `Global rate limit exceeded (100 reqs / 15 mins)`,
      req,
    });
    res.status(429).json(options.message);
  },
});

/**
 * 2. Strict Authentication Rate Limiter (10 attempts per 15 minutes per IP)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
  handler: (req, res, next, options) => {
    logSecurityEvent({
      eventType: 'AUTH_BRUTE_FORCE_ATTEMPT',
      severity: SEVERITY.HIGH,
      message: `Authentication rate limit exceeded for IP`,
      req,
      metadata: { target_email: req.body?.email },
    });
    res.status(429).json(options.message);
  },
});

/**
 * 3. Sensitive Action Rate Limiter (30 requests per 5 minutes per IP)
 */
const sensitiveLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: {
    success: false,
    message: 'Too many sensitive operations requested. Please slow down.',
  },
  handler: (req, res, next, options) => {
    logSecurityEvent({
      eventType: 'SENSITIVE_ACTION_RATE_LIMIT',
      severity: SEVERITY.MEDIUM,
      message: `Sensitive action rate limit breached`,
      req,
    });
    res.status(429).json(options.message);
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
  forgotPasswordLimiter: authLimiter,
  sensitiveLimiter,
};

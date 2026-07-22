/**
 * @fileoverview Rate Limiter Middleware — protect auth endpoints from brute-force attacks.
 *
 * Uses express-rate-limit to limit repeated requests by IP address.
 *
 * Limiters:
 *   authLimiter      — strict limit for login/register (5 req / 15 min)
 *   forgotPwLimiter  — very strict for forgot-password (3 req / 60 min)
 *   generalLimiter   — soft limit for all other API routes (100 req / 15 min)
 */

const rateLimit = require('express-rate-limit');

/**
 * Create a standardized rate limit response.
 * @param {string} action - Human-readable description of the limited action
 * @param {number} minutes - Window duration in minutes
 * @returns {function} express-rate-limit handler
 */
const createLimitHandler = (action, minutes) => (req, res) => {
  res.status(429).json({
    success: false,
    message: `Too many ${action} attempts from this IP. Please try again after ${minutes} minutes.`,
    retryAfter: `${minutes} minutes`,
  });
};

/**
 * Strict rate limiter for authentication endpoints.
 * 5 requests per 15-minute window per IP.
 *
 * Applied to: POST /api/auth/login, POST /api/auth/register, POST /api/auth/admin/login
 */
const authLimiter = rateLimit({
  windowMs:         15 * 60 * 1000, // 15 minutes
  max:              10,              // 10 requests per window (generous for dev)
  standardHeaders:  true,           // Return rate limit info in RateLimit-* headers
  legacyHeaders:    false,
  handler:          createLimitHandler('authentication', 15),
  skip: () => process.env.NODE_ENV === 'development', // Skip in development
});

/**
 * Very strict rate limiter for forgot-password endpoint.
 * 3 requests per 60-minute window per IP.
 * Prevents email flooding.
 */
const forgotPasswordLimiter = rateLimit({
  windowMs:         60 * 60 * 1000, // 1 hour
  max:              3,               // only 3 forgot-password requests per hour
  standardHeaders:  true,
  legacyHeaders:    false,
  handler:          createLimitHandler('password reset', 60),
  skip: () => process.env.NODE_ENV === 'development',
});

/**
 * General API rate limiter.
 * 100 requests per 15-minute window per IP.
 * Applied to all /api/* routes in server.js.
 */
const generalLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,  // 15 minutes
  max:             100,             // generous limit for normal usage
  standardHeaders: true,
  legacyHeaders:   false,
  handler:         createLimitHandler('API', 15),
  skip: () => process.env.NODE_ENV === 'development',
});

module.exports = { authLimiter, forgotPasswordLimiter, generalLimiter };

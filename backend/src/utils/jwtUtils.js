/**
 * @fileoverview JWT Utilities — generate and verify access + refresh tokens.
 *
 * Token strategy:
 *   - Access token:  short-lived (15 min default), sent in Authorization header
 *   - Refresh token: long-lived (7 days default), stored in HttpOnly cookie + DB
 *   - Email verification token: 24-hour window, stored hashed in DB
 *   - Password reset token:     10-minute window, stored hashed in DB
 */

const jwt  = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * Generate a signed JWT access token.
 * @param {{ id: string, role: string }} payload
 * @returns {string}
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    issuer:    'mediqueue',
    audience:  'mediqueue-client',
  });
};

/**
 * Generate a signed JWT refresh token.
 * @param {{ id: string, role: string }} payload
 * @returns {string}
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer:    'mediqueue',
    audience:  'mediqueue-client',
  });
};

/**
 * Verify a JWT access token.
 * @param {string} token
 * @returns {object} Decoded payload
 * @throws {JsonWebTokenError|TokenExpiredError}
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET, {
    issuer:   'mediqueue',
    audience: 'mediqueue-client',
  });
};

/**
 * Verify a JWT refresh token.
 * @param {string} token
 * @returns {object} Decoded payload
 * @throws {JsonWebTokenError|TokenExpiredError}
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
    issuer:   'mediqueue',
    audience: 'mediqueue-client',
  });
};

/**
 * Generate a cryptographically secure random token (for email verification
 * and password reset). Returns both the raw token (sent to user) and its
 * SHA-256 hash (stored in the database).
 *
 * @returns {{ rawToken: string, hashedToken: string }}
 */
const generateSecureToken = () => {
  const rawToken    = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  return { rawToken, hashedToken };
};

/**
 * Hash a raw token for comparison against the stored hash.
 * @param {string} rawToken
 * @returns {string}
 */
const hashToken = (rawToken) => {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateSecureToken,
  hashToken,
};

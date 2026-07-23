/**
 * @fileoverview JWT Security Utilities — token generation, HS256 algorithm enforcement,
 * cryptographic token hashing, and token revocation / blacklisting.
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// In-memory token blacklist for immediate token revocation upon logout
const revokedTokenBlacklist = new Set();

/**
 * Revoke/blacklist a JWT token.
 */
const revokeToken = (token) => {
  if (token) revokedTokenBlacklist.add(token);
};

/**
 * Check if a JWT token has been revoked.
 */
const isTokenRevoked = (token) => {
  return revokedTokenBlacklist.has(token);
};

/**
 * Generate a signed JWT access token.
 */
const generateAccessToken = (payload) => {
  const secret = process.env.JWT_SECRET || 'default_jwt_secret_key_at_least_32_chars';
  const cleanPayload = {
    id: (payload.id || payload._id).toString(),
    role: payload.role,
  };

  return jwt.sign(cleanPayload, secret, {
    algorithm: 'HS256',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    issuer:    'mediqueue',
    audience:  'mediqueue-client',
  });
};

/**
 * Generate a signed JWT refresh token.
 */
const generateRefreshToken = (payload) => {
  const secret = process.env.JWT_REFRESH_SECRET || 'default_refresh_secret_key_at_least_32_chars';
  const cleanPayload = {
    id: (payload.id || payload._id).toString(),
    role: payload.role,
  };

  return jwt.sign(cleanPayload, secret, {
    algorithm: 'HS256',
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer:    'mediqueue',
    audience:  'mediqueue-client',
  });
};

/**
 * Verify a JWT access token with HS256 algorithm enforcement & revocation check.
 */
const verifyAccessToken = (token) => {
  if (isTokenRevoked(token)) {
    const error = new Error('Token has been revoked.');
    error.name = 'JsonWebTokenError';
    throw error;
  }

  const secret = process.env.JWT_SECRET || 'default_jwt_secret_key_at_least_32_chars';
  return jwt.verify(token, secret, {
    algorithms: ['HS256'],
    issuer:     'mediqueue',
    audience:   'mediqueue-client',
  });
};

/**
 * Verify a JWT refresh token with HS256 algorithm enforcement & revocation check.
 */
const verifyRefreshToken = (token) => {
  if (isTokenRevoked(token)) {
    const error = new Error('Token has been revoked.');
    error.name = 'JsonWebTokenError';
    throw error;
  }

  const secret = process.env.JWT_REFRESH_SECRET || 'default_refresh_secret_key_at_least_32_chars';
  return jwt.verify(token, secret, {
    algorithms: ['HS256'],
    issuer:     'mediqueue',
    audience:   'mediqueue-client',
  });
};

/**
 * Cryptographically secure random token generator for password reset & email verification.
 */
const generateSecureToken = () => {
  const rawToken    = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  return { rawToken, hashedToken };
};

/**
 * Hash a raw token for database lookup.
 */
const hashToken = (rawToken) => {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
};

/**
 * Secure Cookie Options for JWT Refresh Tokens
 */
const getSecureCookieOptions = () => ({
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
  path:     '/',
});

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateSecureToken,
  hashToken,
  revokeToken,
  isTokenRevoked,
  getSecureCookieOptions,
};

/**
 * @fileoverview Authentication & Authorization Middleware
 *
 * Exports:
 *   protect       — verify JWT access token, attach req.user
 *   authorize     — role-based access control factory
 *   optionalAuth  — attach req.user if token exists, but don't block
 *   requireVerifiedEmail — reject unverified email accounts
 */

const { verifyAccessToken } = require('../utils/jwtUtils');
const User       = require('../models/User');
const AppError   = require('./AppError');
const asyncHandler = require('../utils/asyncHandler');

// ─── protect ──────────────────────────────────────────────────────────────────
/**
 * Verify the JWT access token and attach the user to `req.user`.
 *
 * Token is read from:
 *   1. Authorization header: "Bearer <token>"
 *   2. (optional) req.cookies.accessToken (if you switch to cookie-based access tokens)
 *
 * Returns 401 if:
 *   - No token provided
 *   - Token is invalid or expired
 *   - User no longer exists
 *   - Account is deactivated
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Also support cookie-based access token (optional / future use)
  if (!token && req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return next(new AppError('Authentication required. Please log in.', 401));
  }

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Session expired. Please log in again.', 401));
    }
    return next(new AppError('Invalid token. Please log in again.', 401));
  }

  // Verify user still exists
  const user = await User.findById(decoded.id).select('-password -refreshToken');

  if (!user) {
    return next(new AppError('The account belonging to this token no longer exists.', 401));
  }

  if (!user.isActive) {
    return next(
      new AppError('Your account has been deactivated. Please contact support.', 403)
    );
  }

  req.user = user;
  next();
});

// ─── authorize ────────────────────────────────────────────────────────────────
/**
 * Role-based access control (RBAC) factory.
 *
 * Usage:
 *   router.delete('/:id', protect, authorize('admin'), deleteUser);
 *   router.get('/queue', protect, authorize('doctor', 'admin'), getQueue);
 *
 * @param {...string} roles - Allowed role names
 * @returns {express.RequestHandler}
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Your role (${req.user.role}) does not have access to this resource. Required: ${roles.join(' or ')}.`,
          403
        )
      );
    }

    next();
  };
};

// ─── optionalAuth ─────────────────────────────────────────────────────────────
/**
 * Attach req.user if a valid token is present, but don't block the request
 * if no token or an invalid token is provided.
 *
 * Use for public endpoints that have enhanced features for logged-in users.
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = verifyAccessToken(token);
      const user    = await User.findById(decoded.id).select('-password -refreshToken');

      if (user && user.isActive) {
        req.user = user;
      }
    } catch {
      // Silently ignore invalid tokens for optional auth
    }
  }

  next();
});

// ─── requireVerifiedEmail ─────────────────────────────────────────────────────
/**
 * Block users whose email address has not been verified.
 * Chain after `protect`:
 *   router.post('/book', protect, requireVerifiedEmail, authorize('patient'), bookAppointment);
 *
 * Skips the check in development mode if SKIP_EMAIL_VERIFY=true.
 */
const requireVerifiedEmail = (req, res, next) => {
  if (process.env.SKIP_EMAIL_VERIFY === 'true' && process.env.NODE_ENV === 'development') {
    return next();
  }

  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }

  if (!req.user.isEmailVerified) {
    return next(
      new AppError(
        'Please verify your email address before accessing this resource. Check your inbox for the verification link.',
        403
      )
    );
  }

  next();
};

module.exports = {
  protect,
  authorize,
  optionalAuth,
  requireVerifiedEmail,
};

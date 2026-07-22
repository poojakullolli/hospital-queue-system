/**
 * @fileoverview Global Error Handler Middleware
 *
 * Exports:
 *   notFound     — 404 handler for unmatched routes
 *   errorHandler — global error processing middleware (must have 4 args)
 *
 * Handles:
 *   - Mongoose CastError (invalid ObjectId → 404)
 *   - Mongoose duplicate key (code 11000 → 409)
 *   - Mongoose ValidationError → 400
 *   - JWT errors → 401
 *   - Custom AppError (operational errors)
 *   - Unknown errors → 500
 */

const { errorResponse } = require('../utils/apiResponse');
const AppError = require('./AppError');

// ─── 404 Not Found ─────────────────────────────────────────────────────────────
/**
 * Catch-all for routes that don't match any registered route.
 * Mount AFTER all other routes.
 */
const notFound = (req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

// ─── Global Error Handler ──────────────────────────────────────────────────────
/**
 * Express 4-parameter error handler. Must be last middleware in the chain.
 * Normalises all errors into a consistent JSON shape via errorResponse().
 */
const errorHandler = (err, req, res, next) => {  // eslint-disable-line no-unused-vars
  let error = Object.create(err);       // shallow clone to avoid mutating original
  error.message    = err.message;
  error.statusCode = err.statusCode;

  // ── Log in development ────────────────────────────────────────────────────
  if (process.env.NODE_ENV === 'development') {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ Error:', err.message);
    console.error('Stack:', err.stack);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } else {
    console.error(`❌ ${err.name}: ${err.message}`);
  }

  // ── Mongoose: invalid ObjectId ─────────────────────────────────────────────
  if (err.name === 'CastError') {
    error = new AppError(`Invalid ${err.path}: ${err.value}`, 404);
  }

  // ── Mongoose: duplicate key ────────────────────────────────────────────────
  if (err.code === 11000) {
    const field   = Object.keys(err.keyValue || {})[0] || 'field';
    const value   = err.keyValue?.[field] || '';
    error = new AppError(
      `Duplicate value for ${field}: "${value}". Please use a different value.`,
      409
    );
  }

  // ── Mongoose: validation error ─────────────────────────────────────────────
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message).join('. ');
    error = new AppError(messages, 400);
  }

  // ── JWT: invalid signature ─────────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid token. Please log in again.', 401);
  }

  // ── JWT: token expired ─────────────────────────────────────────────────────
  if (err.name === 'TokenExpiredError') {
    error = new AppError('Session expired. Please log in again.', 401);
  }

  // ── JWT: not before ───────────────────────────────────────────────────────
  if (err.name === 'NotBeforeError') {
    error = new AppError('Token not active yet. Please try again shortly.', 401);
  }

  // ── Multer: file upload errors ────────────────────────────────────────────
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = new AppError('File is too large. Maximum file size is 5MB.', 400);
  }

  const statusCode = error.statusCode || 500;
  const message    = error.message    || 'Internal Server Error';

  // Include stack trace in development for debugging
  const responseData = process.env.NODE_ENV === 'development'
    ? { stack: err.stack }
    : null;

  errorResponse(res, message, statusCode, responseData);
};

module.exports = { notFound, errorHandler };

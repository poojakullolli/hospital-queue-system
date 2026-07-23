/**
 * @fileoverview Global Error Handler Middleware
 *
 * Normalises all errors (Mongoose, JWT, express-validator, AppError)
 * into a consistent JSON shape via errorResponse().
 */

const { errorResponse } = require('../utils/apiResponse');
const AppError = require('./AppError');

// ─── 404 Not Found ─────────────────────────────────────────────────────────────
const notFound = (req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

// ─── Global Error Handler ──────────────────────────────────────────────────────
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let responseData = process.env.NODE_ENV === 'development' ? { stack: err.stack } : null;

  // ── Mongoose: invalid ObjectId ─────────────────────────────────────────────
  if (err.name === 'CastError') {
    statusCode = 404;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // ── Mongoose: duplicate key ────────────────────────────────────────────────
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const value = err.keyValue?.[field] || '';
    statusCode = 409;
    message = `Duplicate value for ${field}: "${value}". Please use a different value.`;
  }

  // ── Mongoose: validation error ─────────────────────────────────────────────
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map((e) => e.message).join('. ');
  }

  // ── JWT: invalid signature ─────────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token. Please log in again.';
  }

  // ── JWT: token expired ─────────────────────────────────────────────────────
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Session expired. Please log in again.';
  }

  // ── JWT: not before ───────────────────────────────────────────────────────
  if (err.name === 'NotBeforeError') {
    statusCode = 401;
    message = 'Token not active yet. Please try again shortly.';
  }

  // ── Multer: file upload errors ────────────────────────────────────────────
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    message = 'File is too large. Maximum file size is 5MB.';
  }

  // Log all non-2xx/4xx errors or 500 errors
  if (statusCode === 500) {
    console.error('❌ Handled 500 Error:', err.message, err.stack);
  }

  errorResponse(res, message, statusCode, responseData);
};

module.exports = { notFound, errorHandler };

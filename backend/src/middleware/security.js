/**
 * @fileoverview Express 5 Compatible Mongo NoSQL Injection & XSS Sanitization Middleware.
 * Cleans user payloads of NoSQL operator keys ($ and .) and XSS script injections.
 */

const { logSecurityEvent, SEVERITY } = require('../utils/auditLogger');

/**
 * Recursively sanitize objects, arrays, and strings.
 */
const sanitizeValue = (val) => {
  if (typeof val === 'string') {
    return val
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/onload=/gi, '');
  }
  if (val && typeof val === 'object' && !Array.isArray(val) && !Buffer.isBuffer(val)) {
    const sanitizedObj = {};
    for (const key of Object.keys(val)) {
      const cleanKey = key.replace(/^\$|\./g, '_');
      sanitizedObj[cleanKey] = sanitizeValue(val[key]);
    }
    return sanitizedObj;
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeValue);
  }
  return val;
};

/**
 * Security Sanitization Middleware for Request Body and Params
 */
const sanitizeMongoAndXSS = (req, res, next) => {
  try {
    if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
      req.body = sanitizeValue(req.body);
    }
    if (req.params && typeof req.params === 'object') {
      for (const key of Object.keys(req.params)) {
        req.params[key] = sanitizeValue(req.params[key]);
      }
    }
  } catch (err) {
    console.error('Sanitization middleware error:', err.message);
  }

  next();
};

/**
 * Security Header & Audit Interceptor Middleware
 */
const securityAuditTracker = (req, res, next) => {
  res.on('finish', () => {
    if (res.statusCode === 401) {
      logSecurityEvent({
        eventType: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        severity: SEVERITY.LOW,
        message: `HTTP 401 Unauthorized access attempt`,
        req,
      });
    } else if (res.statusCode === 403) {
      logSecurityEvent({
        eventType: 'FORBIDDEN_ACCESS_ATTEMPT',
        severity: SEVERITY.HIGH,
        message: `HTTP 403 Forbidden access attempt / RBAC violation`,
        req,
      });
    }
  });

  next();
};

module.exports = {
  sanitizeMongoAndXSS,
  securityAuditTracker,
};

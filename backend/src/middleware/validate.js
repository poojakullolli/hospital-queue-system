/**
 * @fileoverview Validation Middleware — express-validator chains for all API endpoints.
 *
 * Pattern:
 *   1. Define an array of check() chains.
 *   2. Append the `validate` runner at the end.
 *   3. Export the combined array to use as route middleware.
 *
 * The `validate` function reads validation results and returns a 400 response
 * with a structured error list if any check fails.
 */

const { validationResult, check, body } = require('express-validator');
const { errorResponse } = require('../utils/apiResponse');

// ─── Runner: collect and respond with errors ────────────────────────────────
/**
 * Final middleware in any validation chain.
 * Collects express-validator results and returns a 400 if any rule failed.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  const extractedErrors = errors.array().map((err) => ({
    field:   err.path || err.param || 'unknown',
    message: err.msg,
  }));

  return errorResponse(res, 'Validation failed', 400, extractedErrors);
};

// ─── Reusable field rules ────────────────────────────────────────────────────
const nameRule = () =>
  check('name')
    .customSanitizer((val, { req }) => req.body.name || req.body.fullName)
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 80 }).withMessage('Name must be between 2 and 80 characters');

const emailRule = (field = 'email') =>
  check(field)
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail();

const passwordRule = (field = 'password', label = 'Password') =>
  check(field)
    .notEmpty().withMessage(`${label} is required`)
    .isLength({ min: 6 }).withMessage(`${label} must be at least 6 characters`)
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage(
      `${label} must contain at least one uppercase letter, one lowercase letter, and one number`
    );

const phoneRule = () =>
  check('phone')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^\+?[\d\s\-().]{7,20}$/).withMessage('Please provide a valid phone number');

const tokenRule = (field = 'token') =>
  check(field)
    .trim()
    .notEmpty().withMessage('Token is required')
    .isHexadecimal().withMessage('Invalid token format')
    .isLength({ min: 64, max: 64 }).withMessage('Invalid token length');

// ─── Auth Validations ────────────────────────────────────────────────────────

/**
 * POST /api/auth/register/patient
 * Fields: name, email, password, phone (opt), gender (opt), dateOfBirth (opt)
 */
const registerPatientValidation = [
  nameRule(),
  emailRule(),
  passwordRule(),
  phoneRule(),
  check('gender')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['male', 'female', 'other', 'prefer_not_to_say'])
    .withMessage('Gender must be one of: male, female, other, prefer_not_to_say'),
  check('dateOfBirth')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601().withMessage('Date of birth must be a valid date (YYYY-MM-DD)')
    .custom((value) => {
      if (new Date(value) >= new Date()) throw new Error('Date of birth must be in the past');
      return true;
    }),
  validate,
];

/**
 * POST /api/auth/register/doctor
 * Fields: name, email, password, phone, specialty, qualifications, experience, fee
 */
const registerDoctorValidation = [
  nameRule(),
  emailRule(),
  passwordRule(),
  phoneRule(),
  check('specialty')
    .trim()
    .notEmpty().withMessage('Specialty is required')
    .isLength({ max: 100 }).withMessage('Specialty cannot exceed 100 characters'),
  check('qualifications')
    .notEmpty().withMessage('At least one qualification is required')
    .custom((val) => {
      const arr = Array.isArray(val) ? val : [val];
      if (arr.length === 0) throw new Error('At least one qualification is required');
      return true;
    }),
  check('experience')
    .notEmpty().withMessage('Experience is required')
    .isFloat({ min: 0, max: 60 }).withMessage('Experience must be a number between 0 and 60'),
  check('fee')
    .notEmpty().withMessage('Consultation fee is required')
    .isFloat({ min: 0 }).withMessage('Fee must be a non-negative number'),
  validate,
];

/**
 * POST /api/auth/login
 * Shared by all roles.
 */
const loginValidation = [
  emailRule(),
  check('password')
    .notEmpty().withMessage('Password is required'),
  validate,
];

/**
 * General registration (patient or doctor — role field drives which path is taken).
 */
const registerValidation = [
  nameRule(),
  emailRule(),
  passwordRule(),
  phoneRule(),
  check('role')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['patient', 'doctor'])
    .withMessage('Role must be patient or doctor (admin accounts are created by the system)'),
  validate,
];

/**
 * POST /api/auth/forgot-password
 */
const forgotPasswordValidation = [
  emailRule(),
  validate,
];

/**
 * POST /api/auth/reset-password
 */
const resetPasswordValidation = [
  check('token')
    .trim()
    .notEmpty().withMessage('Reset token is required'),
  passwordRule('password', 'New password'),
  check('confirmPassword')
    .notEmpty().withMessage('Please confirm your password')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  validate,
];

/**
 * POST /api/auth/updatepassword (authenticated)
 */
const updatePasswordValidation = [
  check('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  passwordRule('newPassword', 'New password'),
  check('confirmPassword')
    .notEmpty().withMessage('Please confirm your new password')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  validate,
];

/**
 * GET /api/auth/verify-email?token=...  (query param)
 */
const verifyEmailValidation = [
  check('token')
    .trim()
    .notEmpty().withMessage('Verification token is required'),
  validate,
];

// ─── Appointment Validations ─────────────────────────────────────────────────
const createAppointmentValidation = [
  check('doctorId')
    .notEmpty().withMessage('Doctor ID is required')
    .isMongoId().withMessage('Invalid doctor ID format'),
  check('date')
    .notEmpty().withMessage('Date is required')
    .isISO8601().withMessage('Please provide a valid date (YYYY-MM-DD)'),
  check('timeSlot.start')
    .notEmpty().withMessage('Start time is required')
    .matches(/^\d{2}:\d{2}$/).withMessage('Start time must be in HH:MM format'),
  check('timeSlot.end')
    .notEmpty().withMessage('End time is required')
    .matches(/^\d{2}:\d{2}$/).withMessage('End time must be in HH:MM format'),
  validate,
];

// ─── Profile Update Validation ───────────────────────────────────────────────
const updateProfileValidation = [
  check('name')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 80 }).withMessage('Name must be between 2 and 80 characters'),
  emailRule('email').optional({ nullable: true, checkFalsy: true }),
  phoneRule(),
  validate,
];

module.exports = {
  validate,
  registerValidation,
  registerPatientValidation,
  registerDoctorValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  updatePasswordValidation,
  verifyEmailValidation,
  createAppointmentValidation,
  updateProfileValidation,
};

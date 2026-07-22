/**
 * @fileoverview Authentication Routes
 *
 * Base path: /api/auth
 *
 * Public:
 *   POST   /register           — General registration (patient/doctor)
 *   POST   /register/patient   — Explicit patient registration
 *   POST   /register/doctor    — Explicit doctor registration
 *   POST   /login              — Login (all roles)
 *   POST   /admin/login        — Admin-only login
 *   POST   /refresh            — Refresh access token
 *   POST   /forgot-password    — Send password reset email
 *   POST   /reset-password     — Reset password with token
 *   GET    /verify-email       — Verify email with token (?token=...)
 *
 * Protected:
 *   GET    /me                 — Get current user profile
 *   POST   /logout             — Logout (clears session)
 *   PUT    /updatepassword     — Change password (requires current password)
 *   POST   /resend-verification — Resend email verification link
 */

const express = require('express');
const {
  register,
  registerPatient,
  registerDoctor,
  login,
  adminLogin,
  logout,
  refreshToken,
  getMe,
  updatePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
} = require('../controllers/authController');

const { protect } = require('../middleware/auth');
const { authLimiter, forgotPasswordLimiter } = require('../middleware/rateLimiter');
const {
  registerValidation,
  registerPatientValidation,
  registerDoctorValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  updatePasswordValidation,
  verifyEmailValidation,
} = require('../middleware/validate');

const router = express.Router();

// ─── Public Routes ────────────────────────────────────────────────────────────

// Registration
router.post('/register',          authLimiter, registerValidation,        register);
router.post('/register/patient',  authLimiter, registerPatientValidation, registerPatient);
router.post('/register/doctor',   authLimiter, registerDoctorValidation,  registerDoctor);

// Login
router.post('/login',             authLimiter, loginValidation,           login);
router.post('/admin/login',       authLimiter, loginValidation,           adminLogin);

// Token refresh (no auth middleware — uses refresh token cookie/body)
router.post('/refresh',           refreshToken);

// Password flow
router.post('/forgot-password',   forgotPasswordLimiter, forgotPasswordValidation,  forgotPassword);
router.post('/reset-password',    resetPasswordValidation,   resetPassword);

// Email verification (token in query string)
router.get('/verify-email',       verifyEmailValidation,     verifyEmail);

// ─── Protected Routes ─────────────────────────────────────────────────────────

router.use(protect); // Apply auth to all routes below this line

router.get('/me',                 getMe);
router.post('/logout',            logout);
router.put('/updatepassword',     updatePasswordValidation,  updatePassword);
router.post('/resend-verification', resendVerification);

module.exports = router;

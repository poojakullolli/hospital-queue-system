/**
 * @fileoverview Authentication Controller
 *
 * Endpoints:
 *   POST   /api/auth/register         — Patient / Doctor self-registration
 *   POST   /api/auth/register/patient — Explicit patient registration
 *   POST   /api/auth/register/doctor  — Doctor registration (creates Doctor profile)
 *   POST   /api/auth/login            — Login (all roles)
 *   POST   /api/auth/admin/login      — Admin-only login
 *   POST   /api/auth/logout           — Invalidate refresh token
 *   POST   /api/auth/refresh          — Issue new access token via refresh token
 *   GET    /api/auth/me               — Get current user
 *   PUT    /api/auth/updatepassword   — Change password (authenticated)
 *   POST   /api/auth/forgot-password  — Request password reset email
 *   POST   /api/auth/reset-password   — Reset password using token
 *   GET    /api/auth/verify-email     — Verify email address using token
 *   POST   /api/auth/resend-verification — Resend email verification link
 */

const crypto = require('crypto');
const User   = require('../models/User');
const Doctor = require('../models/Doctor');
const asyncHandler = require('../utils/asyncHandler');
const AppError     = require('../middleware/AppError');
const { successResponse } = require('../utils/apiResponse');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateSecureToken,
  hashToken,
} = require('../utils/jwtUtils');
const {
  sendWelcomeEmail,
  sendEmailVerification,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
} = require('../services/emailService');

// ─── Helper: build token response ─────────────────────────────────────────────
/**
 * Generate access + refresh tokens, persist refresh token to DB,
 * set HttpOnly cookie, and return JSON response.
 *
 * @param {Object} user        - Mongoose User document
 * @param {number} statusCode  - HTTP status to respond with
 * @param {Object} res         - Express response object
 */
const sendTokenResponse = async (user, statusCode, res) => {
  const payload      = { id: user._id, role: user.role };
  const accessToken  = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Persist refresh token to DB (single active session — revokes old sessions)
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  // HttpOnly cookie options
  const cookieOptions = {
    expires:  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    sameSite: 'lax',
  };
  if (process.env.NODE_ENV === 'production') {
    cookieOptions.secure = true;
  }

  res
    .status(statusCode)
    .cookie('refreshToken', refreshToken, cookieOptions)
    .json({
      success: true,
      accessToken,
      user: {
        id:              user._id,
        name:            user.name,
        email:           user.email,
        role:            user.role,
        avatar:          user.avatar,
        isEmailVerified: user.isEmailVerified,
      },
    });
};

// ─── POST /api/auth/register ──────────────────────────────────────────────────
/**
 * General registration endpoint. Role defaults to 'patient'.
 * Doctors get an empty Doctor profile created automatically.
 * Admin registration is blocked here (admins are seeded or created by existing admins).
 */
exports.register = asyncHandler(async (req, res, next) => {
  const { name, email, password, role = 'patient', phone, specialty, qualifications, experience, fee } = req.body;

  // Prevent self-registration as admin
  if (role === 'admin') {
    return next(new AppError('Admin accounts cannot be self-registered', 403));
  }

  // Check email uniqueness
  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    return next(new AppError('An account with this email already exists', 409));
  }

  // Generate email verification token
  const { rawToken, hashedToken } = generateSecureToken();
  const verifyExpire = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Create user
  const user = await User.create({
    name:                   name.trim(),
    email:                  email.toLowerCase().trim(),
    password,
    role,
    phone:                  phone?.trim(),
    emailVerificationToken: hashedToken,
    // Store expiry in resetPasswordExpire field as a temp measure — or add dedicated field
  });

  // Create Doctor profile if role === 'doctor'
  if (role === 'doctor') {
    await Doctor.create({
      userId:              user._id,
      specialty:           specialty || 'General Medicine',
      qualifications:      Array.isArray(qualifications) ? qualifications : (qualifications ? [qualifications] : ['MBBS']),
      experience:          parseFloat(experience) || 0,
      fee:                 parseFloat(fee) || 0,
      workingHours: {
        start: '09:00',
        end:   '17:00',
        days:  ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      },
    });
  }

  // Send emails asynchronously (non-blocking)
  sendEmailVerification(user, rawToken).catch((err) =>
    console.error('❌ Failed to send verification email:', err.message)
  );
  sendWelcomeEmail(user).catch((err) =>
    console.error('❌ Failed to send welcome email:', err.message)
  );

  sendTokenResponse(user, 201, res);
});

// ─── POST /api/auth/register/patient ─────────────────────────────────────────
/**
 * Explicit patient registration — same as /register with role forced to 'patient'.
 */
exports.registerPatient = asyncHandler(async (req, res, next) => {
  req.body.role = 'patient';
  return exports.register(req, res, next);
});

// ─── POST /api/auth/register/doctor ──────────────────────────────────────────
/**
 * Doctor registration — same as /register with role forced to 'doctor'.
 * Requires specialty, qualifications, experience, fee in body.
 */
exports.registerDoctor = asyncHandler(async (req, res, next) => {
  req.body.role = 'doctor';
  return exports.register(req, res, next);
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
/**
 * Login for all roles (patient, doctor, admin).
 * - Verifies email + password
 * - Updates lastLogin timestamp
 * - Issues access token + refresh token
 */
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide an email and password', 400));
  }

  // findByEmailWithPassword includes password + refreshToken (both select:false)
  const user = await User.findByEmailWithPassword(email.toLowerCase().trim());

  if (!user) {
    return next(new AppError('Invalid credentials', 401));
  }

  if (!user.isActive) {
    return next(new AppError('Your account has been deactivated. Please contact support.', 403));
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return next(new AppError('Invalid credentials', 401));
  }

  // Stamp last login
  user.lastLogin = new Date();
  // token save handled in sendTokenResponse

  sendTokenResponse(user, 200, res);
});

// ─── POST /api/auth/admin/login ───────────────────────────────────────────────
/**
 * Admin-only login endpoint. Identical to /login but rejects non-admin users
 * with a 403 before issuing any tokens.
 */
exports.adminLogin = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide an email and password', 400));
  }

  const user = await User.findByEmailWithPassword(email.toLowerCase().trim());

  if (!user) {
    return next(new AppError('Invalid credentials', 401));
  }

  // Role gate — only allow admin
  if (user.role !== 'admin') {
    return next(new AppError('Access restricted to administrators only', 403));
  }

  if (!user.isActive) {
    return next(new AppError('Account deactivated', 403));
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return next(new AppError('Invalid credentials', 401));
  }

  user.lastLogin = new Date();
  sendTokenResponse(user, 200, res);
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
/**
 * Logout — clear refresh token from DB and expire the cookie.
 * Requires auth (protect middleware). Access token expires naturally.
 */
exports.logout = asyncHandler(async (req, res, next) => {
  if (req.user) {
    req.user.refreshToken = undefined;
    await req.user.save({ validateBeforeSave: false });
  }

  res.cookie('refreshToken', 'none', {
    expires:  new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  successResponse(res, null, 'Logged out successfully');
});

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────
/**
 * Issue a new access token using the refresh token.
 * Refresh token is read from HttpOnly cookie or request body.
 * Implements refresh-token rotation: issues a new refresh token each time.
 */
exports.refreshToken = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!token) {
    return next(new AppError('Refresh token not provided', 401));
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch (err) {
    return next(new AppError('Invalid or expired refresh token. Please log in again.', 401));
  }

  // Find user and verify stored token matches (single active session)
  const user = await User.findById(decoded.id).select('+refreshToken');

  if (!user || user.refreshToken !== token) {
    return next(new AppError('Session invalidated. Please log in again.', 401));
  }

  if (!user.isActive) {
    return next(new AppError('Account deactivated', 403));
  }

  // Rotate: generate new access + refresh token pair
  const payload      = { id: user._id, role: user.role };
  const accessToken  = generateAccessToken(payload);
  const newRefresh   = generateRefreshToken(payload);

  user.refreshToken = newRefresh;
  await user.save({ validateBeforeSave: false });

  const cookieOptions = {
    expires:  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    sameSite: 'lax',
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res
    .cookie('refreshToken', newRefresh, cookieOptions)
    .json({
      success:      true,
      accessToken,
    });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
/**
 * Get the currently authenticated user's profile.
 * Populates the Doctor profile for role='doctor'.
 */
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  let data = { user };

  if (user.role === 'doctor') {
    const doctorProfile = await Doctor.findOne({ userId: user._id })
      .populate('departmentId', 'name slug icon');
    data = { user, doctorProfile };
  }

  successResponse(res, data, 'Profile retrieved successfully');
});

// ─── PUT /api/auth/updatepassword ─────────────────────────────────────────────
/**
 * Change password for the currently authenticated user.
 * Requires the current password for verification.
 * Sends a security notification email after success.
 */
exports.updatePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id).select('+password');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return next(new AppError('Current password is incorrect', 401));
  }

  // Ensure new password differs from current
  const isSame = await user.comparePassword(newPassword);
  if (isSame) {
    return next(new AppError('New password cannot be the same as the current password', 400));
  }

  user.password = newPassword;
  await user.save();

  // Security notification (non-blocking)
  sendPasswordChangedEmail(user).catch((err) =>
    console.error('❌ Failed to send password-changed email:', err.message)
  );

  sendTokenResponse(user, 200, res);
});

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────
/**
 * Request a password reset email.
 * Generates a secure token, stores its hash in the DB, and sends the raw token
 * to the user's email. Always returns 200 to prevent email enumeration.
 */
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email: email.toLowerCase().trim(), isActive: true });

  // Always respond with 200 to prevent email enumeration attacks
  if (!user) {
    return successResponse(
      res,
      null,
      'If an account with that email exists, a reset link has been sent.'
    );
  }

  // Generate reset token
  const { rawToken, hashedToken } = generateSecureToken();

  user.resetPasswordToken  = hashedToken;
  user.resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  await user.save({ validateBeforeSave: false });

  // Send reset email (non-blocking failure)
  const emailSent = await sendPasswordResetEmail(user, rawToken);

  if (!emailSent) {
    // Roll back token so user can retry
    user.resetPasswordToken  = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new AppError('Failed to send password reset email. Please try again later.', 500));
  }

  successResponse(
    res,
    null,
    'If an account with that email exists, a password reset link has been sent.'
  );
});

// ─── POST /api/auth/reset-password ───────────────────────────────────────────
/**
 * Reset password using the token received by email.
 * Token is hashed and compared against the stored hash.
 * Clears the token after successful reset and invalidates all sessions.
 */
exports.resetPassword = asyncHandler(async (req, res, next) => {
  const { token, password } = req.body;

  if (!token) {
    return next(new AppError('Reset token is required', 400));
  }

  // Hash the incoming token to compare with stored hash
  const hashedToken = hashToken(token);

  // Find user with valid (non-expired) token
  const user = await User.findOne({
    resetPasswordToken:  hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  }).select('+password');

  if (!user) {
    return next(new AppError('Invalid or expired password reset token. Please request a new one.', 400));
  }

  // Ensure the new password is different from the current one
  const isSame = await user.comparePassword(password);
  if (isSame) {
    return next(new AppError('New password must be different from your current password', 400));
  }

  // Update password and clear reset fields + all sessions
  user.password            = password;
  user.resetPasswordToken  = undefined;
  user.resetPasswordExpire = undefined;
  user.refreshToken        = undefined; // invalidate all active sessions
  await user.save();

  // Security notification
  sendPasswordChangedEmail(user).catch((err) =>
    console.error('❌ Failed to send password-changed email:', err.message)
  );

  sendTokenResponse(user, 200, res);
});

// ─── GET /api/auth/verify-email ───────────────────────────────────────────────
/**
 * Verify email address using the token sent during registration.
 * Token param is in query string: ?token=<raw_token>
 * Always hashes the token before DB lookup.
 */
exports.verifyEmail = asyncHandler(async (req, res, next) => {
  const { token } = req.query;

  if (!token) {
    return next(new AppError('Verification token is required', 400));
  }

  const hashedToken = hashToken(token);

  const user = await User.findOne({ emailVerificationToken: hashedToken });

  if (!user) {
    return next(new AppError('Invalid or expired verification link. Please request a new one.', 400));
  }

  if (user.isEmailVerified) {
    return successResponse(res, null, 'Email already verified. You can log in.');
  }

  // Mark verified and clear the token
  user.isEmailVerified       = true;
  user.emailVerificationToken = undefined;
  await user.save({ validateBeforeSave: false });

  successResponse(res, { isEmailVerified: true }, 'Email verified successfully! You can now log in.');
});

// ─── POST /api/auth/resend-verification ──────────────────────────────────────
/**
 * Resend the email verification link to the currently authenticated user.
 * Returns 400 if already verified. Rate-limiting should be applied externally.
 */
exports.resendVerification = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  if (user.isEmailVerified) {
    return next(new AppError('Email is already verified', 400));
  }

  const { rawToken, hashedToken } = generateSecureToken();

  user.emailVerificationToken = hashedToken;
  await user.save({ validateBeforeSave: false });

  const emailSent = await sendEmailVerification(user, rawToken);

  if (!emailSent) {
    return next(new AppError('Failed to send verification email. Please try again later.', 500));
  }

  successResponse(res, null, 'Verification email resent. Please check your inbox.');
});

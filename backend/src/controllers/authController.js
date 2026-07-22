const User = require('../models/User');
const Doctor = require('../models/Doctor');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../middleware/AppError');
const { successResponse } = require('../utils/apiResponse');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwtUtils');
const { sendWelcomeEmail } = require('../services/emailService');

// Helper to generate tokens and respond
const sendTokenResponse = async (user, statusCode, res) => {
  const payload = { id: user._id, role: user.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  const options = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res
    .status(statusCode)
    .cookie('refreshToken', refreshToken, options)
    .json({
      success: true,
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
};

exports.register = asyncHandler(async (req, res, next) => {
  const { name, email, password, role, phone } = req.body;

  const userExists = await User.findOne({ email });
  if (userExists) {
    return next(new AppError('Email already in use', 400));
  }

  const user = await User.create({
    name,
    email,
    password,
    role: role || 'patient',
    phone,
  });

  // If role is doctor, create empty doctor profile
  if (user.role === 'doctor') {
    await Doctor.create({
      userId: user._id,
      specialty: 'General',
      qualifications: ['MBBS'],
      experience: 0,
      fee: 0,
    });
  }

  // Send welcome email async
  sendWelcomeEmail(user).catch(err => console.error('Error sending welcome email:', err));

  sendTokenResponse(user, 201, res);
});

exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide an email and password', 400));
  }

  const user = await User.findOne({ email }).select('+password');
  if (!user || !user.isActive) {
    return next(new AppError('Invalid credentials or account deactivated', 401));
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return next(new AppError('Invalid credentials', 401));
  }

  sendTokenResponse(user, 200, res);
});

exports.logout = asyncHandler(async (req, res, next) => {
  if (req.user) {
    req.user.refreshToken = undefined;
    await req.user.save({ validateBeforeSave: false });
  }

  res.cookie('refreshToken', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  successResponse(res, null, 'Logged out successfully');
});

exports.refreshToken = asyncHandler(async (req, res, next) => {
  const token = req.cookies.refreshToken || req.body.refreshToken;

  if (!token) {
    return next(new AppError('No refresh token provided', 401));
  }

  try {
    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== token) {
      return next(new AppError('Invalid refresh token', 401));
    }

    const payload = { id: user._id, role: user.role };
    const accessToken = generateAccessToken(payload);

    res.status(200).json({
      success: true,
      accessToken,
    });
  } catch (err) {
    return next(new AppError('Invalid or expired refresh token', 401));
  }
});

exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  
  let data = { user };
  
  if (user.role === 'doctor') {
    const doctorProfile = await Doctor.findOne({ userId: user._id });
    data = { user, doctorProfile };
  }

  successResponse(res, data);
});

exports.updatePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id).select('+password');
  
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return next(new AppError('Current password is incorrect', 401));
  }

  user.password = newPassword;
  await user.save();

  sendTokenResponse(user, 200, res);
});

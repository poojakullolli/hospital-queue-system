const { verifyAccessToken } = require('../utils/jwtUtils');
const User = require('../models/User');
const AppError = require('./AppError');
const asyncHandler = require('../utils/asyncHandler');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('Not authorized to access this route', 401));
  }

  try {
    const decoded = verifyAccessToken(token);

    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      return next(new AppError('User no longer exists', 401));
    }
    
    if (!req.user.isActive) {
      return next(new AppError('User account is deactivated', 403));
    }

    next();
  } catch (err) {
    return next(new AppError('Not authorized to access this route', 401));
  }
});

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `User role ${req.user.role} is not authorized to access this route`,
          403
        )
      );
    }
    next();
  };
};

const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = verifyAccessToken(token);
      req.user = await User.findById(decoded.id).select('-password');
    } catch (err) {
      // ignore
    }
  }

  next();
});

module.exports = { protect, authorize, optionalAuth };

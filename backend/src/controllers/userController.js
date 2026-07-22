const User = require('../models/User');
const Doctor = require('../models/Doctor');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../middleware/AppError');
const { successResponse } = require('../utils/apiResponse');

exports.getProfile = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  
  let data = { user };
  
  if (user.role === 'doctor') {
    const doctorProfile = await Doctor.findOne({ userId: user._id });
    data = { user, doctorProfile };
  }

  successResponse(res, data);
});

exports.updateProfile = asyncHandler(async (req, res, next) => {
  const { name, email, phone } = req.body;
  
  // Prevent updating password through this route
  if (req.body.password) {
    return next(new AppError('This route is not for password updates', 400));
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    { name, email, phone },
    { new: true, runValidators: true }
  );

  successResponse(res, updatedUser);
});

exports.uploadAvatar = asyncHandler(async (req, res, next) => {
  // Assuming a middleware like multer has processed the upload and attached the file path
  if (!req.file) {
    return next(new AppError('Please upload a file', 400));
  }

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { avatar: req.file.path }, // Adjust based on your file storage setup
    { new: true }
  );

  successResponse(res, user);
});

// Admin routes
exports.getAllUsers = asyncHandler(async (req, res, next) => {
  const users = await User.find();
  successResponse(res, users);
});

exports.getUserById = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  
  let data = { user };
  
  if (user.role === 'doctor') {
    const doctorProfile = await Doctor.findOne({ userId: user._id });
    data = { user, doctorProfile };
  }

  successResponse(res, data);
});

exports.deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  user.isActive = false;
  await user.save();

  successResponse(res, null, 'User deleted (deactivated) successfully');
});

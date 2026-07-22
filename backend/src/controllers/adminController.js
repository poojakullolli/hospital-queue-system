const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const Department = require('../models/Department');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../middleware/AppError');
const { successResponse } = require('../utils/apiResponse');

exports.getDashboardStats = asyncHandler(async (req, res, next) => {
  const totalUsers = await User.countDocuments();
  const totalPatients = await User.countDocuments({ role: 'patient' });
  const totalDoctors = await Doctor.countDocuments();
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const todaysAppointments = await Appointment.countDocuments({
    date: { $gte: today, $lte: endOfDay }
  });
  
  const totalAppointments = await Appointment.countDocuments();
  const completedAppointments = await Appointment.countDocuments({ status: 'completed' });
  
  // Calculate total revenue from completed appointments
  const revenueData = await Appointment.aggregate([
    { $match: { status: 'completed' } },
    { $group: { _id: null, totalRevenue: { $sum: '$consultationFee' } } }
  ]);
  
  const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

  successResponse(res, {
    totalUsers,
    totalPatients,
    totalDoctors,
    todaysAppointments,
    totalAppointments,
    completedAppointments,
    totalRevenue
  });
});

exports.getAllUsers = asyncHandler(async (req, res, next) => {
  const { role, page = 1, limit = 20 } = req.query;
  const query = {};
  if (role) query.role = role;

  const users = await User.find(query)
    .select('-password')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort('-createdAt');

  const count = await User.countDocuments(query);

  res.status(200).json({
    success: true,
    count,
    totalPages: Math.ceil(count / limit),
    currentPage: page,
    data: users,
  });
});

exports.updateUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  }).select('-password');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  successResponse(res, user);
});

exports.deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  user.isActive = false;
  await user.save();

  successResponse(res, null, 'User deactivated successfully');
});

// Departments
exports.getDepartments = asyncHandler(async (req, res, next) => {
  const departments = await Department.find().populate('headDoctorId');
  successResponse(res, departments);
});

exports.createDepartment = asyncHandler(async (req, res, next) => {
  const department = await Department.create(req.body);
  successResponse(res, department, 'Department created successfully', 201);
});

exports.updateDepartment = asyncHandler(async (req, res, next) => {
  const department = await Department.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!department) return next(new AppError('Department not found', 404));

  successResponse(res, department);
});

exports.deleteDepartment = asyncHandler(async (req, res, next) => {
  const department = await Department.findById(req.params.id);
  if (!department) return next(new AppError('Department not found', 404));
  
  department.isActive = false;
  await department.save();
  
  successResponse(res, null, 'Department deactivated');
});

exports.getSystemAnalytics = asyncHandler(async (req, res, next) => {
  // Simple example: appointments by status
  const appointmentsByStatus = await Appointment.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  successResponse(res, {
    appointmentsByStatus
  });
});

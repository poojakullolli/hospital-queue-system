const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../middleware/AppError');
const { successResponse } = require('../utils/apiResponse');

exports.getAllDoctors = asyncHandler(async (req, res, next) => {
  const { specialty, isAvailable, sort, page = 1, limit = 10 } = req.query;
  
  const query = {};
  if (specialty) query.specialty = specialty;
  if (isAvailable !== undefined) query.isAvailable = isAvailable === 'true';

  const doctors = await Doctor.find(query)
    .populate('userId', 'name email avatar phone')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort(sort ? sort : '-rating');

  const count = await Doctor.countDocuments(query);

  res.status(200).json({
    success: true,
    count,
    totalPages: Math.ceil(count / limit),
    currentPage: page,
    data: doctors,
  });
});

exports.getDoctorById = asyncHandler(async (req, res, next) => {
  const doctor = await Doctor.findById(req.params.id).populate('userId', 'name email avatar phone');
  
  if (!doctor) {
    return next(new AppError('Doctor not found', 404));
  }
  
  successResponse(res, doctor);
});

exports.getAvailableSlots = asyncHandler(async (req, res, next) => {
  const { id: doctorId } = req.params;
  const { date } = req.query;

  if (!date) {
    return next(new AppError('Date is required to get available slots', 400));
  }

  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    return next(new AppError('Doctor not found', 404));
  }

  const targetDate = new Date(date);
  const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][targetDate.getDay()];

  if (!doctor.workingHours.days.includes(dayOfWeek)) {
    return successResponse(res, [], 'Doctor does not work on this day');
  }

  // Parse working hours
  const startHours = parseInt(doctor.workingHours.start.split(':')[0]);
  const startMins = parseInt(doctor.workingHours.start.split(':')[1]);
  const endHours = parseInt(doctor.workingHours.end.split(':')[0]);
  const endMins = parseInt(doctor.workingHours.end.split(':')[1]);
  
  const startTime = startHours * 60 + startMins;
  const endTime = endHours * 60 + endMins;
  const duration = doctor.consultationDuration;

  // Generate all possible slots
  const allSlots = [];
  for (let time = startTime; time < endTime; time += duration) {
    const hStart = Math.floor(time / 60).toString().padStart(2, '0');
    const mStart = (time % 60).toString().padStart(2, '0');
    const hEnd = Math.floor((time + duration) / 60).toString().padStart(2, '0');
    const mEnd = ((time + duration) % 60).toString().padStart(2, '0');
    
    allSlots.push({
      start: `${hStart}:${mStart}`,
      end: `${hEnd}:${mEnd}`
    });
  }

  // Get booked slots for the day
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const bookedAppointments = await Appointment.find({
    doctorId,
    date: { $gte: startOfDay, $lte: endOfDay },
    status: { $nin: ['cancelled'] }
  });

  const bookedSlots = bookedAppointments.map(app => app.timeSlot.start);

  // Filter out booked slots
  const availableSlots = allSlots.filter(slot => !bookedSlots.includes(slot.start));

  successResponse(res, availableSlots);
});

exports.updateDoctorProfile = asyncHandler(async (req, res, next) => {
  const doctor = await Doctor.findOne({ userId: req.user.id });
  
  if (!doctor) {
    return next(new AppError('Doctor profile not found', 404));
  }

  const updatedDoctor = await Doctor.findByIdAndUpdate(
    doctor._id,
    req.body,
    { new: true, runValidators: true }
  ).populate('userId', 'name email avatar phone');

  successResponse(res, updatedDoctor);
});

exports.setAvailability = asyncHandler(async (req, res, next) => {
  const { isAvailable } = req.body;
  
  const doctor = await Doctor.findOneAndUpdate(
    { userId: req.user.id },
    { isAvailable },
    { new: true }
  );

  if (!doctor) {
    return next(new AppError('Doctor profile not found', 404));
  }

  successResponse(res, doctor, `Availability set to ${isAvailable}`);
});

exports.toggleBreak = asyncHandler(async (req, res, next) => {
  const doctor = await Doctor.findOne({ userId: req.user.id });
  
  if (!doctor) {
    return next(new AppError('Doctor profile not found', 404));
  }

  doctor.isOnBreak = !doctor.isOnBreak;
  await doctor.save();

  successResponse(res, doctor, `Break status toggled to ${doctor.isOnBreak}`);
});

exports.getDoctorStats = asyncHandler(async (req, res, next) => {
  const doctor = await Doctor.findOne({ userId: req.user.id });
  
  if (!doctor) {
    return next(new AppError('Doctor profile not found', 404));
  }

  const totalAppointments = await Appointment.countDocuments({ doctorId: doctor._id });
  const completedAppointments = await Appointment.countDocuments({ doctorId: doctor._id, status: 'completed' });
  const upcomingAppointments = await Appointment.countDocuments({ 
    doctorId: doctor._id, 
    status: { $in: ['pending', 'confirmed'] },
    date: { $gte: new Date() }
  });

  successResponse(res, {
    totalAppointments,
    completedAppointments,
    upcomingAppointments,
    rating: doctor.rating
  });
});

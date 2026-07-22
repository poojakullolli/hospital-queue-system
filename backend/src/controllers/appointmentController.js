const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../middleware/AppError');
const { successResponse } = require('../utils/apiResponse');
const generateQueueNumber = require('../utils/generateQueueNumber');
const queueService = require('../services/queueService');
const emailService = require('../services/emailService');
const socketConfig = require('../config/socket'); // Assuming we can get io instance from here

exports.bookAppointment = asyncHandler(async (req, res, next) => {
  const { doctorId, date, timeSlot, patientNotes, consultationFee } = req.body;
  const patientId = req.user.id;

  const doctor = await Doctor.findById(doctorId).populate('userId');
  if (!doctor) {
    return next(new AppError('Doctor not found', 404));
  }

  // Check if slot is already booked
  const targetDate = new Date(date);
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const existingBooking = await Appointment.findOne({
    doctorId,
    date: { $gte: startOfDay, $lte: endOfDay },
    'timeSlot.start': timeSlot.start,
    status: { $nin: ['cancelled'] }
  });

  if (existingBooking) {
    return next(new AppError('This time slot is already booked', 400));
  }

  // Generate Queue Number
  const queueNumber = await generateQueueNumber(doctorId, targetDate);

  const appointment = await Appointment.create({
    patientId,
    doctorId,
    date: targetDate,
    timeSlot,
    queueNumber,
    patientNotes,
    consultationFee: consultationFee || doctor.fee,
    status: 'confirmed'
  });

  // Add to Queue
  await queueService.addToQueue(doctorId, appointment._id, targetDate);

  // Notification
  await Notification.create({
    userId: patientId,
    title: 'Appointment Confirmed',
    message: `Your appointment with Dr. ${doctor.userId.name} on ${targetDate.toLocaleDateString()} is confirmed. Queue number: ${queueNumber}.`,
    type: 'appointment-booked',
    appointmentId: appointment._id
  });

  // Send Email
  const patient = await User.findById(patientId);
  emailService.sendAppointmentConfirmation(patient, doctor, appointment).catch(err => console.error(err));

  successResponse(res, appointment, 'Appointment booked successfully', 201);
});

exports.getMyAppointments = asyncHandler(async (req, res, next) => {
  const appointments = await Appointment.find({ patientId: req.user.id })
    .populate({
      path: 'doctorId',
      populate: { path: 'userId', select: 'name email avatar phone' }
    })
    .sort({ date: -1, 'timeSlot.start': -1 });

  successResponse(res, appointments);
});

exports.getAppointmentById = asyncHandler(async (req, res, next) => {
  const appointment = await Appointment.findById(req.params.id)
    .populate('patientId', 'name email phone avatar')
    .populate({
      path: 'doctorId',
      populate: { path: 'userId', select: 'name email avatar phone' }
    });

  if (!appointment) {
    return next(new AppError('Appointment not found', 404));
  }

  // Verify ownership
  if (req.user.role === 'patient' && appointment.patientId._id.toString() !== req.user.id) {
    return next(new AppError('Not authorized to access this appointment', 403));
  }

  successResponse(res, appointment);
});

exports.updateAppointmentStatus = asyncHandler(async (req, res, next) => {
  const { status, notes } = req.body;
  const appointmentId = req.params.id;

  const appointment = await Appointment.findById(appointmentId)
    .populate('patientId')
    .populate({
      path: 'doctorId',
      populate: { path: 'userId' }
    });

  if (!appointment) {
    return next(new AppError('Appointment not found', 404));
  }

  // Doctor ownership check
  if (req.user.role === 'doctor') {
    const doctorProfile = await Doctor.findOne({ userId: req.user.id });
    if (appointment.doctorId._id.toString() !== doctorProfile._id.toString()) {
      return next(new AppError('Not authorized to update this appointment', 403));
    }
  }

  appointment.status = status;
  if (notes) appointment.notes = notes;
  await appointment.save();

  // If status is in-progress, send email and emit socket
  if (status === 'in-progress') {
    emailService.sendQueueCallNotification(appointment.patientId, appointment.doctorId, appointment).catch(err => console.error(err));
    
    await Notification.create({
      userId: appointment.patientId._id,
      title: "It's your turn!",
      message: `Dr. ${appointment.doctorId.userId.name} is ready to see you.`,
      type: 'appointment-called',
      appointmentId: appointment._id
    });
    
    // Broadcast via socket if available
    const io = socketConfig.getIO();
    if (io) {
      io.to(`patient_${appointment.patientId._id}`).emit('appointment-called', {
        appointmentId: appointment._id,
        doctorId: appointment.doctorId._id,
        queueNumber: appointment.queueNumber
      });
    }
  }

  successResponse(res, appointment, `Appointment status updated to ${status}`);
});

exports.cancelAppointment = asyncHandler(async (req, res, next) => {
  const { reason } = req.body;
  const appointment = await Appointment.findById(req.params.id)
    .populate('patientId')
    .populate({
      path: 'doctorId',
      populate: { path: 'userId' }
    });

  if (!appointment) {
    return next(new AppError('Appointment not found', 404));
  }

  // Ownership check
  if (req.user.role === 'patient' && appointment.patientId._id.toString() !== req.user.id) {
    return next(new AppError('Not authorized to cancel this appointment', 403));
  }

  appointment.status = 'cancelled';
  appointment.cancellationReason = reason;
  await appointment.save();

  emailService.sendAppointmentCancellation(appointment.patientId, appointment.doctorId, appointment, reason).catch(err => console.error(err));

  successResponse(res, appointment, 'Appointment cancelled successfully');
});

exports.getDoctorAppointments = asyncHandler(async (req, res, next) => {
  const doctorProfile = await Doctor.findOne({ userId: req.user.id });
  if (!doctorProfile) {
    return next(new AppError('Doctor profile not found', 404));
  }

  const appointments = await Appointment.find({ doctorId: doctorProfile._id })
    .populate('patientId', 'name email phone avatar')
    .sort({ date: -1, 'timeSlot.start': 1 });

  successResponse(res, appointments);
});

exports.getAppointmentsByDate = asyncHandler(async (req, res, next) => {
  const { date } = req.query;
  if (!date) return next(new AppError('Date is required', 400));

  let doctorId;
  if (req.user.role === 'doctor') {
    const doctorProfile = await Doctor.findOne({ userId: req.user.id });
    doctorId = doctorProfile._id;
  } else {
    return next(new AppError('Only doctors can access this route', 403));
  }

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const appointments = await Appointment.find({
    doctorId,
    date: { $gte: startOfDay, $lte: endOfDay }
  })
    .populate('patientId', 'name email phone avatar')
    .sort({ 'timeSlot.start': 1 });

  successResponse(res, appointments);
});

const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const Notification = require('../models/Notification');
const queueService = require('../services/queueService');
const emailService = require('../services/emailService');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../middleware/AppError');
const { successResponse } = require('../utils/apiResponse');
const socketConfig = require('../config/socket');

exports.getQueue = asyncHandler(async (req, res, next) => {
  const { doctorId } = req.params;
  const date = req.query.date || new Date();

  const queue = await queueService.getQueueStatus(doctorId, date);
  
  if (!queue) {
    return successResponse(res, null, 'No queue found for this date');
  }

  successResponse(res, queue);
});

exports.getQueuePosition = asyncHandler(async (req, res, next) => {
  const { doctorId, appointmentId } = req.params;
  const date = req.query.date || new Date();

  const status = await queueService.getQueuePosition(doctorId, appointmentId, date);
  successResponse(res, status);
});

exports.advanceQueue = asyncHandler(async (req, res, next) => {
  const { doctorId } = req.params;
  const date = req.query.date || new Date();

  // Verify doctor ownership
  if (req.user.role === 'doctor') {
    const doctor = await Doctor.findOne({ userId: req.user.id });
    if (doctor._id.toString() !== doctorId) {
      return next(new AppError('Not authorized to manage this queue', 403));
    }
  }

  const queue = await queueService.advanceQueue(doctorId, date);

  // If there's a new current serving, send notifications
  if (queue.currentServing) {
    const appointment = await Appointment.findById(queue.currentServing)
      .populate('patientId')
      .populate({ path: 'doctorId', populate: { path: 'userId' } });

    if (appointment) {
      // Send Email
      emailService.sendQueueCallNotification(appointment.patientId, appointment.doctorId, appointment).catch(err => console.error(err));

      // Create Notification
      await Notification.create({
        userId: appointment.patientId._id,
        title: "It's your turn!",
        message: `Dr. ${appointment.doctorId.userId.name} is ready to see you. Queue number: ${appointment.queueNumber}`,
        type: 'appointment-called',
        appointmentId: appointment._id
      });

      // Broadcast via socket
      const io = socketConfig.getIO();
      if (io) {
        io.to(`doctor_${doctorId}`).emit('queue-updated', { queue });
        io.to(`patient_${appointment.patientId._id}`).emit('appointment-called', {
          appointmentId: appointment._id,
          queueNumber: appointment.queueNumber
        });
        io.emit(`queue-board-${doctorId}`, {
          currentNumber: queue.currentNumber,
          totalInQueue: queue.totalInQueue
        });
      }
    }
  } else {
    // Queue ended
    const io = socketConfig.getIO();
    if (io) {
      io.to(`doctor_${doctorId}`).emit('queue-updated', { queue });
      io.emit(`queue-board-${doctorId}`, {
        currentNumber: '-',
        totalInQueue: 0
      });
    }
  }

  successResponse(res, queue, 'Queue advanced successfully');
});

exports.pauseQueue = asyncHandler(async (req, res, next) => {
  const { doctorId } = req.params;
  const { reason } = req.body;
  const date = req.query.date || new Date();

  const queue = await queueService.getOrCreateQueue(doctorId, date);
  queue.status = 'paused';
  queue.pauseReason = reason || 'Doctor on break';
  await queue.save();

  const io = socketConfig.getIO();
  if (io) {
    io.to(`doctor_${doctorId}`).emit('queue-updated', { queue });
    io.emit(`queue-board-${doctorId}`, {
      status: 'paused',
      reason: queue.pauseReason
    });
  }

  successResponse(res, queue, 'Queue paused');
});

exports.resumeQueue = asyncHandler(async (req, res, next) => {
  const { doctorId } = req.params;
  const date = req.query.date || new Date();

  const queue = await queueService.getOrCreateQueue(doctorId, date);
  queue.status = 'active';
  queue.pauseReason = undefined;
  await queue.save();

  const io = socketConfig.getIO();
  if (io) {
    io.to(`doctor_${doctorId}`).emit('queue-updated', { queue });
    io.emit(`queue-board-${doctorId}`, {
      status: 'active',
      currentNumber: queue.currentNumber
    });
  }

  successResponse(res, queue, 'Queue resumed');
});

exports.getQueueBoard = asyncHandler(async (req, res, next) => {
  const { doctorId } = req.params;
  const date = req.query.date || new Date();

  const queue = await queueService.getQueueStatus(doctorId, date);
  
  if (!queue) {
    return successResponse(res, {
      currentNumber: '-',
      totalInQueue: 0,
      status: 'inactive'
    });
  }

  const doctor = await Doctor.findById(doctorId).populate('userId', 'name');

  successResponse(res, {
    doctorName: doctor.userId.name,
    currentNumber: queue.currentNumber || '-',
    totalInQueue: queue.totalInQueue,
    status: queue.status,
    pauseReason: queue.pauseReason
  });
});

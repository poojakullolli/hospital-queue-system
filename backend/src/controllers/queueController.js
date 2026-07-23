/**
 * @fileoverview Queue Controller — handles HTTP API endpoints for Smart Queue Engine.
 * Emits real-time Socket.IO broadcasts, FCM push notifications, & creates in-app notifications.
 */

const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const Notification = require('../models/Notification');
const queueService = require('../services/queueService');
const emailService = require('../services/emailService');
const fcmService = require('../services/fcmService');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../middleware/AppError');
const { successResponse } = require('../utils/apiResponse');
const socketConfig = require('../config/socket');

exports.getQueue = asyncHandler(async (req, res, next) => {
  const { doctorId } = req.params;
  const date = req.query.date || new Date();

  const queue = await queueService.getQueueStatus(doctorId, date);
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

  if (req.user.role === 'doctor') {
    const doctor = await Doctor.findOne({ userId: req.user.id });
    if (doctor && doctor._id.toString() !== doctorId) {
      return next(new AppError('Not authorized to manage this queue', 403));
    }
  }

  const queue = await queueService.advanceQueue(doctorId, date);
  const io = socketConfig.getIO();

  if (queue.currentServing) {
    const appointment = await Appointment.findById(queue.currentServing)
      .populate('patientId')
      .populate({ path: 'doctorId', populate: { path: 'userId' } });

    if (appointment) {
      // 1. Send Email Notification
      emailService.sendQueueCallNotification(appointment.patientId, appointment.doctorId, appointment).catch(console.error);

      // 2. Create In-App & FCM Push Notification for called patient
      await fcmService.sendNotification({
        userId: appointment.patientId._id,
        title: "It's your turn!",
        body: `Dr. ${appointment.doctorId?.userId?.name || 'Doctor'} is ready for your consultation. Token #${appointment.queueNumber}`,
        type: 'appointment-called',
        appointmentId: appointment._id,
      });

      // 3. Socket.IO Broadcasts
      if (io) {
        io.to(`doctor_${doctorId}`).emit('queue-updated', { queue });
        io.to(`queue_room_${doctorId}`).emit('queue-updated', { queue });
        io.to(`patient_${appointment.patientId._id}`).emit('appointment-called', {
          appointmentId: appointment._id,
          queueNumber: appointment.queueNumber,
        });
        io.emit(`queue-board-${doctorId}`, {
          currentNumber: queue.currentNumber,
          totalInQueue: queue.items.filter((i) => i.itemStatus === 'waiting').length,
          status: queue.status,
        });
      }

      // 4. Automated Lead Notification for next patient in line (Position #1 or #2)
      const waitingItems = queue.items.filter((i) => i.itemStatus === 'waiting');
      if (waitingItems.length > 0) {
        const nextPatientItem = waitingItems[0];
        const nextApt = await Appointment.findById(nextPatientItem.appointmentId);
        if (nextApt) {
          fcmService.notifyQueueNearTurn(nextPatientItem.patientId, nextApt, nextPatientItem.queueNumber, 1).catch(console.error);
        }
      }
    }
  } else {
    // Queue idle or finished
    if (io) {
      io.to(`doctor_${doctorId}`).emit('queue-updated', { queue });
      io.to(`queue_room_${doctorId}`).emit('queue-updated', { queue });
      io.emit(`queue-board-${doctorId}`, {
        currentNumber: '—',
        totalInQueue: 0,
        status: queue.status,
      });
    }
  }

  successResponse(res, queue, 'Queue advanced successfully');
});

/**
 * Announce Doctor Delay (sets delay offset in minutes & sends FCM push notices).
 */
exports.setDelay = asyncHandler(async (req, res, next) => {
  const { doctorId } = req.params;
  const { minutes, reason } = req.body;
  const date = req.query.date || new Date();

  const doctor = await Doctor.findById(doctorId).populate('userId');
  const doctorName = doctor?.userId?.name || 'Doctor';

  const queue = await queueService.setDoctorDelay(doctorId, minutes, reason, date);
  const io = socketConfig.getIO();

  // Notify waiting patients in app + FCM push
  const waitingItems = queue.items.filter((i) => i.itemStatus === 'waiting');
  for (const item of waitingItems) {
    fcmService.notifyDoctorDelay(item.patientId, doctorName, minutes, reason, item.appointmentId).catch(console.error);
  }

  if (io) {
    io.to(`doctor_${doctorId}`).emit('queue-updated', { queue });
    io.to(`queue_room_${doctorId}`).emit('queue-updated', { queue });
    io.to(`queue_room_${doctorId}`).emit('queue-delayed', { minutes, reason });
  }

  successResponse(res, queue, `Delay of ${minutes} minutes recorded and broadcasted`);
});

exports.addEmergency = asyncHandler(async (req, res, next) => {
  const { doctorId } = req.params;
  const { appointmentId } = req.body;
  const date = req.query.date || new Date();

  const queue = await queueService.addEmergencyToQueue(doctorId, appointmentId, date);
  const io = socketConfig.getIO();

  if (io) {
    io.to(`doctor_${doctorId}`).emit('queue-updated', { queue });
    io.to(`queue_room_${doctorId}`).emit('queue-updated', { queue });
    io.to(`doctor_${doctorId}`).emit('emergency-added', { appointmentId });
  }

  successResponse(res, queue, 'Appointment bumped to Emergency Priority');
});

exports.skipPatient = asyncHandler(async (req, res, next) => {
  const { doctorId } = req.params;
  const { appointmentId } = req.body;
  const date = req.query.date || new Date();

  const queue = await queueService.skipPatientInQueue(doctorId, appointmentId, date);
  const io = socketConfig.getIO();

  if (io) {
    io.to(`doctor_${doctorId}`).emit('queue-updated', { queue });
    io.to(`queue_room_${doctorId}`).emit('queue-updated', { queue });
  }

  successResponse(res, queue, 'Patient skipped');
});

exports.reorderQueue = asyncHandler(async (req, res, next) => {
  const { doctorId } = req.params;
  const { appointmentIds } = req.body;
  const date = req.query.date || new Date();

  const queue = await queueService.reorderQueue(doctorId, appointmentIds, date);
  const io = socketConfig.getIO();

  if (io) {
    io.to(`doctor_${doctorId}`).emit('queue-updated', { queue });
    io.to(`queue_room_${doctorId}`).emit('queue-updated', { queue });
  }

  successResponse(res, queue, 'Queue reordered successfully');
});

exports.pauseQueue = asyncHandler(async (req, res, next) => {
  const { doctorId } = req.params;
  const { reason } = req.body;
  const date = req.query.date || new Date();

  const queue = await queueService.getOrCreateQueue(doctorId, date);
  queue.status = 'paused';
  queue.pauseReason = reason || 'Doctor on break';
  queue.pausedAt = new Date();
  await queue.save();

  const io = socketConfig.getIO();
  if (io) {
    io.to(`doctor_${doctorId}`).emit('queue-updated', { queue });
    io.to(`queue_room_${doctorId}`).emit('queue-updated', { queue });
    io.emit(`queue-board-${doctorId}`, {
      status: 'paused',
      reason: queue.pauseReason,
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
  queue.resumedAt = new Date();
  await queue.save();

  const io = socketConfig.getIO();
  if (io) {
    io.to(`doctor_${doctorId}`).emit('queue-updated', { queue });
    io.to(`queue_room_${doctorId}`).emit('queue-updated', { queue });
    io.emit(`queue-board-${doctorId}`, {
      status: 'active',
      currentNumber: queue.currentNumber,
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
      currentNumber: '—',
      totalInQueue: 0,
      status: 'inactive',
    });
  }

  const doctor = await Doctor.findById(doctorId).populate('userId', 'name');
  const waitingItems = queue.items.filter((i) => i.itemStatus === 'waiting');
  const nextUp = waitingItems.slice(0, 5).map((i) => ({
    queueNumber: i.queueNumber,
    timeSlot: i.timeSlot?.start,
    isEmergency: i.isEmergency,
  }));

  successResponse(res, {
    doctorName: doctor?.userId?.name || 'Doctor',
    specialty: doctor?.specialty || '',
    currentNumber: queue.currentNumber || '—',
    totalInQueue: waitingItems.length,
    status: queue.status,
    pauseReason: queue.pauseReason,
    delayMinutes: queue.delayMinutes || 0,
    nextUp,
  });
});

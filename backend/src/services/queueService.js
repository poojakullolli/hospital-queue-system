/**
 * @fileoverview Smart Queue Engine Service — handles queue creation, position tracking,
 * emergency priority bumping, doctor delay offsets, queue reordering, and turn advancing.
 */

const Queue = require('../models/Queue');
const Appointment = require('../models/Appointment');
const AppError = require('../middleware/AppError');

/**
 * Find or initialize today's queue for a doctor.
 */
const getOrCreateQueue = async (doctorId, date = new Date()) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  let queue = await Queue.findOne({
    doctorId,
    date: { $gte: startOfDay, $lte: endOfDay },
  });

  if (!queue) {
    queue = await Queue.create({
      doctorId,
      date: startOfDay,
      items: [],
      completedItems: [],
      status: 'active',
      openedAt: new Date(),
    });
  }

  return queue;
};

/**
 * Add a patient appointment to the doctor's active queue.
 */
const addToQueue = async (doctorId, appointmentId, patientId, queueNumber, timeSlot, isEmergency = false, date = new Date()) => {
  const queue = await getOrCreateQueue(doctorId, date);

  if (queue.status === 'closed') {
    throw new AppError('Queue is closed for today', 400);
  }

  // Check if item already in active items
  const exists = queue.items.some((i) => i.appointmentId.toString() === appointmentId.toString());
  if (!exists) {
    if (isEmergency) {
      queue.addEmergencyItem({ appointmentId, patientId, queueNumber, timeSlot });
    } else {
      queue.items.push({
        appointmentId,
        patientId,
        queueNumber,
        timeSlot,
        itemStatus: 'waiting',
        isEmergency: false,
      });
    }
    await queue.save();
  }

  return queue;
};

/**
 * Advance queue to next waiting patient (or emergency patient).
 */
const advanceQueue = async (doctorId, date = new Date()) => {
  const queue = await getOrCreateQueue(doctorId, date);

  if (queue.status === 'closed') {
    throw new AppError('Cannot advance a closed queue', 400);
  }

  // If there is currently a serving appointment, mark it completed and archive item
  if (queue.currentServing) {
    const currentAptId = queue.currentServing.toString();
    const itemIdx = queue.items.findIndex((i) => i.appointmentId.toString() === currentAptId);

    if (itemIdx !== -1) {
      const [completedItem] = queue.items.splice(itemIdx, 1);
      completedItem.itemStatus = 'completed';
      completedItem.consultationEndedAt = new Date();
      if (completedItem.consultationStartedAt) {
        completedItem.actualConsultDuration = Math.max(
          1,
          Math.round((completedItem.consultationEndedAt - completedItem.consultationStartedAt) / 60000)
        );
      }
      queue.completedItems.push(completedItem);
      queue.servedCount++;
    }

    await Appointment.findByIdAndUpdate(queue.currentServing, { status: 'completed' });
    queue.recalculateAverageConsultTime();
  }

  // Call the next waiting item
  const calledItem = queue.callNext();

  if (calledItem) {
    calledItem.consultationStartedAt = new Date();
    await Appointment.findByIdAndUpdate(calledItem.appointmentId, { status: 'in-progress' });
  } else {
    queue.currentServing = null;
  }

  await queue.save();
  return queue;
};

/**
 * Bump an appointment to Emergency Priority in the queue.
 */
const addEmergencyToQueue = async (doctorId, appointmentId, date = new Date()) => {
  const queue = await getOrCreateQueue(doctorId, date);
  const appointment = await Appointment.findById(appointmentId);

  if (!appointment) throw new AppError('Appointment not found', 404);

  queue.addEmergencyItem({
    appointmentId: appointment._id,
    patientId: appointment.patientId,
    queueNumber: appointment.queueNumber,
    timeSlot: appointment.timeSlot,
  });

  await queue.save();
  return queue;
};

/**
 * Skip a patient and move them to the end of the queue.
 */
const skipPatientInQueue = async (doctorId, appointmentId, date = new Date()) => {
  const queue = await getOrCreateQueue(doctorId, date);
  queue.skipItem(appointmentId);
  await queue.save();
  return queue;
};

/**
 * Reorder waiting items in queue by an array of appointment IDs.
 */
const reorderQueue = async (doctorId, appointmentIds, date = new Date()) => {
  const queue = await getOrCreateQueue(doctorId, date);
  queue.reorderItems(appointmentIds);
  await queue.save();
  return queue;
};

/**
 * Record a doctor delay and update estimated wait offset.
 */
const setDoctorDelay = async (doctorId, delayMinutes, delayReason, date = new Date()) => {
  const queue = await getOrCreateQueue(doctorId, date);
  queue.delayMinutes = Math.max(0, Number(delayMinutes));
  queue.delayReason = delayReason || 'Doctor running behind schedule';
  await queue.save();
  return queue;
};

/**
 * Get patient's 1-based position and estimated wait time.
 */
const getQueuePosition = async (doctorId, appointmentId, date = new Date()) => {
  const queue = await getOrCreateQueue(doctorId, date);
  const position = queue.getPosition(appointmentId);
  const estimatedWaitMinutes = queue.getEstimatedWaitTime(appointmentId);

  return {
    position,
    estimatedWaitMinutes,
    currentServingId: queue.currentServing,
    currentNumber: queue.currentNumber,
    delayMinutes: queue.delayMinutes || 0,
    delayReason: queue.delayReason || '',
    queueStatus: queue.status,
  };
};

/**
 * Get full populated queue details for doctor or patient display.
 */
const getQueueStatus = async (doctorId, date = new Date()) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  let queue = await Queue.findOne({
    doctorId,
    date: { $gte: startOfDay, $lte: endOfDay },
  })
    .populate({
      path: 'items.appointmentId',
      populate: { path: 'patientId', select: 'name email phone avatar' },
    })
    .populate({
      path: 'items.patientId',
      select: 'name email phone avatar',
    })
    .populate({
      path: 'currentServing',
      populate: { path: 'patientId', select: 'name email phone avatar' },
    });

  if (!queue) {
    queue = await getOrCreateQueue(doctorId, date);
  }

  return queue;
};

module.exports = {
  getOrCreateQueue,
  addToQueue,
  advanceQueue,
  addEmergencyToQueue,
  skipPatientInQueue,
  reorderQueue,
  setDoctorDelay,
  getQueuePosition,
  getQueueStatus,
};

const Queue = require('../models/Queue');
const Appointment = require('../models/Appointment');
const AppError = require('../middleware/AppError');

const getOrCreateQueue = async (doctorId, date) => {
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
      appointments: [],
      status: 'active',
    });
  }

  return queue;
};

const addToQueue = async (doctorId, appointmentId, date) => {
  const queue = await getOrCreateQueue(doctorId, date);
  
  if (queue.status === 'closed') {
    throw new AppError('Queue is closed for this date', 400);
  }

  // Check if already in queue
  if (queue.appointments.includes(appointmentId)) {
    return queue;
  }

  queue.appointments.push(appointmentId);
  queue.totalInQueue = queue.appointments.length;
  await queue.save();

  return queue;
};

const advanceQueue = async (doctorId, date) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const queue = await Queue.findOne({
    doctorId,
    date: { $gte: startOfDay, $lte: endOfDay },
  });

  if (!queue) {
    throw new AppError('Queue not found for this date', 404);
  }

  if (queue.status !== 'active') {
    throw new AppError(`Cannot advance a ${queue.status} queue`, 400);
  }

  // Mark current as completed if there is one
  if (queue.currentServing) {
    await Appointment.findByIdAndUpdate(queue.currentServing, { status: 'completed' });
  }

  // Move next from array to currentServing
  if (queue.appointments.length > 0) {
    const nextAppointmentId = queue.appointments.shift();
    const nextAppointment = await Appointment.findByIdAndUpdate(
      nextAppointmentId,
      { status: 'in-progress' },
      { new: true }
    );
    
    queue.currentServing = nextAppointmentId;
    queue.currentNumber = nextAppointment.queueNumber || queue.currentNumber + 1;
  } else {
    queue.currentServing = null;
  }

  queue.totalInQueue = queue.appointments.length;
  await queue.save();

  return queue;
};

const getQueuePosition = async (doctorId, appointmentId, date) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const queue = await Queue.findOne({
    doctorId,
    date: { $gte: startOfDay, $lte: endOfDay },
  });

  if (!queue) return { position: -1, estimatedWaitTime: 0 };

  const position = queue.getPosition(appointmentId);
  const estimatedWaitTime = queue.getEstimatedWaitTime(appointmentId);

  return { position, estimatedWaitTime, currentServing: queue.currentServing };
};

const getQueueStatus = async (doctorId, date) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const queue = await Queue.findOne({
    doctorId,
    date: { $gte: startOfDay, $lte: endOfDay },
  })
    .populate({
      path: 'appointments',
      populate: { path: 'patientId', select: 'name email phone avatar' }
    })
    .populate({
      path: 'currentServing',
      populate: { path: 'patientId', select: 'name email phone avatar' }
    });

  if (!queue) {
    return null;
  }

  return queue;
};

const calculateEstimatedWait = (queue, position) => {
  if (position <= 0) return 0;
  return position * queue.averageConsultTime;
};

module.exports = {
  getOrCreateQueue,
  addToQueue,
  advanceQueue,
  getQueuePosition,
  getQueueStatus,
  calculateEstimatedWait,
};

const socketIO = require('socket.io');
const queueService = require('../services/queueService');

let io;

const initSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Patient joins a doctor's queue room
    socket.on('join-queue-room', ({ doctorId, appointmentId }) => {
      const room = `queue-${doctorId}`;
      socket.join(room);
      console.log(`👤 Socket ${socket.id} joined room: ${room}`);
      // Acknowledge join
      socket.emit('queue-room-joined', { room, doctorId });
    });

    // Doctor joins their own management room
    socket.on('join-doctor-room', ({ doctorId }) => {
      const room = `doctor-${doctorId}`;
      socket.join(room);
      console.log(`👨‍⚕️ Doctor socket ${socket.id} joined room: ${room}`);
      socket.emit('doctor-room-joined', { room, doctorId });
    });

    // Admin joins admin room
    socket.on('join-admin-room', () => {
      socket.join('admin-room');
      console.log(`🛡️ Admin socket ${socket.id} joined admin room`);
    });

    // Leave a room
    socket.on('leave-room', ({ room }) => {
      socket.leave(room);
      console.log(`👋 Socket ${socket.id} left room: ${room}`);
    });

    socket.on('disconnect', () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
    });

    socket.on('error', (err) => {
      console.error('Socket error:', err);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initSocket first.');
  }
  return io;
};

/**
 * Broadcast queue update to all patients in a doctor's room
 */
const broadcastQueueUpdate = (doctorId, queueData) => {
  if (io) {
    io.to(`queue-${doctorId}`).emit('queue-updated', queueData);
    io.to(`doctor-${doctorId}`).emit('queue-updated', queueData);
    io.to('admin-room').emit('queue-updated', { doctorId, ...queueData });
  }
};

/**
 * Notify a specific patient that their turn is coming
 */
const notifyPatientCalled = (doctorId, appointmentData) => {
  if (io) {
    io.to(`queue-${doctorId}`).emit('appointment-called', appointmentData);
  }
};

/**
 * Broadcast doctor status change (available/on-break)
 */
const broadcastDoctorStatus = (doctorId, statusData) => {
  if (io) {
    io.to(`queue-${doctorId}`).emit('doctor-status-changed', statusData);
    io.to('admin-room').emit('doctor-status-changed', { doctorId, ...statusData });
  }
};

/**
 * Send a notification to a specific user's socket room
 */
const sendNotification = (userId, notification) => {
  if (io) {
    io.to(`user-${userId}`).emit('new-notification', notification);
  }
};

module.exports = {
  initSocket,
  getIO,
  broadcastQueueUpdate,
  notifyPatientCalled,
  broadcastDoctorStatus,
  sendNotification,
};

const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const doctorRoutes = require('./doctor.routes');
const appointmentRoutes = require('./appointment.routes');
const queueRoutes = require('./queue.routes');
const adminRoutes = require('./admin.routes');
const notificationRoutes = require('./notification.routes');
const paymentRoutes = require('./payment.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/doctors', doctorRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/queues', queueRoutes);
router.use('/admin', adminRoutes);
router.use('/notifications', notificationRoutes);
router.use('/payments', paymentRoutes);

module.exports = router;

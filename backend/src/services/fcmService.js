/**
 * @fileoverview Firebase Cloud Messaging (FCM) Push Notification Service.
 * Handles push notifications for:
 *   - Appointment Confirmed
 *   - Appointment Reminder
 *   - Doctor Delay Announcement
 *   - Queue Near Turn (Lead Notification)
 *   - Appointment Cancelled
 */

const admin = require('firebase-admin');
const User = require('../models/User');
const Notification = require('../models/Notification');

let fcmInitialized = false;

// Initialize Firebase Admin SDK if credentials provided
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    fcmInitialized = true;
    console.log('✅ Firebase Cloud Messaging (FCM) Initialized');
  } else {
    console.log('ℹ️  FCM: No FIREBASE_SERVICE_ACCOUNT configured. Running in Mock/Development Mode.');
  }
} catch (err) {
  console.warn('⚠️  FCM Initialization warning:', err.message);
}

/**
 * Send raw FCM message to a single device token.
 */
const sendFCMMessage = async (fcmToken, notificationPayload, dataPayload = {}) => {
  if (!fcmToken) return false;

  if (!fcmInitialized) {
    console.log(`[FCM Mock Push] To Token: ${fcmToken.slice(0, 10)}... | Title: "${notificationPayload.title}" | Body: "${notificationPayload.body}"`);
    return true;
  }

  try {
    const message = {
      token: fcmToken,
      notification: {
        title: notificationPayload.title,
        body: notificationPayload.body,
      },
      data: {
        ...dataPayload,
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
    };

    const response = await admin.messaging().send(message);
    console.log('✅ FCM Message sent successfully:', response);
    return true;
  } catch (error) {
    console.error('❌ FCM Send Error:', error.message);
    return false;
  }
};

/**
 * Helper: Save In-App Notification document & trigger FCM push if user has fcmToken.
 */
const sendNotification = async ({ userId, title, body, type, appointmentId = null, metadata = {} }) => {
  try {
    // 1. Create In-App Notification in MongoDB
    const notification = await Notification.create({
      userId,
      title,
      message: body,
      type,
      appointmentId,
      metadata,
    });

    // 2. Lookup recipient User for FCM Token & preferences
    const user = await User.findById(userId);
    if (user && user.fcmToken && user.notificationPreferences?.push !== false) {
      await sendFCMMessage(user.fcmToken, { title, body }, { type, appointmentId: appointmentId ? appointmentId.toString() : '' });
    }

    return notification;
  } catch (err) {
    console.error('Error creating notification:', err);
  }
};

// ─── Semantic Notification Generators ───

/**
 * 1. Appointment Confirmed
 */
const notifyAppointmentConfirmed = async (userId, appointment) => {
  const doctorName = appointment.doctorId?.userId?.name || appointment.doctorId?.name || 'Doctor';
  const dateStr = new Date(appointment.date).toLocaleDateString('en-IN', { dateStyle: 'medium' });
  const timeStr = appointment.timeSlot?.start || '';

  return sendNotification({
    userId,
    title: 'Appointment Confirmed! ✅',
    body: `Your appointment with Dr. ${doctorName} on ${dateStr} at ${timeStr} is confirmed. Token #${appointment.queueNumber}`,
    type: 'appointment-confirmed',
    appointmentId: appointment._id,
    metadata: { queueNumber: appointment.queueNumber, doctorName },
  });
};

/**
 * 2. Appointment Reminder
 */
const notifyAppointmentReminder = async (userId, appointment) => {
  const doctorName = appointment.doctorId?.userId?.name || appointment.doctorId?.name || 'Doctor';
  const timeStr = appointment.timeSlot?.start || '';

  return sendNotification({
    userId,
    title: 'Appointment Reminder ⏰',
    body: `Reminder: You have an appointment with Dr. ${doctorName} today at ${timeStr}. Token #${appointment.queueNumber}`,
    type: 'appointment-reminder',
    appointmentId: appointment._id,
    metadata: { queueNumber: appointment.queueNumber },
  });
};

/**
 * 3. Doctor Delay
 */
const notifyDoctorDelay = async (userId, doctorName, delayMinutes, reason, appointmentId = null) => {
  return sendNotification({
    userId,
    title: 'Doctor Schedule Delay ⚠️',
    body: `Dr. ${doctorName} announced a ${delayMinutes} minute delay. ${reason ? `Reason: ${reason}` : 'Thank you for your patience.'}`,
    type: 'doctor-delay',
    appointmentId,
    metadata: { delayMinutes, reason },
  });
};

/**
 * 4. Queue Near Turn (Lead Notification)
 */
const notifyQueueNearTurn = async (userId, appointment, queueNumber, positionAhead = 1) => {
  return sendNotification({
    userId,
    title: "Get Ready! You're Next in Line 🚨",
    body: `Your token #${queueNumber} is ${positionAhead === 1 ? 'next in line' : `${positionAhead} positions ahead`}. Please head near the cabin.`,
    type: 'queue-near-turn',
    appointmentId: appointment._id,
    metadata: { queueNumber, positionAhead },
  });
};

/**
 * 5. Appointment Cancelled
 */
const notifyAppointmentCancelled = async (userId, appointment, reason = '') => {
  const doctorName = appointment.doctorId?.userId?.name || appointment.doctorId?.name || 'Doctor';

  return sendNotification({
    userId,
    title: 'Appointment Cancelled ❌',
    body: `Your appointment with Dr. ${doctorName} has been cancelled. ${reason ? `Reason: ${reason}` : ''}`,
    type: 'appointment-cancelled',
    appointmentId: appointment._id,
    metadata: { reason },
  });
};

module.exports = {
  sendFCMMessage,
  sendNotification,
  notifyAppointmentConfirmed,
  notifyAppointmentReminder,
  notifyDoctorDelay,
  notifyQueueNearTurn,
  notifyAppointmentCancelled,
};

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['appointment-booked', 'appointment-called', 'appointment-completed', 'queue-update', 'system'],
      default: 'system',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    appointmentId: {
      type: mongoose.Schema.ObjectId,
      ref: 'Appointment',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Notification', notificationSchema);

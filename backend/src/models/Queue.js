const mongoose = require('mongoose');

const queueSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.ObjectId,
      ref: 'Doctor',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    appointments: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'Appointment',
      },
    ],
    currentServing: {
      type: mongoose.Schema.ObjectId,
      ref: 'Appointment',
      default: null,
    },
    currentNumber: {
      type: Number,
      default: 0,
    },
    totalInQueue: {
      type: Number,
      default: 0,
    },
    averageConsultTime: {
      type: Number,
      default: 15, // in minutes
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'closed'],
      default: 'active',
    },
    pauseReason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only one queue per doctor per day
queueSchema.index({ doctorId: 1, date: 1 }, { unique: true });

// Methods
queueSchema.methods.getPosition = function (appointmentId) {
  const index = this.appointments.findIndex((id) => id.toString() === appointmentId.toString());
  if (index === -1) return -1;
  return index + 1; // 1-based position in the unserved array
};

queueSchema.methods.getEstimatedWaitTime = function (appointmentId) {
  const position = this.getPosition(appointmentId);
  if (position <= 0) return 0; // It's their turn or they are not in the queue
  return position * this.averageConsultTime; // wait time in minutes
};

module.exports = mongoose.model('Queue', queueSchema);

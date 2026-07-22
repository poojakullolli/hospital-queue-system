/**
 * @fileoverview Queue Model — daily live queue for each doctor.
 *
 * Relationships:
 *   - One Queue → One Doctor            (Queue.doctorId → Doctor._id)
 *   - One Queue → Many Appointments     (Queue.items[].appointmentId)
 *   - Queue.currentServing → Appointment (the patient currently with the doctor)
 *
 * Design:
 *   - One document per doctor per calendar day (composite unique index).
 *   - Queue items are embedded subdocuments (not just ObjectId refs) so that
 *     position, call-time, and wait-time snapshots are stored without extra queries.
 *   - The `items` array is ordered — index 0 is the current/next patient.
 *   - Served patients are moved to `completedItems[]` to keep `items[]` lean.
 *   - Analytics fields (avgServeTime, pauseDuration) enable wait-time estimation.
 */

const mongoose = require('mongoose');

// ─── Sub-schema: Queue Item ────────────────────────────────────────────────────
/**
 * Represents a single patient's slot in the live queue.
 * Stored as an embedded subdocument for atomic position updates.
 */
const queueItemSchema = new mongoose.Schema(
  {
    /** The scheduled appointment this queue slot belongs to */
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
    },

    /** Patient reference for quick display without deep population */
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    /** Sequential ticket number displayed to the patient (e.g., A001) */
    queueNumber: {
      type: Number,
      required: true,
      min: 1,
    },

    /** Current state of this queue item */
    itemStatus: {
      type: String,
      enum: {
        values: ['waiting', 'called', 'in-progress', 'completed', 'skipped', 'no-show'],
        message: '{VALUE} is not a valid queue item status',
      },
      default: 'waiting',
    },

    /** Booked time slot (snapshot — avoids join with Appointment) */
    timeSlot: {
      start: String,
      end:   String,
    },

    /** When the patient physically checked in at the reception desk */
    checkedInAt: {
      type: Date,
    },

    /** When the doctor called this patient (used to measure wait time) */
    calledAt: {
      type: Date,
    },

    /** When consultation started */
    consultationStartedAt: {
      type: Date,
    },

    /** When consultation ended */
    consultationEndedAt: {
      type: Date,
    },

    /**
     * Actual time spent with the doctor in minutes.
     * Set when the item moves to 'completed' — feeds into averageConsultTime.
     */
    actualConsultDuration: {
      type: Number,
      min: 0,
    },

    /** Estimated wait time in minutes at the time of check-in (snapshot) */
    estimatedWaitAtCheckIn: {
      type: Number,
      min: 0,
    },
  },
  {
    _id:        true,
    timestamps: true,
  }
);

// ─── Main Queue Schema ─────────────────────────────────────────────────────────
const queueSchema = new mongoose.Schema(
  {
    /** Doctor this queue belongs to */
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'Doctor reference is required'],
      index: true,
    },

    /**
     * Calendar date for this queue.
     * Stored at midnight UTC for consistent date comparisons.
     */
    date: {
      type: Date,
      required: [true, 'Queue date is required'],
    },

    /**
     * Active queue items (ordered).
     * - items[0] is the current patient (or the next patient if none in-progress).
     * - Pop from front when calling next, push to completedItems[].
     */
    items: {
      type: [queueItemSchema],
      default: [],
    },

    /**
     * Completed/skipped/no-show items moved here to keep `items[]` small.
     * Preserved for analytics and audit purposes.
     */
    completedItems: {
      type: [queueItemSchema],
      default: [],
    },

    /**
     * Reference to the appointment currently being served.
     * null when the queue is idle between patients.
     */
    currentServing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },

    /**
     * The queue ticket number most recently called (e.g., 5 means #5 is currently serving).
     * Used for the public queue-board display.
     */
    currentNumber: {
      type: Number,
      default: 0,
      min: 0,
    },

    /**
     * Auto-incrementing counter for assigning the next queue number.
     * Survives cancellations (cancelled slots keep their number so existing patients
     * aren't confused by number jumps).
     */
    nextQueueNumber: {
      type: Number,
      default: 1,
      min: 1,
    },

    /** Total patients who have been served today */
    servedCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    /**
     * Rolling average consultation time in minutes, recalculated after each patient.
     * Used to compute estimated wait time for patients.
     */
    averageConsultTime: {
      type: Number,
      default: 15,
      min: 1,
      max: 120,
    },

    /** Current operational status of the queue */
    status: {
      type: String,
      enum: {
        values: ['pending', 'active', 'paused', 'closed'],
        message: '{VALUE} is not a valid queue status',
      },
      default: 'pending',
    },

    /** Reason for pausing (shown to patients on the queue board) */
    pauseReason: {
      type: String,
      trim: true,
      maxlength: [200, 'Pause reason cannot exceed 200 characters'],
    },

    /** When the queue was last paused */
    pausedAt: {
      type: Date,
    },

    /** When the queue was last resumed */
    resumedAt: {
      type: Date,
    },

    /** Cumulative pause duration in minutes (for accurate wait-time calculation) */
    totalPauseDuration: {
      type: Number,
      default: 0,
      min: 0,
    },

    /** Queue opened at this time */
    openedAt: {
      type: Date,
    },

    /** Queue closed (all patients served or end of day) */
    closedAt: {
      type: Date,
    },

    /** Admin override notes (e.g., 'Emergency — queue extended by 30 minutes') */
    adminNotes: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    toJSON:  { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ───────────────────────────────────────────────────────────────────
/** One queue document per doctor per day */
queueSchema.index({ doctorId: 1, date: 1 }, { unique: true, name: 'unique_doctor_queue_day' });
queueSchema.index({ status: 1, date: 1 });   // admin queue monitoring

// ─── Virtuals ─────────────────────────────────────────────────────────────────
/** Number of patients currently waiting (not yet called) */
queueSchema.virtual('waitingCount').get(function () {
  return this.items.filter((i) => i.itemStatus === 'waiting').length;
});

/** Number of patients total in today's queue (active + completed) */
queueSchema.virtual('totalPatients').get(function () {
  return this.items.length + this.completedItems.length;
});

// ─── Instance Methods ──────────────────────────────────────────────────────────
/**
 * Get the 1-based position of an appointment in the active queue.
 * Returns -1 if the appointment is not found in the active items.
 * @param {mongoose.Types.ObjectId|string} appointmentId
 * @returns {number} 1-based position, or -1 if not found
 */
queueSchema.methods.getPosition = function (appointmentId) {
  const id = appointmentId.toString();
  const idx = this.items.findIndex(
    (item) => item.appointmentId.toString() === id && item.itemStatus === 'waiting'
  );
  return idx === -1 ? -1 : idx + 1;
};

/**
 * Estimate the waiting time in minutes for a given appointment.
 * Accounts for the current in-progress consultation and all waiting patients ahead.
 * @param {mongoose.Types.ObjectId|string} appointmentId
 * @returns {number} Estimated wait in minutes (0 if it's their turn)
 */
queueSchema.methods.getEstimatedWaitTime = function (appointmentId) {
  const position = this.getPosition(appointmentId);
  if (position <= 0) return 0;

  // position - 1 patients are ahead, each takes averageConsultTime minutes
  return (position - 1) * this.averageConsultTime;
};

/**
 * Recalculate averageConsultTime from completedItems[].
 * Call this after each patient consultation ends.
 * @returns {number} New average in minutes
 */
queueSchema.methods.recalculateAverageConsultTime = function () {
  const completed = this.completedItems.filter(
    (i) => i.actualConsultDuration != null && i.actualConsultDuration > 0
  );
  if (completed.length === 0) return this.averageConsultTime;

  const total = completed.reduce((sum, i) => sum + i.actualConsultDuration, 0);
  this.averageConsultTime = Math.round(total / completed.length);
  return this.averageConsultTime;
};

/**
 * Move the next waiting item to 'in-progress' (i.e., call the next patient).
 * Updates currentServing and currentNumber.
 * Returns the called item, or null if queue is empty.
 * @returns {Object|null}
 */
queueSchema.methods.callNext = function () {
  const nextItem = this.items.find((i) => i.itemStatus === 'waiting');
  if (!nextItem) return null;

  nextItem.itemStatus = 'called';
  nextItem.calledAt   = new Date();
  this.currentServing = nextItem.appointmentId;
  this.currentNumber  = nextItem.queueNumber;
  return nextItem;
};

module.exports = mongoose.model('Queue', queueSchema);

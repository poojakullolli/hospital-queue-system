/**
 * @fileoverview Queue Model — daily live queue for each doctor with Smart Queue Engine capabilities.
 *
 * Capabilities:
 *   - Automatic Queue Number generation
 *   - Real-time Position Tracking & Dynamic Estimated Wait Calculation
 *   - Doctor Delay Offset Handling
 *   - Emergency Priority Bump (moves patient to top of waiting list)
 *   - Queue Reordering & Skipping
 *   - Embedded Queue Items with atomic state transitions
 */

const mongoose = require('mongoose');

// ─── Sub-schema: Queue Item ────────────────────────────────────────────────────
const queueItemSchema = new mongoose.Schema(
  {
    /** The scheduled appointment this queue slot belongs to */
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
    },

    /** Patient reference */
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    /** Sequential ticket number displayed to the patient (e.g. 104) */
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

    /** Emergency flag — true bumps item to front of waiting queue */
    isEmergency: {
      type: Boolean,
      default: false,
    },

    /** Priority level */
    priority: {
      type: String,
      enum: ['normal', 'high', 'emergency'],
      default: 'normal',
    },

    /** Booked time slot snapshot */
    timeSlot: {
      start: String,
      end:   String,
    },

    /** When physical check-in occurred */
    checkedInAt: {
      type: Date,
    },

    /** When the doctor called this patient */
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

    /** Actual time spent with doctor in minutes */
    actualConsultDuration: {
      type: Number,
      min: 0,
    },

    /** Estimated wait snapshot at check-in */
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

    /** Calendar date for this queue (midnight UTC) */
    date: {
      type: Date,
      required: [true, 'Queue date is required'],
    },

    /** Active ordered queue items */
    items: {
      type: [queueItemSchema],
      default: [],
    },

    /** Completed / skipped / no-show items archive */
    completedItems: {
      type: [queueItemSchema],
      default: [],
    },

    /** Reference to appointment currently being served */
    currentServing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },

    /** Current ticket number being served */
    currentNumber: {
      type: Number,
      default: 0,
      min: 0,
    },

    /** Counter for next queue number */
    nextQueueNumber: {
      type: Number,
      default: 1,
      min: 1,
    },

    /** Total patients served today */
    servedCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    /** Rolling average consultation time in minutes */
    averageConsultTime: {
      type: Number,
      default: 15,
      min: 1,
      max: 120,
    },

    /** Doctor announced delay in minutes */
    delayMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },

    /** Reason for doctor delay */
    delayReason: {
      type: String,
      trim: true,
      maxlength: [300, 'Delay reason cannot exceed 300 characters'],
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

    /** Reason for queue pause */
    pauseReason: {
      type: String,
      trim: true,
      maxlength: [200, 'Pause reason cannot exceed 200 characters'],
    },

    /** Pause timestamp */
    pausedAt: {
      type: Date,
    },

    /** Resume timestamp */
    resumedAt: {
      type: Date,
    },

    /** Cumulative pause duration in minutes */
    totalPauseDuration: {
      type: Number,
      default: 0,
      min: 0,
    },

    openedAt: {
      type: Date,
    },

    closedAt: {
      type: Date,
    },

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
queueSchema.index({ doctorId: 1, date: 1 }, { unique: true, name: 'unique_doctor_queue_day' });
queueSchema.index({ status: 1, date: 1 });

// ─── Virtuals ─────────────────────────────────────────────────────────────────
queueSchema.virtual('waitingCount').get(function () {
  return this.items.filter((i) => i.itemStatus === 'waiting').length;
});

queueSchema.virtual('totalPatients').get(function () {
  return this.items.length + this.completedItems.length;
});

// ─── Instance Methods ──────────────────────────────────────────────────────────

/**
 * Get 1-based position of an appointment among waiting items.
 */
queueSchema.methods.getPosition = function (appointmentId) {
  const id = appointmentId.toString();
  const waitingItems = this.items.filter((item) => item.itemStatus === 'waiting');
  const idx = waitingItems.findIndex((item) => item.appointmentId.toString() === id);
  return idx === -1 ? -1 : idx + 1;
};

/**
 * Smart calculation of estimated wait time including doctor delay and position.
 */
queueSchema.methods.getEstimatedWaitTime = function (appointmentId) {
  const position = this.getPosition(appointmentId);
  if (position <= 0) return 0;
  const delay = this.delayMinutes || 0;
  return Math.max(0, (position - 1) * this.averageConsultTime + delay);
};

/**
 * Recalculate average consultation time from completed items.
 */
queueSchema.methods.recalculateAverageConsultTime = function () {
  const completed = this.completedItems.filter(
    (i) => i.actualConsultDuration != null && i.actualConsultDuration > 0
  );
  if (completed.length === 0) return this.averageConsultTime;

  const total = completed.reduce((sum, i) => sum + i.actualConsultDuration, 0);
  this.averageConsultTime = Math.max(5, Math.round(total / completed.length));
  return this.averageConsultTime;
};

/**
 * Move next waiting patient to 'called' / 'in-progress'.
 */
queueSchema.methods.callNext = function () {
  // Give priority to emergency items first, then regular waiting items
  const nextItem =
    this.items.find((i) => i.itemStatus === 'waiting' && i.isEmergency) ||
    this.items.find((i) => i.itemStatus === 'waiting');

  if (!nextItem) return null;

  nextItem.itemStatus = 'called';
  nextItem.calledAt   = new Date();
  this.currentServing = nextItem.appointmentId;
  this.currentNumber  = nextItem.queueNumber;
  return nextItem;
};

/**
 * Bump an appointment to Emergency priority (places it at top of waiting items).
 */
queueSchema.methods.addEmergencyItem = function (itemData) {
  const existingIdx = this.items.findIndex(
    (i) => i.appointmentId.toString() === itemData.appointmentId.toString()
  );

  let newItem;
  if (existingIdx !== -1) {
    newItem = this.items[existingIdx];
    this.items.splice(existingIdx, 1);
  } else {
    newItem = {
      appointmentId: itemData.appointmentId,
      patientId: itemData.patientId,
      queueNumber: itemData.queueNumber || this.nextQueueNumber++,
      timeSlot: itemData.timeSlot,
    };
  }

  newItem.isEmergency = true;
  newItem.priority = 'emergency';
  newItem.itemStatus = 'waiting';

  // Find first waiting index to insert emergency item right at the front
  const firstWaitingIdx = this.items.findIndex((i) => i.itemStatus === 'waiting');
  if (firstWaitingIdx !== -1) {
    this.items.splice(firstWaitingIdx, 0, newItem);
  } else {
    this.items.push(newItem);
  }

  return newItem;
};

/**
 * Skip a patient (moves them to the end of the active waiting items).
 */
queueSchema.methods.skipItem = function (appointmentId) {
  const idStr = appointmentId.toString();
  const idx = this.items.findIndex((i) => i.appointmentId.toString() === idStr);
  if (idx !== -1) {
    const [skipped] = this.items.splice(idx, 1);
    skipped.itemStatus = 'waiting'; // Keep in waiting status at end of queue
    this.items.push(skipped);
    return skipped;
  }
  return null;
};

/**
 * Reorder waiting queue items based on an array of appointment IDs.
 */
queueSchema.methods.reorderItems = function (appointmentIds) {
  const idOrder = appointmentIds.map((id) => id.toString());
  
  // Separate items into waiting and non-waiting
  const waitingItems = this.items.filter((i) => i.itemStatus === 'waiting');
  const nonWaitingItems = this.items.filter((i) => i.itemStatus !== 'waiting');

  // Sort waiting items according to idOrder
  waitingItems.sort((a, b) => {
    const idxA = idOrder.indexOf(a.appointmentId.toString());
    const idxB = idOrder.indexOf(b.appointmentId.toString());
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });

  // Re-combine non-waiting (in-progress/called) at front followed by sorted waiting items
  this.items = [...nonWaitingItems, ...waitingItems];
  return this.items;
};

module.exports = mongoose.model('Queue', queueSchema);

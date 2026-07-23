/**
 * @fileoverview Notification Model — in-app and push notifications for all roles.
 *
 * Relationships:
 *   - Many Notifications → One User         (Notification.userId)
 *   - Many Notifications → One Appointment  (Notification.appointmentId, optional)
 *
 * Design decisions:
 *   - `channels` tracks which delivery methods have been attempted/confirmed.
 *   - `expiresAt` allows auto-cleanup via MongoDB TTL index.
 *   - `priority` controls frontend toast type and sort order.
 *   - Grouped `metadata` allows flexible extra payload per notification type.
 */

const mongoose = require('mongoose');

// ─── Sub-schema: Channel Delivery Status ──────────────────────────────────────
/**
 * Tracks delivery attempt and result per notification channel.
 */
const channelStatusSchema = new mongoose.Schema(
  {
    /** Whether a delivery attempt was made on this channel */
    sent: {
      type: Boolean,
      default: false,
    },

    /** Whether the delivery was confirmed successful */
    delivered: {
      type: Boolean,
      default: false,
    },

    /** Timestamp of the delivery attempt */
    sentAt: {
      type: Date,
    },

    /** Error message if delivery failed */
    error: {
      type: String,
      maxlength: 500,
    },
  },
  { _id: false }
);

// ─── Main Notification Schema ──────────────────────────────────────────────────
const notificationSchema = new mongoose.Schema(
  {
    /** Recipient user */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },

    /** Short title displayed in the notification bell */
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },

    /** Full message body */
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },

    /**
     * Semantic type — used by the frontend to select icon, color, and sound.
     */
    type: {
      type: String,
      enum: {
        values: [
          'appointment-booked',      // patient books an appointment
          'appointment-confirmed',   // doctor/system confirms
          'appointment-cancelled',   // any party cancels
          'appointment-reminder',    // 30-min/1-day reminder
          'doctor-delay',            // doctor announced delay
          'queue-near-turn',         // patient is position #2 near turn
          'appointment-called',      // patient's turn in queue
          'appointment-completed',   // consultation done
          'appointment-no-show',     // patient missed their slot
          'queue-update',            // general queue position change
          'queue-paused',            // doctor paused queue
          'queue-resumed',           // doctor resumed queue
          'medical-record-ready',    // doctor published record
          'lab-results-ready',       // lab results available
          'payment-received',        // payment confirmed
          'payment-refunded',        // refund processed
          'system',                  // generic system message
          'announcement',            // hospital-wide broadcast
        ],
        message: '{VALUE} is not a valid notification type',
      },
      default: 'system',
      index: true,
    },

    /** Visual and audio priority level */
    priority: {
      type: String,
      enum: {
        values: ['low', 'normal', 'high', 'urgent'],
        message: '{VALUE} is not a valid priority',
      },
      default: 'normal',
    },

    /** Read status (set true when user views the notification) */
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    /** When the user read/acknowledged the notification */
    readAt: {
      type: Date,
    },

    /** Related appointment (if type is appointment-*) */
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      index: true,
    },

    /** Related medical record (if type is medical-record-ready / lab-results-ready) */
    medicalRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MedicalRecord',
    },

    /**
     * Deep-link or route to navigate the user to when they click the notification.
     * E.g., '/patient/queue', '/patient/appointments/66abc...'
     */
    actionUrl: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    /** Optional CTA button label */
    actionLabel: {
      type: String,
      trim: true,
      maxlength: 50,
    },

    /**
     * Delivery status per channel.
     * Channels not used will be undefined (not false) to keep documents lean.
     */
    channels: {
      inApp: {
        type: channelStatusSchema,
        default: () => ({ sent: true, delivered: true, sentAt: new Date() }),
      },
      email: {
        type: channelStatusSchema,
        default: () => ({}),
      },
      sms: {
        type: channelStatusSchema,
        default: () => ({}),
      },
      push: {
        type: channelStatusSchema,
        default: () => ({}),
      },
    },

    /**
     * Arbitrary extra payload — varies per notification type.
     * E.g., { queuePosition: 3, doctorName: 'Dr. Smith', estimatedWait: 15 }
     */
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    /**
     * Auto-expiry — notification is automatically deleted from DB after this date.
     * Controlled by MongoDB TTL index on `expiresAt`.
     * Default: 30 days from creation.
     */
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },

    /**
     * Whether this notification was sent as part of a bulk broadcast.
     * Bulk notifications (announcements) are created per-user but share a batchId.
     */
    isBulk: {
      type: Boolean,
      default: false,
    },

    /** Shared ID across all notifications in a bulk broadcast */
    batchId: {
      type: String,
      trim: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ───────────────────────────────────────────────────────────────────
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 }); // notification bell query
notificationSchema.index({ userId: 1, type: 1 });                   // filter by type
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL auto-delete

// ─── Middleware / Hooks ────────────────────────────────────────────────────────
/**
 * Pre-save: set readAt timestamp when isRead flips from false to true.
 */
notificationSchema.pre('save', function (next) {
  if (this.isModified('isRead') && this.isRead && !this.readAt) {
    this.readAt = new Date();
  }
  next();
});

// ─── Instance Methods ──────────────────────────────────────────────────────────
/**
 * Mark this notification as read and save.
 * @returns {Promise<Notification>}
 */
notificationSchema.methods.markRead = async function () {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    await this.save();
  }
  return this;
};

// ─── Static Methods ────────────────────────────────────────────────────────────
/**
 * Retrieve paginated notifications for a user, most recent first.
 * @param {string} userId
 * @param {Object} [opts] - { page, limit, type, unreadOnly }
 * @returns {Promise<{ notifications, unreadCount, total }>}
 */
notificationSchema.statics.getForUser = async function (userId, opts = {}) {
  const { page = 1, limit = 20, type, unreadOnly = false } = opts;
  const filter = { userId };
  if (type) filter.type = type;
  if (unreadOnly) filter.isRead = false;

  const [notifications, total, unreadCount] = await Promise.all([
    this.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    this.countDocuments(filter),
    this.countDocuments({ userId, isRead: false }),
  ]);

  return { notifications, unreadCount, total, page, limit };
};

/**
 * Mark all unread notifications for a user as read.
 * @param {string} userId
 * @returns {Promise<mongoose.UpdateWriteOpResult>}
 */
notificationSchema.statics.markAllReadForUser = function (userId) {
  return this.updateMany(
    { userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
};

module.exports = mongoose.model('Notification', notificationSchema);

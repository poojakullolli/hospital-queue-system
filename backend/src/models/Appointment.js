/**
 * @fileoverview Appointment Model — a single scheduled visit between a Patient and a Doctor.
 *
 * Relationships:
 *   - Many Appointments → One Patient (User with role=patient)  [patientId]
 *   - Many Appointments → One Doctor                            [doctorId]
 *   - One  Appointment  → One Queue entry                       (Queue.appointments[])
 *   - One  Appointment  → One MedicalRecord (post-consultation) (MedicalRecord.appointmentId)
 *   - One  Appointment  → Many Notifications                    (Notification.appointmentId)
 *
 * Lifecycle statuses:
 *   pending → confirmed → in-progress → completed
 *                       └→ no-show
 *             └→ cancelled (at any point before in-progress)
 */

const mongoose = require('mongoose');

// ─── Sub-schema: Vitals ────────────────────────────────────────────────────────
/**
 * Preliminary vitals collected by nursing staff when patient checks in.
 * Stored on the Appointment so the doctor has context before the consultation.
 */
const vitalsSchema = new mongoose.Schema(
  {
    /** Weight in kilograms */
    weight: {
      type: Number,
      min: [0.5, 'Weight must be at least 0.5 kg'],
      max: [500, 'Weight seems too high'],
    },

    /** Height in centimetres */
    height: {
      type: Number,
      min: [20, 'Height must be at least 20 cm'],
      max: [300, 'Height seems too high'],
    },

    /** Blood pressure reading, e.g. '120/80' */
    bloodPressure: {
      type: String,
      match: [/^\d{2,3}\/\d{2,3}$/, 'Blood pressure must be in systolic/diastolic format, e.g. 120/80'],
    },

    /** Pulse rate in beats per minute */
    pulseRate: {
      type: Number,
      min: [20, 'Pulse rate seems too low'],
      max: [300, 'Pulse rate seems too high'],
    },

    /** Body temperature in °C */
    temperature: {
      type: Number,
      min: [30, 'Temperature seems too low'],
      max: [45, 'Temperature seems too high'],
    },

    /** Oxygen saturation % (SpO₂) */
    oxygenSaturation: {
      type: Number,
      min: [50, 'SpO₂ seems too low'],
      max: [100, 'SpO₂ cannot exceed 100%'],
    },

    /** Fasting blood glucose in mg/dL */
    bloodGlucose: {
      type: Number,
      min: 0,
    },

    /** Timestamp when vitals were recorded */
    recordedAt: {
      type: Date,
      default: Date.now,
    },

    /** Nurse/staff who recorded the vitals */
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { _id: false }
);

// ─── Sub-schema: Payment ──────────────────────────────────────────────────────
/**
 * Payment details for the consultation.
 * paymentIntentId is the Stripe PaymentIntent ID for tracking.
 */
const paymentSchema = new mongoose.Schema(
  {
    /** Total fee charged (snapshot at booking, may differ from current doctor fee) */
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    /** Currency code — ISO 4217 */
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      maxlength: 3,
    },

    /** Current payment state */
    status: {
      type: String,
      enum: {
        values: ['pending', 'paid', 'refunded', 'failed', 'waived'],
        message: '{VALUE} is not a valid payment status',
      },
      default: 'pending',
    },

    /** Payment method used by the patient */
    method: {
      type: String,
      enum: ['online', 'cash', 'insurance', 'waived'],
    },

    /** Stripe PaymentIntent ID or UPI reference */
    transactionId: {
      type: String,
      trim: true,
    },

    /** Stripe PaymentIntent ID (for webhook reconciliation) */
    paymentIntentId: {
      type: String,
      trim: true,
    },

    /** When the payment was confirmed */
    paidAt: {
      type: Date,
    },

    /** Refund reference if applicable */
    refundId: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

// ─── Sub-schema: Status History ────────────────────────────────────────────────
/**
 * Audit trail of every status transition.
 * Enables analytics on how long each step takes.
 */
const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    /** User who triggered the change (patient, doctor, admin, or system) */
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    note: {
      type: String,
      maxlength: 300,
    },
  },
  { _id: false }
);

// ─── Main Appointment Schema ───────────────────────────────────────────────────
const appointmentSchema = new mongoose.Schema(
  {
    /** Patient who booked this appointment (User with role='patient') */
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient reference is required'],
      index: true,
    },

    /** Doctor the appointment is with */
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'Doctor reference is required'],
      index: true,
    },

    /** Appointment date (date portion only — stored at midnight UTC) */
    date: {
      type: Date,
      required: [true, 'Appointment date is required'],
      validate: {
        validator: (v) => v >= new Date(new Date().setHours(0, 0, 0, 0)),
        message: 'Appointment date cannot be in the past',
      },
    },

    /** Booked time window — stored as HH:MM strings */
    timeSlot: {
      start: {
        type: String,
        required: [true, 'Time slot start is required'],
        match: [/^\d{2}:\d{2}$/, 'Time slot start must be HH:MM'],
      },
      end: {
        type: String,
        required: [true, 'Time slot end is required'],
        match: [/^\d{2}:\d{2}$/, 'Time slot end must be HH:MM'],
      },
    },

    /**
     * Sequential queue number assigned at booking time for this doctor+date.
     * Used by Queue.currentNumber for real-time tracking.
     */
    queueNumber: {
      type: Number,
      min: 1,
    },

    /** Current lifecycle status */
    status: {
      type: String,
      enum: {
        values: ['pending', 'confirmed', 'checked-in', 'in-progress', 'completed', 'cancelled', 'no-show'],
        message: '{VALUE} is not a valid appointment status',
      },
      default: 'pending',
      index: true,
    },

    /** Full audit trail of status changes */
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },

    /** Patient's stated reason for the visit / chief complaint */
    chiefComplaint: {
      type: String,
      trim: true,
      maxlength: [500, 'Chief complaint cannot exceed 500 characters'],
    },

    /** Additional notes from the patient during booking */
    patientNotes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Patient notes cannot exceed 1000 characters'],
    },

    /** Doctor's post-consultation notes (internal) */
    doctorNotes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Doctor notes cannot exceed 2000 characters'],
    },

    /** Pre-consultation vitals recorded by nursing staff */
    vitals: {
      type: vitalsSchema,
      default: null,
    },

    /** Payment details for this appointment */
    payment: {
      type: paymentSchema,
      default: () => ({ amount: 0, status: 'pending' }),
    },

    /** Reason provided when appointment is cancelled */
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Cancellation reason cannot exceed 500 characters'],
    },

    /** Who cancelled: 'patient', 'doctor', or 'admin' */
    cancelledBy: {
      type: String,
      enum: ['patient', 'doctor', 'admin', 'system'],
    },

    /**
     * Whether this is a follow-up from a previous appointment.
     * Links to parent appointment for clinical continuity.
     */
    isFollowUp: {
      type: Boolean,
      default: false,
    },
    followUpOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
    },

    /** Appointment type — in-person or telemedicine */
    type: {
      type: String,
      enum: {
        values: ['in-person', 'telemedicine'],
        message: '{VALUE} is not a valid appointment type',
      },
      default: 'in-person',
    },

    /** Telemedicine meeting link if type='telemedicine' */
    meetingLink: {
      type: String,
      trim: true,
    },

    /** Reminder sent flag — avoids duplicate reminders */
    reminderSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON:  { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ───────────────────────────────────────────────────────────────────
// Prevent double-booking: a patient can only have one appointment per time slot per doctor
appointmentSchema.index(
  { doctorId: 1, date: 1, 'timeSlot.start': 1 },
  { unique: true, name: 'unique_doctor_slot' }
);
appointmentSchema.index({ patientId: 1, date: -1 });     // patient appointment history
appointmentSchema.index({ doctorId: 1, date: 1, status: 1 }); // doctor daily queue
appointmentSchema.index({ status: 1, date: 1 });          // admin status reports
appointmentSchema.index({ 'payment.status': 1 });         // billing reports

// ─── Virtuals ─────────────────────────────────────────────────────────────────
/**
 * Link to the MedicalRecord created after this appointment.
 * Usage: appointment.populate('medicalRecord')
 */
appointmentSchema.virtual('medicalRecord', {
  ref:        'MedicalRecord',
  localField:  '_id',
  foreignField: 'appointmentId',
  justOne:    true,
});

// ─── Middleware / Hooks ────────────────────────────────────────────────────────
/**
 * Pre-save: push a new statusHistory entry whenever status changes.
 */
appointmentSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    this.statusHistory.push({ status: this.status });
  }
  next();
});

// ─── Instance Methods ──────────────────────────────────────────────────────────
/**
 * Returns true if the appointment can still be cancelled by the patient.
 * Business rule: cancellation allowed up to 1 hour before the slot.
 * @returns {boolean}
 */
appointmentSchema.methods.isCancellable = function () {
  if (['completed', 'cancelled', 'no-show', 'in-progress'].includes(this.status)) {
    return false;
  }
  const [h, m] = this.timeSlot.start.split(':').map(Number);
  const slotDateTime = new Date(this.date);
  slotDateTime.setHours(h, m, 0, 0);
  const oneHourBefore = new Date(slotDateTime.getTime() - 60 * 60 * 1000);
  return new Date() < oneHourBefore;
};

module.exports = mongoose.model('Appointment', appointmentSchema);

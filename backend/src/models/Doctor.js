/**
 * @fileoverview Doctor Model — extended professional profile for users with role='doctor'.
 *
 * Relationships:
 *   - One Doctor ←→ One User          (Doctor.userId → User._id)
 *   - One Doctor ←→ One Department    (Doctor.departmentId → Department._id)
 *   - One Doctor → Many Appointments  (Appointment.doctorId → Doctor._id)
 *   - One Doctor → Many Queues        (Queue.doctorId → Doctor._id)
 *   - One Doctor → Many MedicalRecords (MedicalRecord.doctorId → Doctor._id)
 *
 * Design decisions:
 *   - ratings stored as {average, count, breakdown} for O(1) read and incremental update
 *   - workingHours.slots[] allows per-day overrides (e.g. shorter Fridays)
 *   - leaveRecords[] tracks approved leaves for slot-availability calculations
 */

const mongoose = require('mongoose');

// ─── Sub-schema: Working Hours ─────────────────────────────────────────────────
/**
 * Default weekly schedule. Override per-day if needed via dailyOverrides.
 */
const workingHoursSchema = new mongoose.Schema(
  {
    /** Opening time in 24-h format, e.g. '09:00' */
    start: {
      type: String,
      required: [true, 'Working hours start time is required'],
      match: [/^\d{2}:\d{2}$/, 'Start time must be in HH:MM format'],
      default: '09:00',
    },

    /** Closing time in 24-h format, e.g. '17:00' */
    end: {
      type: String,
      required: [true, 'Working hours end time is required'],
      match: [/^\d{2}:\d{2}$/, 'End time must be in HH:MM format'],
      default: '17:00',
    },

    /** Active working days */
    days: {
      type: [String],
      enum: {
        values: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        message: '{VALUE} is not a valid day',
      },
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      validate: {
        validator: (arr) => arr.length > 0,
        message: 'At least one working day is required',
      },
    },
  },
  { _id: false }
);

// ─── Sub-schema: Leave Record ──────────────────────────────────────────────────
/**
 * Tracks approved leaves so the slot-availability API can exclude them.
 */
const leaveRecordSchema = new mongoose.Schema(
  {
    /** Start date of leave period (inclusive) */
    fromDate: {
      type: Date,
      required: true,
    },

    /** End date of leave period (inclusive) */
    toDate: {
      type: Date,
      required: true,
    },

    /** Reason surfaced to patients as 'Doctor unavailable' */
    reason: {
      type: String,
      trim: true,
      maxlength: [200, 'Leave reason cannot exceed 200 characters'],
    },

    /** Approved by admin */
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { _id: true, timestamps: true }
);

// ─── Sub-schema: Rating Breakdown ─────────────────────────────────────────────
/**
 * Stores star-count distribution for efficient average recalculation.
 * breakdown: { 1: 3, 2: 5, 3: 10, 4: 22, 5: 60 }
 */
const ratingSchema = new mongoose.Schema(
  {
    /** Weighted average (auto-calculated on review) */
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
      set: (v) => Math.round(v * 10) / 10, // round to 1 decimal
    },

    /** Total number of reviews submitted */
    count: {
      type: Number,
      default: 0,
      min: 0,
    },

    /** Star distribution map  */
    breakdown: {
      1: { type: Number, default: 0 },
      2: { type: Number, default: 0 },
      3: { type: Number, default: 0 },
      4: { type: Number, default: 0 },
      5: { type: Number, default: 0 },
    },
  },
  { _id: false }
);

// ─── Main Doctor Schema ────────────────────────────────────────────────────────
const doctorSchema = new mongoose.Schema(
  {
    /**
     * Reference to the base User document.
     * Name, email, phone, avatar are on User — populate when needed.
     */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
    },

    /**
     * Reference to the Department this doctor belongs to.
     * Used for filtering on the patient-facing doctor-list page.
     */
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      index: true,
    },

    /** Medical specialty (should match Department name) */
    specialty: {
      type: String,
      required: [true, 'Specialty is required'],
      trim: true,
      maxlength: [100, 'Specialty cannot exceed 100 characters'],
      index: true,
    },

    /** Academic and professional qualifications, e.g. ['MBBS', 'MD', 'DM'] */
    qualifications: {
      type: [String],
      required: [true, 'At least one qualification is required'],
      validate: {
        validator: (arr) => arr.length > 0,
        message: 'At least one qualification is required',
      },
    },

    /** Years of clinical experience */
    experience: {
      type: Number,
      required: [true, 'Experience is required'],
      min: [0, 'Experience cannot be negative'],
      max: [60, 'Experience seems too high — please verify'],
    },

    /**
     * Medical registration / license number.
     * Used for compliance verification.
     */
    licenseNumber: {
      type: String,
      trim: true,
      unique: true,
      sparse: true, // allow null during registration, set later
    },

    /** Standard weekly schedule */
    workingHours: {
      type: workingHoursSchema,
      required: true,
      default: () => ({}),
    },

    /** Duration of each consultation slot in minutes */
    consultationDuration: {
      type: Number,
      enum: {
        values: [10, 15, 20, 30, 45, 60],
        message: 'Consultation duration must be 10, 15, 20, 30, 45, or 60 minutes',
      },
      default: 15,
    },

    /** Consultation fee in local currency (INR) */
    fee: {
      type: Number,
      required: [true, 'Consultation fee is required'],
      min: [0, 'Fee cannot be negative'],
    },

    /** Short biography shown on the doctor's public profile */
    bio: {
      type: String,
      trim: true,
      maxlength: [1000, 'Bio cannot exceed 1000 characters'],
    },

    /** Languages spoken — helps patients choose the right doctor */
    languages: {
      type: [String],
      default: ['English'],
    },

    /** Profile photo separate from User.avatar (can be clinic photo) */
    profileImage: {
      type: String,
    },

    /** Aggregate rating object (see ratingSchema) */
    rating: {
      type: ratingSchema,
      default: () => ({}),
    },

    /** Whether the doctor accepts new appointments today */
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },

    /** Temporary break status (e.g., lunch break) — affects queue display */
    isOnBreak: {
      type: Boolean,
      default: false,
    },

    /** Approved leave periods — slot API excludes dates in this list */
    leaveRecords: {
      type: [leaveRecordSchema],
      default: [],
    },

    /** Maximum number of patients per day (0 = unlimited) */
    maxPatientsPerDay: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON:  { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ───────────────────────────────────────────────────────────────────
doctorSchema.index({ userId: 1 });
doctorSchema.index({ specialty: 1, isAvailable: 1 });          // patient doctor-search
doctorSchema.index({ departmentId: 1, isAvailable: 1 });       // department filter
doctorSchema.index({ 'rating.average': -1 });                  // sort by top-rated

// ─── Virtuals ─────────────────────────────────────────────────────────────────
/**
 * Virtual: User details (name, email, phone, avatar) for the doctor.
 * Usage: Doctor.findById(id).populate('user')
 */
doctorSchema.virtual('user', {
  ref:        'User',
  localField:  'userId',
  foreignField: '_id',
  justOne:    true,
});

/**
 * Virtual: All appointments for this doctor.
 * Usage: Doctor.findById(id).populate('appointments')
 */
doctorSchema.virtual('appointments', {
  ref:        'Appointment',
  localField:  '_id',
  foreignField: 'doctorId',
});

// ─── Instance Methods ──────────────────────────────────────────────────────────
/**
 * Check if the doctor is on leave on a given date.
 * @param {Date} date
 * @returns {boolean}
 */
doctorSchema.methods.isOnLeave = function (date) {
  const check = new Date(date);
  check.setHours(0, 0, 0, 0);
  return this.leaveRecords.some((leave) => {
    const from = new Date(leave.fromDate);
    const to   = new Date(leave.toDate);
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);
    return check >= from && check <= to;
  });
};

/**
 * Recalculate and save the average rating from the breakdown object.
 * Call this after inserting a new review.
 * @returns {Promise<void>}
 */
doctorSchema.methods.recalculateRating = async function () {
  const bd = this.rating.breakdown;
  let total = 0;
  let count = 0;
  for (let star = 1; star <= 5; star++) {
    const starCount = bd[star] || 0;
    total += star * starCount;
    count += starCount;
  }
  this.rating.average = count > 0 ? total / count : 0;
  this.rating.count   = count;
  await this.save();
};

module.exports = mongoose.model('Doctor', doctorSchema);

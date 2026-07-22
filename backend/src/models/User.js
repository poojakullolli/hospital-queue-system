/**
 * @fileoverview User Model — base identity for all roles (Patient, Doctor, Admin).
 *
 * Relationships:
 *   - One User (role=doctor) → One Doctor profile (Doctor.userId)
 *   - One User (role=patient) → Many Appointments (Appointment.patientId)
 *   - One User → Many Notifications (Notification.userId)
 *   - One User → Many MedicalRecords as patient (MedicalRecord.patientId)
 *
 * Role-specific extended data is stored in:
 *   - Doctor.js  (for role === 'doctor')
 *   - Embedded `patientProfile` sub-document (for role === 'patient')
 *   - Embedded `adminProfile`   sub-document (for role === 'admin')
 */

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

// ─── Sub-schema: Patient Profile ──────────────────────────────────────────────
/**
 * Extended patient-specific data embedded inside the User document.
 * Avoids a separate collection for simple demographic fields.
 */
const patientProfileSchema = new mongoose.Schema(
  {
    /** Date of birth — used to calculate age virtually */
    dateOfBirth: {
      type: Date,
      validate: {
        validator: (v) => !v || v < new Date(),
        message: 'Date of birth cannot be in the future',
      },
    },

    /** Biological sex — used for medical record context */
    gender: {
      type: String,
      enum: {
        values: ['male', 'female', 'other', 'prefer_not_to_say'],
        message: '{VALUE} is not a valid gender',
      },
    },

    /** Blood group — critical for emergencies */
    bloodGroup: {
      type: String,
      enum: {
        values: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'],
        message: '{VALUE} is not a valid blood group',
      },
      default: 'unknown',
    },

    /** Known drug / food allergies */
    allergies: {
      type: [String],
      default: [],
    },

    /** Ongoing chronic conditions (e.g., Diabetes, Hypertension) */
    chronicConditions: {
      type: [String],
      default: [],
    },

    /** Emergency contact information */
    emergencyContact: {
      name: {
        type: String,
        trim: true,
        maxlength: [60, 'Emergency contact name cannot exceed 60 characters'],
      },
      phone: {
        type: String,
        maxlength: [20, 'Phone number cannot exceed 20 characters'],
      },
      relationship: {
        type: String,
        trim: true,
      },
    },

    /** Insurance details for billing integration */
    insurance: {
      provider:   { type: String, trim: true },
      policyNumber: { type: String, trim: true },
      expiryDate:  { type: Date },
    },

    /** Patient's full mailing address */
    address: {
      street: { type: String, trim: true },
      city:   { type: String, trim: true },
      state:  { type: String, trim: true },
      zip:    { type: String, trim: true },
      country: { type: String, trim: true, default: 'India' },
    },
  },
  { _id: false } // embedded — no separate _id needed
);

// ─── Sub-schema: Admin Profile ─────────────────────────────────────────────────
/**
 * Minimal admin-specific metadata (permissions, department access).
 */
const adminProfileSchema = new mongoose.Schema(
  {
    /** Granular permission flags for admin sub-roles */
    permissions: {
      manageUsers:       { type: Boolean, default: true },
      manageDoctors:     { type: Boolean, default: true },
      manageDepartments: { type: Boolean, default: true },
      viewAnalytics:     { type: Boolean, default: true },
      manageSettings:    { type: Boolean, default: false },
    },

    /** Department(s) the admin oversees — empty means system-wide admin */
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    },

    /** Internal employee ID */
    employeeId: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

// ─── Main User Schema ──────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema(
  {
    /** Full display name */
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [80, 'Name cannot exceed 80 characters'],
    },

    /** Unique email — used for login and notifications */
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
    },

    /** Hashed password — excluded from queries by default (select: false) */
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },

    /** System role — determines access level and profile type */
    role: {
      type: String,
      enum: {
        values: ['patient', 'doctor', 'admin'],
        message: 'Role must be patient, doctor, or admin',
      },
      default: 'patient',
    },

    /** Contact phone number */
    phone: {
      type: String,
      trim: true,
      match: [/^\+?[\d\s\-().]{7,20}$/, 'Please provide a valid phone number'],
    },

    /** URL or filename of profile avatar */
    avatar: {
      type: String,
      default: 'default-avatar.png',
    },

    /** Soft-delete / deactivation flag (admin can disable accounts) */
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    /** Email verification */
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },

    /** Stored hashed refresh token for JWT rotation */
    refreshToken: {
      type: String,
      select: false,
    },

    /**
     * Password reset flow fields.
     * resetPasswordToken is a hashed version of the raw token sent by email.
     */
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpire: {
      type: Date,
      select: false,
    },

    /** Last successful login timestamp */
    lastLogin: {
      type: Date,
    },

    /** Notification preferences */
    notificationPreferences: {
      email: { type: Boolean, default: true },
      sms:   { type: Boolean, default: false },
      push:  { type: Boolean, default: true },
    },

    // ── Role-specific embedded profiles ──────────────────────────────────────
    /** Patient profile — populated only when role === 'patient' */
    patientProfile: {
      type: patientProfileSchema,
      default: () => ({}),
    },

    /** Admin profile — populated only when role === 'admin' */
    adminProfile: {
      type: adminProfileSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true, // adds createdAt, updatedAt
    toJSON:  { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ───────────────────────────────────────────────────────────────────
userSchema.index({ email: 1 });               // fast login lookups
userSchema.index({ role: 1, isActive: 1 });   // admin user-management filters
userSchema.index({ createdAt: -1 });           // recent-first sorts

// ─── Virtuals ─────────────────────────────────────────────────────────────────
/**
 * Computed age from patientProfile.dateOfBirth.
 * Returns null if not a patient or DOB not set.
 */
userSchema.virtual('patientProfile.age').get(function () {
  const dob = this.patientProfile && this.patientProfile.dateOfBirth;
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
});

/**
 * Virtual to retrieve the Doctor profile document for doctor users.
 * Usage: await User.findById(id).populate('doctorProfile')
 */
userSchema.virtual('doctorProfile', {
  ref:        'Doctor',
  localField:  '_id',
  foreignField: 'userId',
  justOne:    true,
});

// ─── Middleware / Hooks ────────────────────────────────────────────────────────
/**
 * Pre-save: Hash password with bcrypt if it was modified.
 * Also stamps lastLogin when refreshToken is set (proxy for login events).
 */
userSchema.pre('save', async function (next) {
  // Only re-hash when password field changed
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

/**
 * Pre-query: Automatically filter out deactivated users in all find queries
 * unless the query explicitly sets { includeInactive: true }.
 * NOTE: Controllers that need inactive users should chain .setOptions({ includeInactive: true }).
 */
// userSchema.pre(/^find/, function (next) {
//   if (!this.getOptions().includeInactive) {
//     this.where({ isActive: true });
//   }
//   next();
// });

// ─── Instance Methods ──────────────────────────────────────────────────────────
/**
 * Compare plain-text password against the stored bcrypt hash.
 * @param {string} enteredPassword - Password supplied at login
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

/**
 * Return a clean user object without sensitive fields.
 * Useful for API responses.
 * @returns {Object}
 */
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpire;
  delete obj.emailVerificationToken;
  return obj;
};

// ─── Static Methods ────────────────────────────────────────────────────────────
/**
 * Find an active user by email and include the password field.
 * Used specifically during login.
 * @param {string} email
 * @returns {Promise<User|null>}
 */
userSchema.statics.findByEmailWithPassword = function (email) {
  return this.findOne({ email, isActive: true }).select('+password +refreshToken');
};

module.exports = mongoose.model('User', userSchema);

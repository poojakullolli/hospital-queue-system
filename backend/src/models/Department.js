/**
 * @fileoverview Department Model — hospital department / specialty grouping.
 *
 * Relationships:
 *   - One Department → Many Doctors       (Doctor.departmentId → Department._id)
 *   - One Department → One Head Doctor    (Department.headDoctorId → Doctor._id)
 *   - One Admin User may manage one Department (User.adminProfile.department)
 *
 * Design:
 *   - Departments are referenced from Doctors for specialty-based search.
 *   - `stats` virtual provides denormalized counts for admin dashboards.
 */

const mongoose = require('mongoose');

// ─── Main Department Schema ────────────────────────────────────────────────────
const departmentSchema = new mongoose.Schema(
  {
    /** Unique department name, e.g. 'Cardiology' */
    name: {
      type: String,
      required: [true, 'Department name is required'],
      unique: true,
      trim: true,
      maxlength: [100, 'Department name cannot exceed 100 characters'],
    },

    /**
     * URL-friendly slug generated from name.
     * E.g. 'General Medicine' → 'general-medicine'
     */
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },

    /** Brief patient-facing description of services offered */
    description: {
      type: String,
      required: [true, 'Department description is required'],
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },

    /** Lucide / FontAwesome icon name or emoji for UI display */
    icon: {
      type: String,
      trim: true,
      default: 'stethoscope',
    },

    /** Banner or logo image URL for the department's public page */
    image: {
      type: String,
    },

    /** Doctor who leads/heads this department */
    headDoctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
    },

    /**
     * Floor / wing location in the hospital building.
     * Helps patients navigate to the right area.
     */
    location: {
      building: { type: String, trim: true },
      floor:    { type: String, trim: true },
      wing:     { type: String, trim: true },
      roomNumbers: { type: [String], default: [] },
    },

    /** Contact details specific to this department */
    contact: {
      phone:     { type: String, trim: true },
      extension: { type: String, trim: true },
      email:     { type: String, trim: true, lowercase: true },
    },

    /** Services and procedures offered (for SEO and patient info) */
    services: {
      type: [String],
      default: [],
    },

    /** Average waiting time across all doctors in this department (minutes) */
    averageWaitTime: {
      type: Number,
      default: 0,
      min: 0,
    },

    /** Patient-facing operational status */
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    /** Display order on the public departments list page */
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON:  { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ───────────────────────────────────────────────────────────────────
departmentSchema.index({ isActive: 1, sortOrder: 1 }); // default public list sort

// ─── Virtuals ─────────────────────────────────────────────────────────────────
/**
 * All doctors in this department.
 * Usage: Department.findById(id).populate('doctors')
 */
departmentSchema.virtual('doctors', {
  ref:        'Doctor',
  localField:  '_id',
  foreignField: 'departmentId',
});

// ─── Middleware / Hooks ────────────────────────────────────────────────────────
/**
 * Pre-save: auto-generate slug from name if not provided.
 */
departmentSchema.pre('save', function () {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
});

// ─── Instance Methods ──────────────────────────────────────────────────────────
/**
 * Returns a short summary object for use in dropdown lists.
 * @returns {{ id: string, name: string, slug: string, icon: string }}
 */
departmentSchema.methods.toSelectOption = function () {
  return {
    id:   this._id,
    name: this.name,
    slug: this.slug,
    icon: this.icon,
  };
};

module.exports = mongoose.model('Department', departmentSchema);

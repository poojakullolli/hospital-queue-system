const mongoose = require('mongoose');

const autoSeedAdminAndDevData = async () => {
  try {
    const User = require('../models/User');
    const Doctor = require('../models/Doctor');
    const Department = require('../models/Department');

    // 1. Ensure default Admin user exists
    const adminEmail = 'admin@hospital.com';
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      admin = await User.create({
        name: 'System Admin',
        email: adminEmail,
        password: 'Admin@123',
        role: 'admin',
        isActive: true,
        isEmailVerified: true,
        adminProfile: {
          permissions: {
            manageUsers: true,
            manageDoctors: true,
            manageDepartments: true,
            viewAnalytics: true,
            manageSettings: true,
          },
        },
      });
      console.log('✅ Auto-seeded default admin account: admin@hospital.com / Admin@123');
    }

    // 2. Auto-seed sample doctor & patient if database is empty (e.g. MongoMemoryServer restart)
    const totalUsers = await User.countDocuments();
    if (totalUsers <= 1) {
      console.log('ℹ️  Empty database detected. Auto-seeding default departments, doctors, and patients...');

      // Department
      let dept = await Department.findOne({ name: 'General Medicine' });
      if (!dept) {
        dept = await Department.create({
          name: 'General Medicine',
          description: 'Primary healthcare and general medical consultations',
          icon: 'Stethoscope',
          isActive: true,
        });
      }

      // Doctor
      let docUser = await User.findOne({ email: 'doctor1@example.com' });
      if (!docUser) {
        docUser = await User.create({
          name: 'Dr. Sarah Jenkins',
          email: 'doctor1@example.com',
          password: 'Doctor@123',
          role: 'doctor',
          phone: '+1 555-0199',
          isActive: true,
          isEmailVerified: true,
        });

        await Doctor.create({
          userId: docUser._id,
          departmentId: dept._id,
          specialty: 'General Medicine',
          qualifications: ['MBBS', 'MD'],
          experience: 8,
          fee: 500,
          isAvailable: true,
        });
        console.log('✅ Auto-seeded default doctor: doctor1@example.com / Doctor@123');
      }

      // Patient
      let patUser = await User.findOne({ email: 'patient1@example.com' });
      if (!patUser) {
        await User.create({
          name: 'John Smith',
          email: 'patient1@example.com',
          password: 'Patient@123',
          role: 'patient',
          phone: '+1 555-0122',
          isActive: true,
          isEmailVerified: true,
        });
        console.log('✅ Auto-seeded default patient: patient1@example.com / Patient@123');
      }
    }
  } catch (err) {
    console.error('⚠️  Auto-seed warning:', err.message);
  }
};

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 2500 });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    await autoSeedAdminAndDevData();
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      try {
        console.log('ℹ️  Local MongoDB daemon not running. Launching MongoMemoryServer...');
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();
        process.env.MONGODB_URI = uri;
        const conn = await mongoose.connect(uri);
        console.log(`✅ MongoDB Memory Server Connected: ${conn.connection.host}`);
        await autoSeedAdminAndDevData();
        return;
      } catch (memErr) {
        console.error('❌ Failed to start MongoMemoryServer:', memErr.message);
      }
    }
    console.error(`❌ MongoDB connection error: ${error.message}`);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
  }
};

mongoose.connection.on('disconnected', () => {
  if (process.env.NODE_ENV !== 'test') {
    console.warn('⚠️  MongoDB disconnected');
  }
});

mongoose.connection.on('error', (err) => {
  if (process.env.NODE_ENV !== 'test') {
    console.error('MongoDB error:', err);
  }
});

module.exports = connectDB;

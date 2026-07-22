require('dotenv').config();
const mongoose = require('mongoose');
const User        = require('../models/User');
const Doctor      = require('../models/Doctor');
const Department  = require('../models/Department');
const Appointment = require('../models/Appointment');
const Queue       = require('../models/Queue');
const Notification   = require('../models/Notification');
const MedicalRecord  = require('../models/MedicalRecord');
const generateQueueNumber = require('../utils/generateQueueNumber');
const queueService        = require('../services/queueService');

const seedDB = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected');

    console.log('Clearing existing data...');
    await MedicalRecord.deleteMany();
    await Notification.deleteMany();
    await Queue.deleteMany();
    await Appointment.deleteMany();
    await Doctor.deleteMany();
    await Department.deleteMany();
    await User.deleteMany();
    console.log('Data cleared');

    console.log('Creating Admin...');
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@hospital.com',
      password: 'Admin@123456',
      role: 'admin',
      phone: '1234567890'
    });

    console.log('Creating Departments...');
    const departments = await Department.create([
      { name: 'Cardiology',      description: 'Heart and blood vessel conditions',            icon: 'heart',         services: ['ECG', 'Echocardiography', 'Cardiac Catheterization'] },
      { name: 'Neurology',       description: 'Brain, spinal cord and nervous system',         icon: 'brain',         services: ['EEG', 'MRI Brain', 'Nerve Conduction Study'] },
      { name: 'Orthopedics',     description: 'Bones, joints, ligaments, tendons, and muscles', icon: 'bone',         services: ['X-ray', 'Joint Replacement', 'Physiotherapy'] },
      { name: 'Dermatology',     description: 'Skin, hair, and nail conditions',               icon: 'sparkles',      services: ['Skin Biopsy', 'Patch Test', 'Laser Therapy'] },
      { name: 'Pediatrics',      description: 'Medical care for infants, children, and adolescents', icon: 'baby',    services: ['Vaccinations', 'Growth Assessment', 'Developmental Screening'] },
      { name: 'General Medicine', description: 'Primary care and general health issues',       icon: 'stethoscope',   services: ['Annual Physical', 'Blood Tests', 'Health Screening'] },
    ]);

    console.log('Creating Doctors...');
    const doctorUsers = [];
    for (let i = 1; i <= 8; i++) {
      const user = await User.create({
        name: `Doctor ${i}`,
        email: `doctor${i}@example.com`,
        password: 'Doctor@123',
        role: 'doctor',
        phone: `987654321${i}`
      });
      doctorUsers.push(user);
    }

    const doctorProfiles = [];
    const specialties = ['Cardiology', 'Neurology', 'Orthopedics', 'Dermatology', 'Pediatrics', 'General Medicine', 'Cardiology', 'General Medicine'];
    
    for (let i = 0; i < 8; i++) {
      // Find the matching department to link departmentId
      const dept = departments.find(d => d.name === specialties[i]);
      const profile = await Doctor.create({
        userId:              doctorUsers[i]._id,
        departmentId:        dept ? dept._id : undefined,
        specialty:           specialties[i],
        qualifications:      ['MBBS', 'MD'],
        experience:          5 + i,
        workingHours: {
          start: '09:00',
          end:   '17:00',
          days:  ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        },
        consultationDuration: i % 2 === 0 ? 15 : 30,
        fee:                 500 + (i * 100),
        bio:                 `Experienced specialist in ${specialties[i]} with ${5 + i} years of practice.`,
        languages:           ['English', 'Hindi'],
      });
      doctorProfiles.push(profile);
      
      // Set department head to first doctor of that specialty
      if (dept && !dept.headDoctorId) {
        dept.headDoctorId = profile._id;
        await dept.save();
      }
    }

    console.log('Creating Patients...');
    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'O+', 'O-'];
    const genders     = ['male', 'female', 'other'];
    const patients = [];
    for (let i = 1; i <= 15; i++) {
      const patient = await User.create({
        name:  `Patient ${i}`,
        email: `patient${i}@example.com`,
        password: 'Patient@123',
        role: 'patient',
        phone: `12312312${i.toString().padStart(2, '0')}`,
        patientProfile: {
          dateOfBirth:   new Date(1980 + i, i % 12, (i % 28) + 1),
          gender:        genders[i % genders.length],
          bloodGroup:    bloodGroups[i % bloodGroups.length],
          allergies:     i % 3 === 0 ? ['Penicillin'] : [],
          chronicConditions: i % 5 === 0 ? ['Hypertension'] : [],
          emergencyContact: {
            name:         `Emergency Contact ${i}`,
            phone:        `98765432${i.toString().padStart(2, '0')}`,
            relationship: 'Spouse',
          },
        },
      });
      patients.push(patient);
    }

    console.log('Creating Appointments and Queues...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 20; i++) {
      const patient = patients[Math.floor(Math.random() * patients.length)];
      const doctor = doctorProfiles[Math.floor(Math.random() * doctorProfiles.length)];
      
      // Spread across next 7 days
      const daysToAdd = Math.floor(Math.random() * 7);
      const aptDate = new Date(today);
      aptDate.setDate(today.getDate() + daysToAdd);

      // Random time between 9 and 16
      const hour = 9 + Math.floor(Math.random() * 7);
      const minute = doctor.consultationDuration === 15 ? (Math.floor(Math.random() * 4) * 15) : (Math.floor(Math.random() * 2) * 30);
      
      const startStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const endMin = minute + doctor.consultationDuration;
      const endHour = hour + Math.floor(endMin / 60);
      const finalEndMin = endMin % 60;
      const endStr = `${endHour.toString().padStart(2, '0')}:${finalEndMin.toString().padStart(2, '0')}`;

      const queueNumber = await generateQueueNumber(doctor._id, aptDate);

      const appointment = await Appointment.create({
        patientId:      patient._id,
        doctorId:       doctor._id,
        date:           aptDate,
        timeSlot:       { start: startStr, end: endStr },
        queueNumber,
        status:         'pending',
        chiefComplaint: 'Routine check-up',
        payment: {
          amount:   doctor.fee,
          currency: 'INR',
          status:   'pending',
          method:   'online',
        },
      });

      // Add to queue
      await queueService.addToQueue(doctor._id, appointment._id, aptDate);
    }

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedDB();

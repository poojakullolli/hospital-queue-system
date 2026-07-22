const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER, // generated ethereal user
      pass: process.env.SMTP_PASS, // generated ethereal password
    },
  });
};

const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();
    
    const message = {
      from: `${process.env.FROM_NAME || 'Hospital App'} <${process.env.FROM_EMAIL || 'noreply@hospitalapp.com'}>`,
      to: options.email,
      subject: options.subject,
      html: options.html,
    };

    const info = await transporter.sendMail(message);
    console.log('Message sent: %s', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

const sendAppointmentConfirmation = async (patient, doctor, appointment) => {
  const formattedDate = new Date(appointment.date).toLocaleDateString();
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
      <h2 style="color: #2c3e50; text-align: center;">Appointment Confirmed</h2>
      <p>Dear ${patient.name},</p>
      <p>Your appointment has been successfully booked.</p>
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Doctor:</strong> Dr. ${doctor.userId.name} (${doctor.specialty})</p>
        <p><strong>Date:</strong> ${formattedDate}</p>
        <p><strong>Time:</strong> ${appointment.timeSlot.start} - ${appointment.timeSlot.end}</p>
        <p><strong>Queue Number:</strong> ${appointment.queueNumber}</p>
      </div>
      <p>Please arrive 15 minutes before your scheduled time.</p>
      <p>Thank you for choosing our hospital.</p>
    </div>
  `;
  
  return sendEmail({
    email: patient.email,
    subject: 'Appointment Confirmation',
    html,
  });
};

const sendAppointmentCancellation = async (patient, doctor, appointment, reason) => {
  const formattedDate = new Date(appointment.date).toLocaleDateString();
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
      <h2 style="color: #e74c3c; text-align: center;">Appointment Cancelled</h2>
      <p>Dear ${patient.name},</p>
      <p>Your appointment has been cancelled.</p>
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Doctor:</strong> Dr. ${doctor.userId.name}</p>
        <p><strong>Date:</strong> ${formattedDate}</p>
        <p><strong>Time:</strong> ${appointment.timeSlot.start} - ${appointment.timeSlot.end}</p>
        <p><strong>Reason:</strong> ${reason || 'Not specified'}</p>
      </div>
      <p>We apologize for any inconvenience. Please feel free to book a new appointment.</p>
    </div>
  `;
  
  return sendEmail({
    email: patient.email,
    subject: 'Appointment Cancelled',
    html,
  });
};

const sendQueueCallNotification = async (patient, doctor, appointment) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
      <h2 style="color: #27ae60; text-align: center;">It's Your Turn!</h2>
      <p>Dear ${patient.name},</p>
      <p>Dr. ${doctor.userId.name} is ready to see you now.</p>
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
        <h3 style="margin: 0; color: #2c3e50;">Queue Number</h3>
        <h1 style="margin: 10px 0; color: #3498db; font-size: 48px;">${appointment.queueNumber}</h1>
      </div>
      <p>Please proceed to the consultation room.</p>
    </div>
  `;
  
  return sendEmail({
    email: patient.email,
    subject: "It's your turn!",
    html,
  });
};

const sendWelcomeEmail = async (user) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
      <h2 style="color: #2c3e50; text-align: center;">Welcome to Hospital App</h2>
      <p>Dear ${user.name},</p>
      <p>Welcome to our Smart Appointment and Live Queue Management System.</p>
      <p>You can now easily book appointments, track your queue status in real-time, and manage your health records.</p>
      <p>We look forward to serving you!</p>
    </div>
  `;
  
  return sendEmail({
    email: user.email,
    subject: 'Welcome to Hospital App',
    html,
  });
};

const sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = \`\${process.env.FRONTEND_URL}/reset-password?token=\${resetToken}\`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
      <h2 style="color: #2c3e50; text-align: center;">Password Reset Request</h2>
      <p>Dear ${user.name},</p>
      <p>You requested a password reset. Click the button below to reset your password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
      </div>
      <p>If you didn't request this, please ignore this email.</p>
      <p>This link will expire in 10 minutes.</p>
    </div>
  `;
  
  return sendEmail({
    email: user.email,
    subject: 'Password Reset Request',
    html,
  });
};

module.exports = {
  createTransporter,
  sendAppointmentConfirmation,
  sendAppointmentCancellation,
  sendQueueCallNotification,
  sendWelcomeEmail,
  sendPasswordResetEmail,
};

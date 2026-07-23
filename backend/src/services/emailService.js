/**
 * @fileoverview Email Service — Nodemailer-based email delivery for all system events.
 *
 * Environment variables used:
 *   EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE, EMAIL_USER, EMAIL_PASS, EMAIL_FROM
 *   FRONTEND_URL — base URL prepended to email links
 *
 * All functions return a Promise<boolean> (true = sent, false = failed silently).
 * Failures are logged but never throw — email is non-critical infrastructure.
 */

const nodemailer = require('nodemailer');

// ─── Transporter Factory ───────────────────────────────────────────────────────
/**
 * Create and return a Nodemailer SMTP transporter.
 * Call once per send (stateless — avoids stale connection issues in dev).
 * @returns {nodemailer.Transporter}
 */
const createTransporter = () => {
  if (process.env.NODE_ENV === 'test') {
    return {
      sendMail: async (options) => ({ messageId: 'test-mock-id' }),
    };
  }

  return nodemailer.createTransport({
    host:   process.env.EMAIL_HOST || 'smtp.gmail.com',
    port:   parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true', // true for port 465
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
  });
};

// ─── Base Send Helper ──────────────────────────────────────────────────────────
/**
 * Low-level send utility shared by all email functions.
 * @param {{ email: string, subject: string, html: string, text?: string }} options
 * @returns {Promise<boolean>}
 */
const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();

    const message = {
      from:    process.env.EMAIL_FROM || 'MediQueue <noreply@mediqueue.com>',
      to:      options.email,
      subject: options.subject,
      html:    options.html,
      text:    options.text || options.html.replace(/<[^>]*>/g, ''), // plaintext fallback
    };

    const info = await transporter.sendMail(message);
    console.log(`📧 Email sent [${options.subject}] → ${options.email} (ID: ${info.messageId})`);
    return true;
  } catch (error) {
    console.error(`❌ Email send failed [${options.subject}] → ${options.email}:`, error.message);
    return false;
  }
};

// ─── Shared HTML Wrapper ───────────────────────────────────────────────────────
/**
 * Wrap email body HTML in a consistent branded layout.
 * @param {string} body - Inner HTML content
 * @param {string} [accentColor='#0891b2'] - Header accent color
 * @returns {string}
 */
const emailWrapper = (body, accentColor = '#0891b2') => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MediQueue Notification</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:30px 15px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:${accentColor};padding:24px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">
              🏥 MediQueue
            </h1>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">
              Smart Hospital Queue Management
            </p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            ${body}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">
              © ${new Date().getFullYear()} MediQueue Hospital System. All rights reserved.<br>
              This email was sent automatically. Please do not reply to this email.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

// ─── Email: Welcome ────────────────────────────────────────────────────────────
/**
 * Send a welcome email after successful registration.
 * @param {{ name: string, email: string, role: string }} user
 * @returns {Promise<boolean>}
 */
const sendWelcomeEmail = async (user) => {
  const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;

  const body = `
    <h2 style="margin:0 0 16px;color:#0f172a;font-size:22px;">
      Welcome aboard, ${user.name}! 🎉
    </h2>
    <p style="color:#475569;line-height:1.6;">
      Your ${user.role} account has been created successfully on <strong>MediQueue</strong>.
    </p>
    <div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:16px;margin:24px 0;border-radius:4px;">
      <p style="margin:0;color:#166534;font-size:14px;">
        <strong>Account Role:</strong> ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}<br>
        <strong>Email:</strong> ${user.email}
      </p>
    </div>
    <p style="color:#475569;line-height:1.6;">
      ${user.role === 'patient'
        ? 'You can now book appointments, track your queue status in real-time, and access your medical records.'
        : user.role === 'doctor'
        ? 'You can now manage your appointments, control your queue, and access patient records.'
        : 'You now have full administrative access to the hospital management system.'}
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${dashboardUrl}"
         style="background:#0891b2;color:#ffffff;padding:12px 32px;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;display:inline-block;">
        Get Started
      </a>
    </div>
    <p style="color:#94a3b8;font-size:13px;">
      If you did not create this account, please contact our support team immediately.
    </p>`;

  return sendEmail({
    email:   user.email,
    subject: '🎉 Welcome to MediQueue — Your Account is Ready',
    html:    emailWrapper(body, '#0891b2'),
  });
};

// ─── Email: Email Verification ─────────────────────────────────────────────────
/**
 * Send an email verification link after registration.
 * The raw token is embedded in the URL; the DB stores the hashed version.
 * @param {{ name: string, email: string }} user
 * @param {string} rawToken - Plain-text token (NOT the hashed version)
 * @returns {Promise<boolean>}
 */
const sendEmailVerification = async (user, rawToken) => {
  const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${rawToken}`;

  const body = `
    <h2 style="margin:0 0 16px;color:#0f172a;font-size:22px;">
      Verify Your Email Address
    </h2>
    <p style="color:#475569;line-height:1.6;">
      Hi ${user.name}, please click the button below to verify your email address and activate your MediQueue account.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${verifyUrl}"
         style="background:#0891b2;color:#ffffff;padding:12px 32px;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;display:inline-block;">
        Verify Email Address
      </a>
    </div>
    <p style="color:#475569;font-size:14px;line-height:1.6;">
      Or copy and paste this link into your browser:<br>
      <a href="${verifyUrl}" style="color:#0891b2;word-break:break-all;">${verifyUrl}</a>
    </p>
    <div style="background:#fef9c3;border-left:4px solid #eab308;padding:16px;margin:24px 0;border-radius:4px;">
      <p style="margin:0;color:#713f12;font-size:13px;">
        ⏰ This link expires in <strong>24 hours</strong>.
        If you did not register for MediQueue, please ignore this email.
      </p>
    </div>`;

  return sendEmail({
    email:   user.email,
    subject: '✉️ MediQueue — Please Verify Your Email Address',
    html:    emailWrapper(body, '#0891b2'),
  });
};

// ─── Email: Password Reset ─────────────────────────────────────────────────────
/**
 * Send a password reset link.
 * @param {{ name: string, email: string }} user
 * @param {string} rawToken - Plain-text reset token
 * @returns {Promise<boolean>}
 */
const sendPasswordResetEmail = async (user, rawToken) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${rawToken}`;

  const body = `
    <h2 style="margin:0 0 16px;color:#0f172a;font-size:22px;">
      Password Reset Request
    </h2>
    <p style="color:#475569;line-height:1.6;">
      Hi ${user.name}, we received a request to reset your MediQueue account password.
      Click the button below to choose a new password:
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${resetUrl}"
         style="background:#dc2626;color:#ffffff;padding:12px 32px;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;display:inline-block;">
        Reset My Password
      </a>
    </div>
    <p style="color:#475569;font-size:14px;line-height:1.6;">
      Or copy and paste this link:<br>
      <a href="${resetUrl}" style="color:#dc2626;word-break:break-all;">${resetUrl}</a>
    </p>
    <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:16px;margin:24px 0;border-radius:4px;">
      <p style="margin:0;color:#7f1d1d;font-size:13px;">
        ⏰ This link expires in <strong>10 minutes</strong>.<br>
        If you did not request a password reset, please ignore this email —
        your password will remain unchanged.
      </p>
    </div>`;

  return sendEmail({
    email:   user.email,
    subject: '🔒 MediQueue — Password Reset Request',
    html:    emailWrapper(body, '#dc2626'),
  });
};

// ─── Email: Appointment Confirmation ──────────────────────────────────────────
/**
 * Send appointment booking confirmation to the patient.
 * @param {{ name: string, email: string }} patient
 * @param {{ userId: { name: string }, specialty: string }} doctor
 * @param {{ date: Date, timeSlot: { start: string, end: string }, queueNumber: number }} appointment
 * @returns {Promise<boolean>}
 */
const sendAppointmentConfirmation = async (patient, doctor, appointment) => {
  const formattedDate = new Date(appointment.date).toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const body = `
    <h2 style="margin:0 0 16px;color:#0f172a;font-size:22px;">
      ✅ Appointment Confirmed
    </h2>
    <p style="color:#475569;line-height:1.6;">Dear ${patient.name},</p>
    <p style="color:#475569;line-height:1.6;">Your appointment has been successfully booked. Here are the details:</p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:20px;border-radius:8px;margin:24px 0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:6px 0;color:#166534;font-size:14px;"><strong>Doctor:</strong></td>
            <td style="padding:6px 0;color:#166534;font-size:14px;">Dr. ${doctor.userId ? doctor.userId.name : 'TBD'} (${doctor.specialty})</td></tr>
        <tr><td style="padding:6px 0;color:#166534;font-size:14px;"><strong>Date:</strong></td>
            <td style="padding:6px 0;color:#166534;font-size:14px;">${formattedDate}</td></tr>
        <tr><td style="padding:6px 0;color:#166534;font-size:14px;"><strong>Time:</strong></td>
            <td style="padding:6px 0;color:#166534;font-size:14px;">${appointment.timeSlot.start} – ${appointment.timeSlot.end}</td></tr>
        <tr><td style="padding:6px 0;color:#166534;font-size:14px;"><strong>Queue No.:</strong></td>
            <td style="padding:6px 0;color:#166534;font-size:14px;font-size:20px;font-weight:700;">#${appointment.queueNumber}</td></tr>
      </table>
    </div>
    <p style="color:#475569;font-size:14px;">Please arrive <strong>15 minutes before</strong> your scheduled time with a valid ID.</p>`;

  return sendEmail({
    email:   patient.email,
    subject: '✅ Appointment Confirmed — MediQueue',
    html:    emailWrapper(body, '#22c55e'),
  });
};

// ─── Email: Appointment Cancellation ──────────────────────────────────────────
/**
 * Notify patient when appointment is cancelled.
 */
const sendAppointmentCancellation = async (patient, doctor, appointment, reason) => {
  const formattedDate = new Date(appointment.date).toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const body = `
    <h2 style="margin:0 0 16px;color:#dc2626;font-size:22px;">
      ❌ Appointment Cancelled
    </h2>
    <p style="color:#475569;line-height:1.6;">Dear ${patient.name},</p>
    <p style="color:#475569;line-height:1.6;">Your appointment has been cancelled.</p>
    <div style="background:#fef2f2;border:1px solid #fecaca;padding:20px;border-radius:8px;margin:24px 0;">
      <p style="margin:0 0 8px;color:#7f1d1d;font-size:14px;"><strong>Doctor:</strong> Dr. ${doctor.userId ? doctor.userId.name : 'TBD'}</p>
      <p style="margin:0 0 8px;color:#7f1d1d;font-size:14px;"><strong>Date:</strong> ${formattedDate}</p>
      <p style="margin:0;color:#7f1d1d;font-size:14px;"><strong>Reason:</strong> ${reason || 'Not specified'}</p>
    </div>
    <p style="color:#475569;line-height:1.6;">We apologize for any inconvenience. Please feel free to book a new appointment.</p>`;

  return sendEmail({
    email:   patient.email,
    subject: '❌ Appointment Cancelled — MediQueue',
    html:    emailWrapper(body, '#dc2626'),
  });
};

// ─── Email: Queue Call Notification ───────────────────────────────────────────
/**
 * Notify patient that it is their turn in the queue.
 */
const sendQueueCallNotification = async (patient, doctor, appointment) => {
  const body = `
    <h2 style="margin:0 0 16px;color:#0f172a;font-size:22px;">
      🔔 It's Your Turn!
    </h2>
    <p style="color:#475569;line-height:1.6;">Dear ${patient.name},</p>
    <p style="color:#475569;line-height:1.6;">
      Dr. ${doctor.userId ? doctor.userId.name : 'Your doctor'} is ready to see you now.
      Please proceed to the consultation room immediately.
    </p>
    <div style="text-align:center;background:#f0f9ff;border:1px solid #bae6fd;padding:24px;border-radius:8px;margin:24px 0;">
      <p style="margin:0;color:#0369a1;font-size:14px;font-weight:600;">YOUR QUEUE NUMBER</p>
      <p style="margin:8px 0 0;color:#0891b2;font-size:64px;font-weight:700;line-height:1;">
        ${appointment.queueNumber}
      </p>
    </div>
    <p style="color:#94a3b8;font-size:13px;text-align:center;">
      If you are not available, you may be marked as a no-show.
    </p>`;

  return sendEmail({
    email:   patient.email,
    subject: "🔔 It's Your Turn — MediQueue",
    html:    emailWrapper(body, '#0891b2'),
  });
};

// ─── Email: Password Changed Confirmation ─────────────────────────────────────
/**
 * Notify user that their password was changed successfully.
 * This is a security alert for the user.
 */
const sendPasswordChangedEmail = async (user) => {
  const body = `
    <h2 style="margin:0 0 16px;color:#0f172a;font-size:22px;">
      🔑 Password Changed Successfully
    </h2>
    <p style="color:#475569;line-height:1.6;">Hi ${user.name},</p>
    <p style="color:#475569;line-height:1.6;">
      Your MediQueue account password has been changed successfully.
    </p>
    <div style="background:#fef9c3;border-left:4px solid #eab308;padding:16px;margin:24px 0;border-radius:4px;">
      <p style="margin:0;color:#713f12;font-size:13px;">
        ⚠️ <strong>Was this you?</strong> If you did not change your password,
        your account may have been compromised. Please contact our support team immediately
        and reset your password.
      </p>
    </div>
    <p style="color:#475569;font-size:14px;">
      Changed at: <strong>${new Date().toLocaleString('en-IN')}</strong>
    </p>`;

  return sendEmail({
    email:   user.email,
    subject: '🔑 Password Changed — MediQueue Security Alert',
    html:    emailWrapper(body, '#eab308'),
  });
};

module.exports = {
  createTransporter,
  sendEmail,
  sendWelcomeEmail,
  sendEmailVerification,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendAppointmentConfirmation,
  sendAppointmentCancellation,
  sendQueueCallNotification,
};

const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// Creates reusable SMTP transporter from environment config
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Sends an email notification (non-blocking — failures are logged but don't throw)
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    // Skip sending if SMTP credentials are not configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      logger.warn('Email not sent — SMTP credentials not configured');
      return { sent: false, reason: 'SMTP not configured' };
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: `"Leave Manager" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
      to,
      subject,
      html: html || undefined,
      text: text || undefined,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent to ${to}: ${info.messageId}`);

    return { sent: true, messageId: info.messageId };
  } catch (error) {
    // Email failures should not break the main flow
    logger.error(`Email send failed: ${error.message}`);
    return { sent: false, reason: error.message };
  }
};

// Sends OTP verification email
const sendOTPEmail = async (email, name, otp) => {
  const subject = 'Your Verification Code — Leave Manager';

  const html = `
    <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="width: 50px; height: 50px; border-radius: 12px; background: #E6A817; display: inline-flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20px;">LM</div>
      </div>
      <h2 style="color: #1C1917; text-align: center; margin-bottom: 10px;">Verify Your Email</h2>
      <p style="color: #6B5E52; text-align: center;">Hi ${name}, use the code below to verify your email address.</p>
      <div style="text-align: center; margin: 30px 0;">
        <div style="display: inline-block; background: #FDF8EE; border: 2px solid #E6A817; border-radius: 12px; padding: 20px 40px; letter-spacing: 8px; font-size: 32px; font-weight: bold; color: #1C1917;">
          ${otp}
        </div>
      </div>
      <p style="color: #6B5E52; text-align: center; font-size: 14px;">This code expires in <strong>10 minutes</strong>.</p>
      <hr style="border: 1px solid #DDD5CB; margin: 30px 0;" />
      <p style="color: #A39888; font-size: 12px; text-align: center;">If you didn't request this code, please ignore this email.</p>
    </div>
  `;

  return sendEmail({ to: email, subject, html });
};

// Sends leave status notification email to employee
const sendLeaveStatusEmail = async (employeeEmail, employeeName, leaveType, status, comment) => {
  const statusLabel = status === 'approved' ? '✅ Approved' : '❌ Rejected';
  const subject = `Leave ${status.charAt(0).toUpperCase() + status.slice(1)} — ${leaveType}`;

  const html = `
    <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1C1917;">Leave Request Update</h2>
      <p>Hi ${employeeName},</p>
      <p>Your <strong>${leaveType}</strong> leave request has been <strong>${statusLabel}</strong>.</p>
      ${comment ? `<p><em>Manager's comment: "${comment}"</em></p>` : ''}
      <hr style="border: 1px solid #DDD5CB; margin: 20px 0;" />
      <p style="color: #6B5E52; font-size: 12px;">This is an automated notification from Leave Management System.</p>
    </div>
  `;

  return sendEmail({ to: employeeEmail, subject, html });
};

// Sends leave application notification email to manager
const sendLeaveApplicationEmail = async (managerEmail, employeeName, leaveType, totalDays, startDate) => {
  const subject = `New Leave Request from ${employeeName}`;

  const html = `
    <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1C1917;">New Leave Application</h2>
      <p><strong>${employeeName}</strong> has applied for leave:</p>
      <ul>
        <li><strong>Type:</strong> ${leaveType}</li>
        <li><strong>Duration:</strong> ${totalDays} day(s)</li>
        <li><strong>Starting:</strong> ${startDate}</li>
      </ul>
      <p>Please log in to review and process the request.</p>
      <hr style="border: 1px solid #DDD5CB; margin: 20px 0;" />
      <p style="color: #6B5E52; font-size: 12px;">This is an automated notification from Leave Management System.</p>
    </div>
  `;

  return sendEmail({ to: managerEmail, subject, html });
};

module.exports = { sendEmail, sendOTPEmail, sendLeaveStatusEmail, sendLeaveApplicationEmail };

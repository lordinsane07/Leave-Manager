const logger = require('../utils/logger');

// Brevo API endpoint (HTTP — works on Render, no SMTP needed)
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

// Startup diagnostic
console.log('📧 [EMAIL SERVICE] Provider: Brevo (HTTP API)');
console.log('📧 [EMAIL SERVICE] BREVO_API_KEY:', process.env.BREVO_API_KEY ? '✅ SET' : '❌ NOT SET');

// Sends an email via Brevo HTTP API
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    if (!process.env.BREVO_API_KEY) {
      console.log('📧 [EMAIL] SKIPPED — BREVO_API_KEY not set');
      logger.warn('Email not sent — BREVO_API_KEY not configured');
      return { sent: false, reason: 'Brevo API key not configured' };
    }

    console.log(`📧 [EMAIL] Sending to: ${to} | Subject: ${subject}`);

    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Leave Manager', email: process.env.BREVO_SENDER || 'debmrittick@gmail.com' },
        to: [{ email: to }],
        subject,
        htmlContent: html || undefined,
        textContent: text || undefined,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data.message || JSON.stringify(data);
      console.log(`📧 [EMAIL] ❌ FAILED to ${to} — Error: ${errMsg}`);
      logger.error(`Email send failed: ${errMsg}`);
      return { sent: false, reason: errMsg };
    }

    console.log(`📧 [EMAIL] ✅ SENT to ${to} — messageId: ${data.messageId}`);
    logger.info(`Email sent to ${to}: ${data.messageId}`);
    return { sent: true, messageId: data.messageId };
  } catch (error) {
    console.log(`📧 [EMAIL] ❌ FAILED to ${to} — Error: ${error.message}`);
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

// Sends leave expiry notification email to employee
const sendLeaveExpiredEmail = async (employeeEmail, employeeName, leaveType, startDate) => {
  const subject = `Leave Request Expired — ${leaveType}`;

  const html = `
    <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1C1917;">Leave Request Expired</h2>
      <p>Hi ${employeeName},</p>
      <p>Your <strong>${leaveType}</strong> leave request starting on <strong>${startDate}</strong> has <strong>expired</strong> because the leave start date has already passed without being processed.</p>
      <p>If you still need time off, please submit a new leave application with future dates.</p>
      <hr style="border: 1px solid #DDD5CB; margin: 20px 0;" />
      <p style="color: #6B5E52; font-size: 12px;">This is an automated notification from Leave Management System.</p>
    </div>
  `;

  return sendEmail({ to: employeeEmail, subject, html });
};

module.exports = { sendEmail, sendOTPEmail, sendLeaveStatusEmail, sendLeaveApplicationEmail, sendLeaveExpiredEmail };

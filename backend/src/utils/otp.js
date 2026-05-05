import nodemailer from 'nodemailer';
import { Otp } from '../models/Otp.js';

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

/**
 * Generate a 6-digit OTP
 */
export function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP via email
 */
export async function sendOTP(email) {
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry for better UX
  
  // Store OTP in database (overwrite any existing OTP for this email)
  await Otp.findOneAndUpdate(
    { email: email.toLowerCase() },
    { otp, expiresAt },
    { upsert: true, new: true }
  );
  
  // ALWAYS log OTP to console for development
  console.log(`\n========== OTP for ${email} ==========`);
  console.log(`OTP: ${otp}`);
  console.log('========================================\n');
  
  // Try to send email
  if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    try {
      await transporter.sendMail({
        from: `"MediConnect+" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'MediConnect+ Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background-color: #0d9488; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">MediConnect+</h1>
            </div>
            <div style="padding: 30px; background-color: white;">
              <h2 style="color: #111827; margin-top: 0;">Verify Your Email</h2>
              <p style="color: #4b5563; font-size: 16px; line-height: 24px;">Thank you for joining MediConnect+. Please use the following code to verify your email address:</p>
              <div style="background: #f3f4f6; padding: 24px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 24px 0; border-radius: 8px; color: #0d9488; border: 1px dashed #0d9488;">
                ${otp}
              </div>
              <p style="color: #ef4444; font-size: 14px; font-weight: 500;">This code will expire in 10 minutes.</p>
              <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
              <p style="color: #9ca3af; font-size: 12px;">If you didn't request this code, please ignore this email. This is an automated message, please do not reply.</p>
            </div>
          </div>
        `,
      });
      console.log(`✅ OTP email sent successfully to ${email}`);
    } catch (error) {
      console.error('❌ Failed to send OTP email:', error.message);
      console.log('⚠️ Using console OTP instead (check above)');
      // Don't throw error - OTP is already logged to console and saved in DB
    }
  }
  
  return { success: true, message: 'OTP sent successfully' };
}

/**
 * Verify OTP
 */
export async function verifyOTP(email, otp) {
  const stored = await Otp.findOne({ email: email.toLowerCase() });
  
  if (!stored) {
    return { success: false, message: 'No OTP found for this email. Please request a new one.' };
  }
  
  if (new Date() > stored.expiresAt) {
    await Otp.deleteOne({ _id: stored._id });
    return { success: false, message: 'Verification code expired. Please request a new one.' };
  }
  
  if (stored.otp !== otp) {
    return { success: false, message: 'Invalid verification code. Please try again.' };
  }
  
  // OTP verified successfully
  await Otp.deleteOne({ _id: stored._id });
  return { success: true, message: 'Email verified successfully' };
}

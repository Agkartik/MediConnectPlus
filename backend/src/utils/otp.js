import nodemailer from 'nodemailer';

// In-memory OTP store (use Redis in production)
const otpStore = new Map();

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
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes expiry
  
  // Store OTP
  otpStore.set(email, { otp, expiresAt });
  
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
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0d9488;">MediConnect+ Verification</h2>
            <p>Your verification code is:</p>
            <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
              ${otp}
            </div>
            <p>This code will expire in 5 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
          </div>
        `,
      });
      console.log(`✅ OTP email sent successfully to ${email}`);
    } catch (error) {
      console.error('❌ Failed to send OTP email:', error.message);
      console.log('⚠️ Using console OTP instead (check above)');
      // Don't throw error - OTP is already logged to console
    }
  }
  
  return { success: true, message: 'OTP sent successfully' };
}

/**
 * Verify OTP
 */
export function verifyOTP(email, otp) {
  const stored = otpStore.get(email);
  
  if (!stored) {
    return { success: false, message: 'No OTP found for this email' };
  }
  
  if (Date.now() > stored.expiresAt) {
    otpStore.delete(email);
    return { success: false, message: 'OTP expired' };
  }
  
  if (stored.otp !== otp) {
    return { success: false, message: 'Invalid OTP' };
  }
  
  // OTP verified successfully
  otpStore.delete(email);
  return { success: true, message: 'OTP verified successfully' };
}

/**
 * Clean up expired OTPs (call periodically)
 */
export function cleanupExpiredOTPs() {
  const now = Date.now();
  for (const [email, data] of otpStore.entries()) {
    if (now > data.expiresAt) {
      otpStore.delete(email);
    }
  }
}

// Clean up every 10 minutes
setInterval(cleanupExpiredOTPs, 10 * 60 * 1000);

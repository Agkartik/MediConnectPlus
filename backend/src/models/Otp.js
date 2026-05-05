import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    index: true,
  },
  otp: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }, // TTL index: documents expire at this date
  },
}, { timestamps: true });

// Ensure we don't have multiple OTPs for the same email
otpSchema.index({ email: 1, createdAt: -1 });

export const Otp = mongoose.models.Otp || mongoose.model('Otp', otpSchema);

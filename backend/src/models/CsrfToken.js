import mongoose from 'mongoose';

const csrfTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 },
  },
}, { timestamps: true });

export const CsrfToken = mongoose.models.CsrfToken || mongoose.model('CsrfToken', csrfTokenSchema);

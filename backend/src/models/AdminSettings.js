import mongoose from "mongoose";

const adminSettingsSchema = new mongoose.Schema(
  {
    singleton: { type: String, default: "default", unique: true },
    platformName: String,
    supportEmail: String,
    currency: String,
    commissionRate: Number,
    maintenance: Boolean,
    registration: Boolean,
    doctorApproval: Boolean,
    emailNotifications: Boolean,
    systemAlerts: Boolean,
    sessionTimeout: Number,
    maxLoginAttempts: Number,
    passwordMinLength: Number,
  },
  { timestamps: true }
);

export const AdminSettings =
  mongoose.models.AdminSettings || mongoose.model("AdminSettings", adminSettingsSchema);

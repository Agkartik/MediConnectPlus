import mongoose from "mongoose";

const healthTwinSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    currentWeight: { type: Number, default: 75 }, // In kg
    hypertensionAdherence: { type: Number, default: 80 }, // 0 to 100 percentage
    activityLevel: { type: String, enum: ["low", "moderate", "high"], default: "moderate" },
    baseHealthScore: { type: Number, default: 70 }, // 0 to 100
    chronologicalAge: { type: Number, default: 30 },
    sleepHours: { type: Number, default: 7 }, // Average nightly hours
    stressLevel: { type: Number, default: 5 }, // 1 to 10
    dailySteps: { type: Number, default: 5000 },
  },
  { timestamps: true }
);

export const HealthTwin =
  mongoose.models.HealthTwin || mongoose.model("HealthTwin", healthTwinSchema);

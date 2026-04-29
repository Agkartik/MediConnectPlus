import mongoose from "mongoose";

const platformFeedbackSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, default: "" },
    userRole: { type: String, enum: ["patient", "doctor"], required: true },
    rating: { type: Number, min: 1, max: 5 },
    category: { type: String, default: "general", trim: true },
    message: { type: String, required: true, trim: true, maxlength: 8000 },
  },
  { timestamps: true }
);

export const PlatformFeedback =
  mongoose.models.PlatformFeedback || mongoose.model("PlatformFeedback", platformFeedbackSchema);

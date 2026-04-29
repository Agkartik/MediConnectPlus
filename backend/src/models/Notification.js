import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    time: { type: String, default: "Just now" },
    read: { type: Boolean, default: false },
    type: {
      type: String,
      enum: ["appointment", "prescription", "system", "pharmacy"],
      required: true,
    },
  },
  { timestamps: true }
);

export const Notification =
  mongoose.models.Notification || mongoose.model("Notification", notificationSchema);

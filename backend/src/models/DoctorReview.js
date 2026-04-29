import mongoose from "mongoose";

const doctorReviewSchema = new mongoose.Schema(
  {
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment" },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "" },
  },
  { timestamps: true }
);

doctorReviewSchema.index({ doctorId: 1, patientId: 1 }, { unique: true });

export const DoctorReview =
  mongoose.models.DoctorReview || mongoose.model("DoctorReview", doctorReviewSchema);

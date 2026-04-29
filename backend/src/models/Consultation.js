import mongoose from "mongoose";

const consultationSchema = new mongoose.Schema(
  {
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment", sparse: true, index: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    patient: { type: String, required: true },
    doctor: { type: String, required: true },
    type: { type: String, enum: ["Video Call", "Chat", "In-Person"], required: true },
    status: { type: String, enum: ["Ongoing", "Waiting", "Completed"], required: true },
    duration: { type: String, default: "0 min" },
    notes: { type: String, default: "" },
    avatar: { type: String, default: "" },
    date: { type: String },
    diagnosis: { type: String },
    startedAt: { type: Number },
  },
  { timestamps: true }
);

export const Consultation =
  mongoose.models.Consultation || mongoose.model("Consultation", consultationSchema);

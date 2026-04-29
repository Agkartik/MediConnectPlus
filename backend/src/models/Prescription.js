import mongoose from "mongoose";

const prescriptionSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    medicine: { type: String, required: true },
    dosage: { type: String, required: true },
    doctor: { type: String, required: true },
    patientName: { type: String, required: true },
    date: { type: String, required: true },
    endDate: { type: String, required: true },
    status: { type: String, enum: ["Active", "Completed"], required: true },
    notes: { type: String, default: "" },
    addedBy: { type: String, enum: ["doctor", "patient"], required: true },
  },
  { timestamps: true }
);

export const Prescription =
  mongoose.models.Prescription || mongoose.model("Prescription", prescriptionSchema);

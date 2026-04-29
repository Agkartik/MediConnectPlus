import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    doctor: { type: String, required: true },
    specialty: { type: String, required: true },
    time: { type: String, required: true },
    date: { type: String, required: true },
    type: { type: String, enum: ["Video", "In-Person", "Chat"], required: true },
    status: { type: String, enum: ["confirmed", "pending", "completed", "cancelled"], required: true },
    avatar: { type: String, default: "" },
    patientName: { type: String, default: "" },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String, sparse: true, unique: true },
    paymentStatus: { type: String, enum: ["paid", "unpaid"], default: "unpaid" },
    consultationFeeInr: { type: Number },
    
    // Patient Vitals (recorded by doctor after consultation)
    visitSummary: {
      bloodPressure: {
        systolic: { type: Number },  // e.g., 120
        diastolic: { type: Number }, // e.g., 80
      },
      temperature: { type: Number },      // in Fahrenheit
      bloodSugar: { type: Number },       // mg/dL
      oxygenSaturation: { type: Number }, // SpO2 %
      pulseRate: { type: Number },        // BPM
      weight: { type: Number },           // kg
      respiratoryRate: { type: Number },  // breaths per minute
      clinicalNotes: { type: String },    // doctor's observations
      diagnosis: { type: String },        // primary diagnosis
      prescription: { type: String },     // prescribed medications
      followUpRequired: { type: Boolean, default: false },
      followUpDate: { type: Date },
      severity: { 
        type: String, 
        enum: ["mild", "moderate", "severe", "critical"],
        default: "mild"
      },
    },
  },
  { timestamps: true }
);

appointmentSchema.index({ patientId: 1, createdAt: -1 });
appointmentSchema.index({ patientId: 1, "visitSummary.bloodPressure.systolic": 1 });

export const Appointment =
  mongoose.models.Appointment || mongoose.model("Appointment", appointmentSchema);

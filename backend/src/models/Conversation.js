import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    doctorName: { type: String, required: true },
    patientName: { type: String, required: true },
    doctorAvatar: { type: String, default: "" },
    patientAvatar: { type: String, default: "" },
    doctorSpecialty: { type: String, default: "" },
    patientCondition: { type: String, default: "" },
    lastMsg: { type: String, default: "" },
    lastTime: { type: String, default: "" },
    unreadDoctor: { type: Number, default: 0 },
    unreadPatient: { type: Number, default: 0 },
  },
  { timestamps: true }
);

conversationSchema.index({ patientId: 1, doctorId: 1 }, { unique: true });
conversationSchema.index({ patientId: 1 });
conversationSchema.index({ doctorId: 1 });
conversationSchema.index({ updatedAt: -1 });

export const Conversation =
  mongoose.models.Conversation || mongoose.model("Conversation", conversationSchema);

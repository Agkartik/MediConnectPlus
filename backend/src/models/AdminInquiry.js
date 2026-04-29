import mongoose from "mongoose";

const adminInquirySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, default: "" },
    userRole: { type: String, enum: ["patient", "doctor"], required: true },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true, trim: true, maxlength: 8000 },
    status: { type: String, enum: ["Open", "Answered"], default: "Open" },
    adminReply: { type: String, default: "", maxlength: 8000 },
    repliedAt: { type: Date, default: null },
    repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

export const AdminInquiry =
  mongoose.models.AdminInquiry || mongoose.model("AdminInquiry", adminInquirySchema);

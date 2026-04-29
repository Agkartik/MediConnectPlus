import mongoose from "mongoose";

const complianceIssueSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    entity: { type: String, required: true },
    category: { type: String, enum: ["misconduct", "compliance", "security"], default: "compliance" },
    severity: { type: String, enum: ["High", "Medium", "Low"], required: true },
    date: { type: String, required: true },
    status: { type: String, enum: ["Open", "Under Review", "Resolved"], required: true },
    desc: { type: String, required: true },
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reporterName: { type: String },
    reporterRole: { type: String, enum: ["patient", "doctor", "admin"] },
    reportedUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reportedUserName: { type: String },
    reportedUserRole: { type: String, enum: ["patient", "doctor"] },
    resolutionNotes: { type: String, default: "" },
  },
  { timestamps: true }
);

export const ComplianceIssue =
  mongoose.models.ComplianceIssue || mongoose.model("ComplianceIssue", complianceIssueSchema);

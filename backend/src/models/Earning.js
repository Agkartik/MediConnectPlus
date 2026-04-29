import mongoose from "mongoose";

const earningSchema = new mongoose.Schema(
  {
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    patient: { type: String, required: true },
    type: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: String, required: true },
    status: { type: String, enum: ["Completed", "Pending"], required: true },
  },
  { timestamps: true }
);

export const Earning = mongoose.models.Earning || mongoose.model("Earning", earningSchema);

import mongoose from "mongoose";

const faqEntrySchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
    sortOrder: { type: Number, default: 0 },
    published: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const FaqEntry = mongoose.models.FaqEntry || mongoose.model("FaqEntry", faqEntrySchema);

import mongoose from "mongoose";

const pharmacyMedicineSchema = new mongoose.Schema(
  {
    legacyId: { type: Number, unique: true, sparse: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    stock: { type: Number, required: true },
    sold: { type: Number, default: 0 },
    requiresPrescription: { type: Boolean, default: false },
    description: { type: String, default: "" },
    /** What it treats / typical uses (conditions, symptoms). */
    usage: { type: String, default: "" },
    /** Common side effects — informational for patients & doctors. */
    sideEffects: { type: String, default: "" },
    /** Warnings, interactions, precautions. */
    warnings: { type: String, default: "" },
  },
  { timestamps: true }
);

export const PharmacyMedicine =
  mongoose.models.PharmacyMedicine || mongoose.model("PharmacyMedicine", pharmacyMedicineSchema);

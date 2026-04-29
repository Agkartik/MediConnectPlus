import mongoose from "mongoose";

const dnaSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true, unique: true },
    
    // DNA Test Information
    testProvider: { type: String }, // 23andMe, AncestryDNA, etc.
    testDate: { type: Date },
    rawFile: { type: String }, // File path to uploaded DNA data
    rawExtractText: { type: String, default: "" },
    reports: [
      {
        uploadedAt: { type: Date, default: Date.now },
        fileName: { type: String, default: "" },
        provider: { type: String, default: "" },
        summary: { type: String, default: "" },
      },
    ],
    
    // Genetic Predispositions
    geneticRisks: [
      {
        condition: { type: String }, // e.g., "Type 2 Diabetes"
        riskLevel: { type: String, enum: ["low", "moderate", "high", "very_high"] },
        probability: { type: Number }, // 0-100 percentage
        genes: [{ type: String }], // Related genes
        description: { type: String },
      },
    ],
    
    // Traits & Characteristics
    traits: [
      {
        trait: { type: String }, // e.g., "Lactose Intolerance"
        status: { type: String, enum: ["likely", "unlikely", "carrier"] },
        confidence: { type: Number }, // 0-100
        genes: [{ type: String }],
      },
    ],
    
    // Metabolism & Nutrition
    metabolism: {
      caffeine: { type: String, enum: ["fast", "slow"] },
      carbohydrate: { type: String, enum: ["low", "normal", "high"] },
      fat: { type: String, enum: ["low", "normal", "high"] },
      lactose: { type: String, enum: ["tolerant", "intolerant"] },
      gluten: { type: String, enum: ["tolerant", "sensitive", "celiac"] },
    },
    
    // Vitamin & Mineral Needs
    vitaminNeeds: [
      {
        vitamin: { type: String }, // e.g., "Vitamin D", "B12"
        deficiencyRisk: { type: String, enum: ["low", "moderate", "high"] },
        recommendation: { type: String },
        dosage: { type: String },
      },
    ],
    
    // Fitness & Exercise
    fitnessProfile: {
      muscleGrowth: { type: String, enum: ["low", "normal", "high"] },
      endurance: { type: String, enum: ["low", "normal", "high"] },
      recovery: { type: String, enum: ["slow", "normal", "fast"] },
      injuryRisk: { type: String, enum: ["low", "moderate", "high"] },
      bestExerciseType: { type: String }, // HIIT, Cardio, Strength, etc.
    },
    
    // Recommended Actions
    recommendations: {
      diet: { type: String }, // Mediterranean, Keto, etc.
      supplements: [{ type: String }],
      foodsToAvoid: [{ type: String }],
      healthScreenings: [{ type: String }],
      lifestyle: [{ type: String }],
    },
    
    // Analysis Status
    analysisStatus: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },
    
    // Doctor Review
    doctorReviewed: { type: Boolean, default: false },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    doctorNotes: { type: String },
    reviewDate: { type: Date },
  },
  { timestamps: true }
);

export const DNAProfile =
  mongoose.models.DNAProfile || mongoose.model("DNAProfile", dnaSchema);

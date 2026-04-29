import { Router } from "express";
import { DNAProfile } from "../models/DNAProfile.js";
import { User } from "../models/User.js";
import { authRequired, requireApproved, requireRole } from "../middleware/auth.js";

const router = Router();

const CAFFEINE = new Set(["fast", "slow"]);
const CARB = new Set(["low", "normal", "high"]);
const FAT = new Set(["low", "normal", "high"]);
const LACT = new Set(["tolerant", "intolerant"]);
const GLUTEN = new Set(["tolerant", "sensitive", "celiac"]);
const MUSCLE = new Set(["low", "normal", "high"]);
const ENDUR = new Set(["low", "normal", "high"]);
const RECOV = new Set(["slow", "normal", "fast"]);
const INJ = new Set(["low", "moderate", "high"]);
const RISK = new Set(["low", "moderate", "high", "very_high"]);
const TRAIT_ST = new Set(["likely", "unlikely", "carrier"]);
const VIT = new Set(["low", "moderate", "high"]);

function pickEnum(set, v, fallback) {
  if (v != null && set.has(String(v))) return v;
  return fallback;
}

/** Coerce client payloads so Mongoose enum validation never fails on demo/PDF-derived analysis. */
function sanitizeDnaBody(body) {
  const out = { ...body };
  if (out.metabolism && typeof out.metabolism === "object") {
    const m = { ...out.metabolism };
    m.caffeine = pickEnum(CAFFEINE, m.caffeine, "slow");
    m.carbohydrate = pickEnum(CARB, m.carbohydrate, "normal");
    m.fat = pickEnum(FAT, m.fat, "normal");
    m.lactose = pickEnum(LACT, m.lactose, "tolerant");
    m.gluten = pickEnum(GLUTEN, m.gluten, "tolerant");
    out.metabolism = m;
  }
  if (out.fitnessProfile && typeof out.fitnessProfile === "object") {
    const f = { ...out.fitnessProfile };
    f.muscleGrowth = pickEnum(MUSCLE, f.muscleGrowth, "normal");
    f.endurance = pickEnum(ENDUR, f.endurance, "normal");
    f.recovery = pickEnum(RECOV, f.recovery, "normal");
    f.injuryRisk = pickEnum(INJ, f.injuryRisk, "low");
    out.fitnessProfile = f;
  }
  if (Array.isArray(out.geneticRisks)) {
    out.geneticRisks = out.geneticRisks.map((r) => ({
      ...r,
      riskLevel: pickEnum(RISK, r?.riskLevel, "low"),
    }));
  }
  if (Array.isArray(out.traits)) {
    out.traits = out.traits.map((t) => ({
      ...t,
      status: pickEnum(TRAIT_ST, t?.status, "likely"),
    }));
  }
  if (Array.isArray(out.vitaminNeeds)) {
    out.vitaminNeeds = out.vitaminNeeds.map((v) => ({
      ...v,
      deficiencyRisk: pickEnum(VIT, v?.deficiencyRisk, "moderate"),
    }));
  }
  return out;
}

// ========================================
// DNA-BASED HEALTH RECOMMENDATIONS
// Unique Feature - Nobody Has This!
// ========================================

// User submits DNA test results
router.post("/submit", authRequired, async (req, res) => {
  try {
    const {
      testProvider,
      testDate,
      rawFile,
      rawExtractText,
      // Or manual entry
      geneticRisks,
      traits,
      metabolism,
      vitaminNeeds,
      fitnessProfile,
      fileName,
    } = sanitizeDnaBody(req.body);

    // Check if user already has DNA profile
    let dnaProfile = await DNAProfile.findOne({ userId: req.user.id });

    if (dnaProfile) {
      // Update existing profile
      dnaProfile.testProvider = testProvider || dnaProfile.testProvider;
      dnaProfile.testDate = testDate || dnaProfile.testDate;
      dnaProfile.rawFile = rawFile || dnaProfile.rawFile;
      dnaProfile.rawExtractText = rawExtractText || dnaProfile.rawExtractText;
      dnaProfile.geneticRisks = geneticRisks || dnaProfile.geneticRisks;
      dnaProfile.traits = traits || dnaProfile.traits;
      dnaProfile.metabolism = metabolism || dnaProfile.metabolism;
      dnaProfile.vitaminNeeds = vitaminNeeds || dnaProfile.vitaminNeeds;
      dnaProfile.fitnessProfile = fitnessProfile || dnaProfile.fitnessProfile;
      dnaProfile.analysisStatus = "processing";
      dnaProfile.doctorReviewed = false;
    } else {
      // Create new profile
      dnaProfile = await DNAProfile.create({
        userId: req.user.id,
        testProvider,
        testDate,
        rawFile,
        rawExtractText: rawExtractText || "",
        geneticRisks: geneticRisks || [],
        traits: traits || [],
        metabolism: metabolism || {},
        vitaminNeeds: vitaminNeeds || [],
        fitnessProfile: fitnessProfile || {},
        analysisStatus: "processing",
      });
    }

    const recommendations = generateRecommendations(dnaProfile);
    dnaProfile.recommendations = recommendations;
    dnaProfile.analysisStatus = "completed";
    dnaProfile.reports = Array.isArray(dnaProfile.reports) ? dnaProfile.reports : [];
    dnaProfile.reports.push({
      uploadedAt: new Date(),
      fileName: fileName || rawFile || "manual-entry",
      provider: testProvider || "Unknown",
      summary: recommendations?.diet || "DNA profile analyzed",
    });

    await dnaProfile.save();

    res.json({
      success: true,
      message: "DNA data submitted and analyzed successfully.",
      dnaProfile: {
        id: dnaProfile._id,
        testProvider: dnaProfile.testProvider,
        analysisStatus: dnaProfile.analysisStatus,
      },
    });
  } catch (e) {
    console.error("Error submitting DNA:", e);
    res.status(500).json({ error: "Failed to submit DNA data" });
  }
});

// Get user's DNA profile and recommendations
router.get("/profile", authRequired, async (req, res) => {
  try {
    const dnaProfile = await DNAProfile.findOne({ userId: req.user.id });

    if (!dnaProfile) {
      return res.json({
        success: true,
        hasProfile: false,
        message: "No DNA profile found. Submit your DNA test results to get started.",
      });
    }

    res.json({
      success: true,
      hasProfile: true,
      dnaProfile: {
        id: dnaProfile._id,
        testProvider: dnaProfile.testProvider,
        testDate: dnaProfile.testDate,
        analysisStatus: dnaProfile.analysisStatus,
        geneticRisks: dnaProfile.geneticRisks,
        traits: dnaProfile.traits,
        metabolism: dnaProfile.metabolism,
        vitaminNeeds: dnaProfile.vitaminNeeds,
        fitnessProfile: dnaProfile.fitnessProfile,
        recommendations: dnaProfile.recommendations,
        doctorReviewed: dnaProfile.doctorReviewed,
        doctorNotes: dnaProfile.doctorNotes,
        reports: dnaProfile.reports || [],
        createdAt: dnaProfile.createdAt,
      },
    });
  } catch (e) {
    console.error("Error fetching DNA profile:", e);
    res.status(500).json({ error: "Failed to fetch DNA profile" });
  }
});

// Doctor reviews DNA profile
router.put("/dna/review/:profileId", authRequired, requireRole("doctor"), async (req, res) => {
  try {
    const { notes, recommendations } = req.body;

    const dnaProfile = await DNAProfile.findById(req.params.profileId);

    if (!dnaProfile) {
      return res.status(404).json({ error: "DNA profile not found" });
    }

    // Verify this is the user's doctor
    // In production: Check if doctor has relationship with patient

    dnaProfile.doctorReviewed = true;
    dnaProfile.reviewedBy = req.user.id;
    dnaProfile.doctorNotes = notes;
    dnaProfile.reviewDate = new Date();

    if (recommendations) {
      dnaProfile.recommendations = {
        ...dnaProfile.recommendations,
        ...recommendations,
      };
    }

    await dnaProfile.save();

    res.json({
      success: true,
      message: "DNA profile reviewed successfully",
      doctorNotes: dnaProfile.doctorNotes,
    });
  } catch (e) {
    console.error("Error reviewing DNA profile:", e);
    res.status(500).json({ error: "Failed to review DNA profile" });
  }
});

// Admin view all DNA profiles
router.get("/admin/dna-profiles", authRequired, requireRole("admin"), async (req, res) => {
  try {
    const profiles = await DNAProfile.find()
      .populate("userId", "name email")
      .populate("reviewedBy", "name")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: profiles.length,
      profiles: profiles.map((p) => ({
        id: p._id,
        userName: p.userId?.name,
        userEmail: p.userId?.email,
        testProvider: p.testProvider,
        analysisStatus: p.analysisStatus,
        doctorReviewed: p.doctorReviewed,
        reviewerName: p.reviewedBy?.name,
        createdAt: p.createdAt,
      })),
    });
  } catch (e) {
    console.error("Error fetching DNA profiles:", e);
    res.status(500).json({ error: "Failed to fetch DNA profiles" });
  }
});

// ========================================
// AI RECOMMENDATION ENGINE
// Analyzes DNA and generates personalized recommendations
// ========================================

function generateRecommendations(dnaProfile) {
  const recommendations = {
    diet: "Balanced",
    supplements: [],
    foodsToAvoid: [],
    healthScreenings: [],
    lifestyle: [],
  };

  // Analyze metabolism
  if (dnaProfile.metabolism) {
    if (dnaProfile.metabolism.lactose === "intolerant") {
      recommendations.foodsToAvoid.push("Dairy products (milk, cheese, yogurt)");
      recommendations.supplements.push("Calcium + Vitamin D3");
    }

    if (dnaProfile.metabolism.caffeine === "slow") {
      recommendations.foodsToAvoid.push("Excessive caffeine (>200mg/day)");
      recommendations.lifestyle.push("Limit coffee to 1 cup per day");
    }

    if (dnaProfile.metabolism.gluten === "sensitive" || dnaProfile.metabolism.gluten === "celiac") {
      recommendations.foodsToAvoid.push("Gluten-containing foods (wheat, barley, rye)");
      recommendations.diet = "Gluten-free";
    }
  }

  // Analyze vitamin needs
  if (dnaProfile.vitaminNeeds && dnaProfile.vitaminNeeds.length > 0) {
    dnaProfile.vitaminNeeds.forEach((vitamin) => {
      if (vitamin.deficiencyRisk === "high" || vitamin.deficiencyRisk === "moderate") {
        recommendations.supplements.push(`${vitamin.vitamin} - ${vitamin.dosage || "As directed"}`);
        recommendations.healthScreenings.push(`Annual ${vitamin.vitamin} level test`);
      }
    });
  }

  // Analyze genetic risks
  if (dnaProfile.geneticRisks && dnaProfile.geneticRisks.length > 0) {
    dnaProfile.geneticRisks.forEach((risk) => {
      if (risk.riskLevel === "high" || risk.riskLevel === "very_high") {
        recommendations.healthScreenings.push(`Regular screening for ${risk.condition}`);
        recommendations.lifestyle.push(`Monitor ${risk.condition} risk factors`);
      }
    });
  }

  // Analyze fitness profile
  if (dnaProfile.fitnessProfile) {
    if (dnaProfile.fitnessProfile.bestExerciseType) {
      recommendations.lifestyle.push(
        `Best exercise type for you: ${dnaProfile.fitnessProfile.bestExerciseType}`
      );
    }

    if (dnaProfile.fitnessProfile.recovery === "slow") {
      recommendations.lifestyle.push("Allow 48-72 hours rest between intense workouts");
    }
  }

  // Default recommendations
  if (recommendations.supplements.length === 0) {
    recommendations.supplements.push("Multivitamin (daily)");
    recommendations.supplements.push("Vitamin D3 (1000-2000 IU)");
  }

  if (recommendations.lifestyle.length === 0) {
    recommendations.lifestyle.push("Regular exercise (150 min/week)");
    recommendations.lifestyle.push("7-9 hours sleep per night");
    recommendations.lifestyle.push("Stay hydrated (8 glasses water/day)");
  }

  return recommendations;
}

export default router;

import { Router } from "express";
import { HealthTwin } from "../models/HealthTwin.js";
import { authRequired } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { Appointment } from "../models/Appointment.js";
import { DNAProfile } from "../models/DNAProfile.js";

const router = Router();

// Get the current user's Health Twin
router.get("/:userId", authRequired, async (req, res) => {
  try {
    if (req.user.id !== req.params.userId && req.user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const [twinResult, latestVitalsApt, dna] = await Promise.all([
      HealthTwin.findOne({ userId: req.params.userId }),
      Appointment.findOne({
        patientId: req.params.userId,
        "visitSummary.bloodPressure.systolic": { $exists: true },
      }).sort({ createdAt: -1 }),
      DNAProfile.findOne({ userId: req.params.userId }),
    ]);
    let twin = twinResult;
    
    if (!twin) {
      // Find the user to get their chronological age if available
      const userDoc = await User.findById(req.params.userId);
      const inheritedAge = userDoc?.age || 30;

      // Intialize default
      twin = await HealthTwin.create({
        userId: req.params.userId,
        currentWeight: 75,
        hypertensionAdherence: 80,
        activityLevel: "moderate",
        baseHealthScore: 70,
        chronologicalAge: inheritedAge,
        sleepHours: 7,
        stressLevel: 5,
        dailySteps: 5000,
      });
    }

    // Keep twin baseline realistic using latest available clinical/dna signals.
    if (latestVitalsApt?.visitSummary?.bloodPressure?.systolic >= 140) {
      twin.baseHealthScore = Math.max(35, (twin.baseHealthScore || 70) - 8);
    }
    if (dna?.geneticRisks?.some((r) => r.riskLevel === "high" || r.riskLevel === "very_high")) {
      twin.baseHealthScore = Math.max(30, (twin.baseHealthScore || 70) - 6);
    }
    await twin.save();

    res.json(twin);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch Health Twin" });
  }
});

// Simulate What-If Scenarios
router.post("/:userId/simulate", authRequired, async (req, res) => {
  try {
    if (req.user.id !== req.params.userId && req.user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { targetWeight, targetAdherence, targetSleep, targetStress, targetSteps, targetAge } = req.body;
    const twin = await HealthTwin.findOne({ userId: req.params.userId });
    const latestVitalsApt = await Appointment.findOne({
      patientId: req.params.userId,
      "visitSummary.bloodPressure.systolic": { $exists: true },
    }).sort({ createdAt: -1 });
    const dna = await DNAProfile.findOne({ userId: req.params.userId });
    
    if (!twin) {
      return res.status(404).json({ error: "Health Twin not found. Fetch it first to initialize." });
    }

    // Assign fallback defaults for backwards compatibility if payload missing new vars
    const tSleep = targetSleep ?? twin.sleepHours ?? 7;
    const tStress = targetStress ?? twin.stressLevel ?? 5;
    const tSteps = targetSteps ?? twin.dailySteps ?? 5000;
    const cAge = targetAge ?? twin.chronologicalAge ?? 30;

    // 1. Simulation Math for Overall Score
    const weightDiff = twin.currentWeight - (targetWeight || twin.currentWeight);
    const adherenceDiff = (targetAdherence || twin.hypertensionAdherence) - twin.hypertensionAdherence;

    let projectedHealthScore = twin.baseHealthScore;

    if (weightDiff > 0) {
      projectedHealthScore += Math.min(weightDiff * 1, 15);
    } else if (weightDiff < 0) {
      projectedHealthScore += Math.max(weightDiff * 1, -15);
    }

    if (adherenceDiff > 0) {
      projectedHealthScore += Math.min(adherenceDiff * 0.5, 15);
    } else if (adherenceDiff < 0) {
      projectedHealthScore += Math.max(adherenceDiff * 0.5, -20);
    }

    // Add new modifiers to overall score
    if (tSleep >= 7 && tSleep <= 9) projectedHealthScore += 5;
    else if (tSleep < 6) projectedHealthScore -= 10;

    if (tStress < 4) projectedHealthScore += 5;
    else if (tStress > 7) projectedHealthScore -= 10;

    if (tSteps > 8000) projectedHealthScore += 10;
    else if (tSteps < 3000) projectedHealthScore -= 10;

    // Clamp score
    projectedHealthScore = Math.max(0, Math.min(100, Math.round(projectedHealthScore)));

    // 2. Biological Age Algorithm
    let biologicalAgeOffset = 0;
    if (tSleep < 6) biologicalAgeOffset += 2;
    else if (tSleep >= 7) biologicalAgeOffset -= 1;
    
    if (tStress > 7) biologicalAgeOffset += 3;
    else if (tStress < 4) biologicalAgeOffset -= 2;

    if (tSteps < 3000) biologicalAgeOffset += 4;
    else if (tSteps > 10000) biologicalAgeOffset -= 3;

    // Adherence factor
    if (targetAdherence < 60) biologicalAgeOffset += 5;
    else if (targetAdherence > 85) biologicalAgeOffset -= 2;

    const biologicalAge = Math.max(cAge - 15, Math.round(cAge + biologicalAgeOffset));

    // 3. Organ Scores Mapping (0 - 100 limit each)
    let heartHealth = 70 + (tSteps / 1000) * 1.5 - (tStress * 2) + Math.max(0, (targetAdherence - 70) * 0.5);
    if (weightDiff > 0) heartHealth += weightDiff * 0.5;
    
    let metabolicHealth = 70 + (tSleep >= 7 ? 10 : -10) + (tSteps > 5000 ? 5 : -5);
    if (weightDiff > 0) metabolicHealth += weightDiff;

    let mentalCognition = 80 + (tSleep >= 7 ? 10 : -15) - (tStress * 2.5);

    heartHealth = Math.max(0, Math.min(100, Math.round(heartHealth)));
    metabolicHealth = Math.max(0, Math.min(100, Math.round(metabolicHealth)));
    mentalCognition = Math.max(0, Math.min(100, Math.round(mentalCognition)));

    // 4. Generate string insights
    const insights = [];

    if (biologicalAge < cAge) {
      insights.push(`Your habits map your biological age to ${biologicalAge}, ${cAge - biologicalAge} years younger than your true age!`);
    } else if (biologicalAge > cAge) {
      insights.push(`Elevated stress or low activity is artificially aging your organs by ${biologicalAge - cAge} years.`);
    } else {
      insights.push(`Your cellular decay perfectly aligns with your chronological age of ${cAge}.`);
    }

    if (tSleep < 6) insights.push("Sleeping under 6 hours critically disrupts metabolic regulation and cognition.");
    else if (tSleep >= 7) insights.push("Optimal sleep patterns are reinforcing cognitive plasticity and recovery.");

    if (tSteps > 8000) insights.push(`Walking ${tSteps} steps provides strong cardiovascular defense mechanisms.`);
    else if (tSteps < 4000) insights.push(`Your sedentary state (${tSteps} steps) increases metabolic syndrome risk factors.`);
    
    // Original adherence insight fallback to keep list populated
    if (insights.length < 3) {
      if (targetAdherence > 90) insights.push(`Excellent medication adherence stabilizes blood hemodynamics.`);
      else insights.push(`Maintaining adherence is critical for establishing a secure vascular baseline.`);
    }
    
    if (tStress > 8) {
      insights.push(`High cortisol levels from severe stress are rapidly eroding telomeres.`);
    }

    if (latestVitalsApt?.visitSummary?.bloodPressure?.systolic) {
      const sys = latestVitalsApt.visitSummary.bloodPressure.systolic;
      insights.push(`Latest clinical vitals show systolic BP ${sys}; twin projections are calibrated with this reading.`);
    }
    if (dna?.geneticRisks?.length) {
      const highRisks = dna.geneticRisks.filter((r) => r.riskLevel === "high" || r.riskLevel === "very_high").length;
      insights.push(`DNA profile contributes ${highRisks} high-risk genetic marker(s) to risk calibration.`);
    }

    res.json({
      projectedHealthScore,
      insights,
      originalScore: twin.baseHealthScore,
      biologicalAge,
      organScores: {
        heartHealth,
        metabolicHealth,
        mentalCognition
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Simulation failed" });
  }
});

export default router;

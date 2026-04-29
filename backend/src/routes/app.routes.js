import { Router } from "express";
import mongoose from "mongoose";
import { User } from "../models/User.js";
import { Appointment } from "../models/Appointment.js";
import { Prescription } from "../models/Prescription.js";
import { Conversation } from "../models/Conversation.js";
import { Message } from "../models/Message.js";
import { Consultation } from "../models/Consultation.js";
import { Earning } from "../models/Earning.js";
import { PharmacyMedicine } from "../models/PharmacyMedicine.js";
import { DeliveryOrder } from "../models/DeliveryOrder.js";
import { ComplianceIssue } from "../models/ComplianceIssue.js";
import { AdminSettings } from "../models/AdminSettings.js";
import { Notification } from "../models/Notification.js";
import { DoctorReview } from "../models/DoctorReview.js";
import { authRequired, requireApproved, requireRole } from "../middleware/auth.js";
import { userToClient } from "../utils/token.js";
import { haversineKm } from "../utils/geo.js";
import { isAppointmentDateToday } from "../utils/appointmentDate.js";
import {
  doctorListing,
  appointmentDoc,
  prescriptionDoc,
  conversationDoc,
  messageDoc,
  consultationDoc,
  earningDoc,
  registeredPatient,
  medicineDoc,
  orderDoc,
  complianceDoc,
  notificationDoc,
} from "../utils/serializers.js";

const router = Router();

async function mapDoctorsForList(doctors, { viewerRole, patientLat, patientLon, patientHasCoords }) {
  if (!doctors.length) return [];
  const ids = doctors.map((d) => d._id);
  const stats = await DoctorReview.aggregate([
    { $match: { doctorId: { $in: ids } } },
    { $group: { _id: "$doctorId", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  const statMap = Object.fromEntries(stats.map((s) => [s._id.toString(), s]));
  return doctors.map((d) => {
    const st = statMap[d._id.toString()];
    let distanceKm = null;
    if (
      patientLat != null &&
      patientLon != null &&
      typeof d.latitude === "number" &&
      typeof d.longitude === "number" &&
      !Number.isNaN(d.latitude) &&
      !Number.isNaN(d.longitude)
    ) {
      distanceKm = haversineKm(patientLat, patientLon, d.latitude, d.longitude);
    }
    return doctorListing(d, {
      reviewAvg: st?.avg,
      reviewCount: st?.count ?? 0,
      distanceKm,
      viewerRole,
      patientHasCoords,
    });
  });
}

function scheduleToObject(schedule) {
  if (!schedule) return {};
  if (schedule instanceof Map) return Object.fromEntries(schedule);
  return typeof schedule === "object" ? schedule : {};
}

function notifToDoctor(doctorId, title, message, type = "system") {
  return Notification.create({
    userId: doctorId,
    title,
    message,
    time: "Just now",
    read: false,
    type,
  });
}

function consultationTypeFromAppointment(type) {
  if (type === "Video") return "Video Call";
  if (type === "In-Person") return "In-Person";
  return "Chat";
}

async function syncConsultationFromAppointment(apt, overrideStatus) {
  if (!apt || !apt._id || apt.type !== "Video") return;
  const targetStatus =
    overrideStatus || (apt.status === "confirmed" ? "Waiting" : apt.status === "completed" || apt.status === "cancelled" ? "Completed" : null);
  if (!targetStatus) return;
  const setData = {
    appointmentId: apt._id,
    patientId: apt.patientId,
    doctorId: apt.doctorId,
    patient: apt.patientName || "Patient",
    doctor: apt.doctor || "Doctor",
    type: consultationTypeFromAppointment(apt.type),
    status: targetStatus,
    notes: `Appointment on ${apt.date} at ${apt.time}`,
    avatar:
      apt.avatar ||
      (apt.patientName || "P")
        .split(" ")
        .map((x) => x[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
  };
  if (targetStatus === "Completed") {
    setData.date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  await Consultation.findOneAndUpdate(
    { appointmentId: apt._id },
    {
      $set: setData,
      ...(targetStatus === "Completed" ? { $setOnInsert: { startedAt: Date.now() } } : {}),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function ensurePatientConversations(patientId) {
  const doctors = await User.find({ role: "doctor", approved: true, doctorStatus: { $ne: "Suspended" } }).select("_id name specialty avatar");
  const patient = await User.findById(patientId).select("_id name avatar condition");
  if (!patient) return;
  
  await Promise.all(doctors.map(d => 
    Conversation.findOneAndUpdate(
      { patientId: patient._id, doctorId: d._id },
      {
        $setOnInsert: {
          doctorName: d.name,
          patientName: patient.name,
          doctorAvatar: d.avatar || "",
          patientAvatar: patient.avatar || "",
          doctorSpecialty: d.specialty || "",
          patientCondition: patient.condition || "General",
          lastMsg: "",
          lastTime: "",
          unreadDoctor: 0,
          unreadPatient: 0,
        },
      },
      { upsert: true }
    )
  ));
}

async function ensureDoctorConversations(doctorId) {
  const doctor = await User.findById(doctorId).select("_id name avatar specialty");
  if (!doctor || doctor.role !== "doctor") return;
  const patients = await User.find({ role: "patient", approved: true, userStatus: { $ne: "Suspended" } }).select("_id name avatar condition");
  
  await Promise.all(patients.map(p => 
    Conversation.findOneAndUpdate(
      { patientId: p._id, doctorId: doctor._id },
      {
        $setOnInsert: {
          doctorName: doctor.name,
          patientName: p.name,
          doctorAvatar: doctor.avatar || "",
          patientAvatar: p.avatar || "",
          doctorSpecialty: doctor.specialty || "",
          patientCondition: p.condition || "General",
          lastMsg: "",
          lastTime: "",
          unreadDoctor: 0,
          unreadPatient: 0,
        },
      },
      { upsert: true }
    )
  ));
}

// ——— Doctors ———
router.get("/doctors", authRequired, requireApproved, async (req, res) => {
  try {
    const q = { role: "doctor" };
    if (req.user.role !== "admin") {
      q.approved = true;
      q.doctorStatus = { $ne: "Suspended" };
    }
    const doctors = await User.find(q).sort({ name: 1 });
    let patientLat = null;
    let patientLon = null;
    let patientHasCoords = false;
    if (req.user.role === "patient") {
      const p = await User.findById(req.user.id).select("latitude longitude");
      if (p?.latitude != null && p?.longitude != null) {
        patientLat = p.latitude;
        patientLon = p.longitude;
        patientHasCoords = true;
      }
    }
    const list = await mapDoctorsForList(doctors, {
      viewerRole: req.user.role,
      patientLat,
      patientLon,
      patientHasCoords,
    });
    res.json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to list doctors" });
  }
});

router.get("/doctors/admin-split", authRequired, requireApproved, requireRole("admin"), async (req, res) => {
  try {
    const all = await User.find({ role: "doctor" });
    const approvedDocs = all.filter((d) => d.approved !== false);
    const pendingDocs = all.filter((d) => d.approved === false);
    const approved = await mapDoctorsForList(approvedDocs, {
      viewerRole: "admin",
      patientLat: null,
      patientLon: null,
      patientHasCoords: false,
    });
    const pending = await mapDoctorsForList(pendingDocs, {
      viewerRole: "admin",
      patientLat: null,
      patientLon: null,
      patientHasCoords: false,
    });
    res.json({ approved, pending });
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

/** Full doctor record + misconduct reports against them (for suspension decisions). */
router.get("/doctors/:id/admin-detail", authRequired, requireApproved, requireRole("admin"), async (req, res) => {
  try {
    const d = await User.findById(req.params.id).select("-password");
    if (!d || d.role !== "doctor") return res.status(404).json({ error: "Doctor not found" });
    const [listed] = await mapDoctorsForList([d], {
      viewerRole: "admin",
      patientLat: null,
      patientLon: null,
      patientHasCoords: false,
    });
    const issues = await ComplianceIssue.find({ reportedUserId: d._id }).sort({ createdAt: -1 });
    res.json({
      doctor: {
        ...listed,
        dob: d.dob || "",
        gender: d.gender || "",
        experience: d.experience || (d.yearsOfExperience != null ? `${d.yearsOfExperience} yrs` : ""),
        license: d.license || d.medicalLicense?.number || "",
        createdAt: d.createdAt,
      },
      misconductReports: issues.map(complianceDoc),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load doctor detail" });
  }
});

/** Full patient record + misconduct reports against them (for suspension decisions). */
router.get("/patients/:id/admin-detail", authRequired, requireApproved, requireRole("admin"), async (req, res) => {
  try {
    const p = await User.findById(req.params.id).select("-password");
    if (!p || p.role !== "patient") return res.status(404).json({ error: "Patient not found" });
    
    const issues = await ComplianceIssue.find({ reportedUserId: p._id }).sort({ createdAt: -1 });
    
    res.json({
      patient: registeredPatient(p),
      misconductReports: issues.map(complianceDoc),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load patient detail" });
  }
});

router.patch("/doctors/:id/approve", authRequired, requireApproved, requireRole("admin"), async (req, res) => {
  try {
    const d = await User.findByIdAndUpdate(req.params.id, { $set: { approved: true } }, { new: true });
    if (!d) return res.status(404).json({ error: "Not found" });
    const [mapped] = await mapDoctorsForList([d], {
      viewerRole: "admin",
      patientLat: null,
      patientLon: null,
      patientHasCoords: false,
    });
    res.json(mapped);
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

router.delete("/doctors/:id", authRequired, requireApproved, requireRole("admin"), async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

router.patch("/doctors/:id/status", authRequired, requireApproved, requireRole("admin"), async (req, res) => {
  try {
    const { status } = req.body;
    if (!["Active", "Suspended"].includes(status)) return res.status(400).json({ error: "Bad status" });
    const d = await User.findByIdAndUpdate(req.params.id, { $set: { doctorStatus: status } }, { new: true });
    if (!d) return res.status(404).json({ error: "Not found" });
    const [mapped] = await mapDoctorsForList([d], {
      viewerRole: "admin",
      patientLat: null,
      patientLon: null,
      patientHasCoords: false,
    });
    res.json(mapped);
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

router.post("/doctors/:doctorId/reviews", authRequired, requireApproved, requireRole("patient"), async (req, res) => {
  try {
    const { doctorId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(doctorId)) return res.status(400).json({ error: "Invalid doctor" });
    const { rating, comment, appointmentId } = req.body;
    const r = Number(rating);
    if (!Number.isFinite(r) || r < 1 || r > 5) return res.status(400).json({ error: "Rating must be 1–5" });
    const doctor = await User.findOne({ _id: doctorId, role: "doctor", approved: true });
    if (!doctor) return res.status(404).json({ error: "Doctor not found" });
    const setDoc = {
      rating: Math.round(r),
      comment: String(comment || "").slice(0, 2000),
    };
    if (appointmentId && mongoose.Types.ObjectId.isValid(appointmentId)) {
      const apt = await Appointment.findOne({
        _id: appointmentId,
        patientId: req.user.id,
        doctorId: doctor._id,
      });
      if (apt) setDoc.appointmentId = apt._id;
    }
    const rev = await DoctorReview.findOneAndUpdate(
      { doctorId: doctor._id, patientId: req.user.id },
      { $set: setDoc },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({
      id: rev._id.toString(),
      doctorId: rev.doctorId.toString(),
      rating: rev.rating,
      comment: rev.comment,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to save review" });
  }
});

router.get("/doctors/:doctorId/reviews/me", authRequired, requireApproved, requireRole("patient"), async (req, res) => {
  try {
    const { doctorId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(doctorId)) return res.status(400).json({ error: "Invalid doctor" });
    const rev = await DoctorReview.findOne({ doctorId, patientId: req.user.id });
    if (!rev) return res.json({ review: null });
    res.json({
      review: { id: rev._id.toString(), rating: rev.rating, comment: rev.comment },
    });
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

router.patch("/me/location", authRequired, requireApproved, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ error: "Invalid coordinates" });
    }
    const u = await User.findByIdAndUpdate(req.user.id, { $set: { latitude: lat, longitude: lng } }, { new: true }).select(
      "-password"
    );
    if (!u) return res.status(404).json({ error: "Not found" });
    res.json({ user: userToClient(u) });
  } catch (e) {
    res.status(500).json({ error: "Failed to update location" });
  }
});

router.put("/me/profile", authRequired, requireApproved, requireRole("patient", "admin", "doctor"), async (req, res) => {
  try {
    const { name, email, phone, dob, avatar } = req.body;
    const updateData = {};
    
    if (name) updateData.name = name;
    if (email) updateData.email = email.toLowerCase();
    
    // Calculate age from date of birth
    if (dob) {
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      updateData.age = age;
      updateData.dob = dob;
    }
    
    // Store phone, gender, bloodGroup
    if (phone) updateData.phone = phone;
    if (req.body.gender) updateData.gender = req.body.gender;
    if (req.body.bloodGroup) updateData.bloodGroup = req.body.bloodGroup;
    if (avatar !== undefined) updateData.avatar = avatar;
    
    const u = await User.findByIdAndUpdate(req.user.id, { $set: updateData }, { new: true }).select("-password");
    if (!u) return res.status(404).json({ error: "Not found" });
    
    // If an avatar was provided, update all conversations where this user is involved
    if (avatar !== undefined) {
      if (req.user.role === "doctor") {
        await Conversation.updateMany({ doctorId: req.user.id }, { $set: { doctorAvatar: avatar } });
      } else if (req.user.role === "patient") {
        await Conversation.updateMany({ patientId: req.user.id }, { $set: { patientAvatar: avatar } });
      }
    }
    
    res.json({ user: userToClient(u) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// ——— Appointments ———
router.get("/appointments", authRequired, requireApproved, async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === "patient") filter.patientId = req.user.id;
    else if (req.user.role === "doctor") {
      const me = await User.findById(req.user.id);
      filter = {
        $or: [{ doctorId: req.user.id }, { doctor: me?.name }],
      };
    }
    const list = await Appointment.find(filter).sort({ createdAt: -1 });
    res.json(list.map(appointmentDoc));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed" });
  }
});

// Get available time slots for a doctor on a specific date
router.get("/doctors/:doctorId/available-slots", authRequired, requireApproved, async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: "Date is required (YYYY-MM-DD format)" });
    }
    
    // Get doctor's schedule
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== "doctor") {
      return res.status(404).json({ error: "Doctor not found" });
    }
    
    // Define standard time slots (9 AM to 6 PM)
    const allTimeSlots = [
      "09:00 AM", "09:30 AM",
      "10:00 AM", "10:30 AM",
      "11:00 AM", "11:30 AM",
      "12:00 PM", "12:30 PM",
      "01:00 PM", "01:30 PM",
      "02:00 PM", "02:30 PM",
      "03:00 PM", "03:30 PM",
      "04:00 PM", "04:30 PM",
      "05:00 PM", "05:30 PM",
      "06:00 PM"
    ];
    
    // Get existing appointments for this doctor on this date
    const existingAppointments = await Appointment.find({
      doctorId: doctorId,
      date: { $regex: date, $options: "i" }, // Flexible date matching
      status: { $in: ["confirmed", "pending"] },
    });
    
    // Extract booked times
    const bookedTimes = existingAppointments.map(apt => apt.time);
    
    // Filter out booked slots
    const availableSlots = allTimeSlots.filter(slot => !bookedTimes.includes(slot));
    
    res.json({
      doctorId,
      date,
      availableSlots,
      bookedSlots: bookedTimes,
      totalAvailable: availableSlots.length,
      totalBooked: bookedTimes.length,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch available slots" });
  }
});

router.post("/appointments", authRequired, requireApproved, requireRole("patient"), async (req, res) => {
  try {
    // Default to demo-friendly behavior unless explicitly disabled.
    if (process.env.ALLOW_UNPAID_APPOINTMENTS === "false") {
      return res.status(403).json({
        error:
          "Free appointment booking is disabled. Pay the consultation fee in the app (Razorpay), or set ALLOW_UNPAID_APPOINTMENTS=true.",
      });
    }
    const { doctorId, doctor, specialty, time, date, type, status, avatar, patientName } = req.body;
    const patient = await User.findById(req.user.id);
    let docId = doctorId ? new mongoose.Types.ObjectId(doctorId) : null;
    let doctorName = doctor;
    let spec = specialty;
    let av = avatar;
    let du = null;
    if (docId) {
      du = await User.findById(docId);
      if (du) {
        doctorName = du.name;
        spec = du.specialty || specialty;
        av = du.avatar || av;
      }
    }
    
    // Check for double booking
    if (docId && date && time) {
      const existing = await Appointment.findOne({
        doctorId: docId,
        date: { $regex: date, $options: "i" },
        time,
        status: { $in: ["confirmed", "pending"] }
      });
      if (existing) {
        return res.status(400).json({ error: "This time slot is already booked for the selected doctor." });
      }
    }

    const apt = await Appointment.create({
      patientId: req.user.id,
      doctorId: docId,
      doctor: doctorName,
      specialty: spec,
      time,
      date,
      type,
      status: status || "pending",
      avatar: av,
      patientName: patientName || patient?.name || "Patient",
    });

    await syncConsultationFromAppointment(apt);

    const feeNum = parseFloat(String(du?.fee || "$100").replace(/[^0-9.]/g, "")) || 100;
    if (docId && du) {
      await Earning.create({
        doctorId: docId,
        patient: patient?.name || "Patient",
        type: `${type} Consultation`,
        amount: type === "Video" ? feeNum : type === "In-Person" ? feeNum * 1.2 : feeNum * 0.7,
        date,
        status: "Pending",
      });
      await notifToDoctor(docId, "New appointment", `${patient?.name} booked an appointment on ${date}`, "appointment");
    }

    await Notification.create({
      userId: req.user.id,
      title: "Appointment Booked",
      message: `Appointment with ${doctorName} on ${date}`,
      time: "Just now",
      read: false,
      type: "appointment",
    });

    res.status(201).json(appointmentDoc(apt));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create appointment" });
  }
});

router.patch("/appointments/:id/status", authRequired, requireApproved, async (req, res) => {
  try {
    const { status } = req.body;
    const apt = await Appointment.findById(req.params.id);
    if (!apt) return res.status(404).json({ error: "Not found" });
    if (req.user.role === "patient" && apt.patientId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    apt.status = status;
    await apt.save();
    await syncConsultationFromAppointment(apt);

    if (status === "completed" && apt.doctorId) {
      await Earning.updateMany(
        { doctorId: apt.doctorId, patient: apt.patientName, status: "Pending" },
        { $set: { status: "Completed" } }
      );
    }

    await Notification.create({
      userId: apt.patientId,
      title: `Appointment ${status}`,
      message: `Appointment with ${apt.doctor} has been ${status}`,
      time: "Just now",
      read: false,
      type: "appointment",
    });

    res.json(appointmentDoc(apt));
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

// ——— Prescriptions ———
router.get("/prescriptions", authRequired, requireApproved, async (req, res) => {
  try {
    let q = {};
    const me = await User.findById(req.user.id);
    if (req.user.role === "patient") q.patientId = req.user.id;
    else if (req.user.role === "doctor") q = { $or: [{ doctorId: req.user.id }, { doctor: me?.name }] };
    else q = {};
    const list = await Prescription.find(q).sort({ createdAt: -1 });
    res.json(list.map(prescriptionDoc));
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

router.post("/prescriptions", authRequired, requireApproved, async (req, res) => {
  try {
    const body = req.body;
    let patientId = body.patientId;
    if (req.user.role === "patient") {
      patientId = req.user.id;
    } else if (req.user.role === "doctor") {
      if (!patientId) return res.status(400).json({ error: "patientId is required" });
    } else {
      patientId = body.patientId || req.user.id;
    }
    const p = await Prescription.create({
      ...body,
      patientId,
      doctorId: body.doctorId || (req.user.role === "doctor" ? req.user.id : undefined),
    });
    await Notification.create({
      userId: patientId,
      title: "New Prescription",
      message: `${p.medicine} prescribed by ${p.doctor}`,
      time: "Just now",
      read: false,
      type: "prescription",
    });
    res.status(201).json(prescriptionDoc(p));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed" });
  }
});

// ——— Conversations ———
router.post("/conversations/bootstrap", authRequired, requireApproved, requireRole("patient"), async (req, res) => {
  try {
    // Run in background to prevent UI hang
    ensurePatientConversations(req.user.id).catch(console.error);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed" });
  }
});

router.get("/admin/system-cleanup", authRequired, requireRole("admin"), async (req, res) => {
  try {
    // 1. Clear any avatar that is just initials (1-2 characters) from Users
    const users = await User.find({ avatar: { $regex: /^[A-Z]{1,2}$/ } });
    for (const u of users) {
      u.avatar = "";
      await u.save();
    }

    // 2. Clear initials from Conversations
    await Conversation.updateMany(
      { doctorAvatar: { $regex: /^[A-Z]{1,2}$/ } },
      { $set: { doctorAvatar: "" } }
    );
    await Conversation.updateMany(
      { patientAvatar: { $regex: /^[A-Z]{1,2}$/ } },
      { $set: { patientAvatar: "" } }
    );

    res.json({ success: true, message: `Cleaned up ${users.length} users and all conversation avatars.` });
  } catch (e) {
    res.status(500).json({ error: "Cleanup failed" });
  }
});

router.get("/conversations", authRequired, requireApproved, async (req, res) => {
  try {
    let q = {};
    if (req.user.role === "patient") q.patientId = req.user.id;
    else if (req.user.role === "doctor") q.doctorId = req.user.id;
    
    const list = await Conversation.find(q)
      .select("patientId doctorId patientName doctorName patientAvatar doctorAvatar patientCondition doctorSpecialty lastMsg lastTime unreadDoctor unreadPatient updatedAt")
      .sort({ updatedAt: -1 })
      .lean();
      
    res.json(list.map(conversationDoc));
  } catch (e) {
    res.status(500).json({ error: "Failed to load conversations" });
  }
});

router.get("/conversations/:id/messages", authRequired, requireApproved, async (req, res) => {
  try {
    const list = await Message.find({ conversationId: req.params.id })
      .select("sender text time createdAt")
      .sort({ createdAt: 1 })
      .lean();
    res.json(list.map(messageDoc));
  } catch (e) {
    res.status(500).json({ error: "Failed to load messages" });
  }
});

router.post("/conversations/:id/messages", authRequired, requireApproved, async (req, res) => {
  try {
    const { text, sender } = req.body;
    const conv = await Conversation.findById(req.params.id);
    if (!conv) return res.status(404).json({ error: "Not found" });
    const role = req.user.role === "doctor" ? "doctor" : "patient";
    const actualSender = sender || role;
    const msg = await Message.create({
      conversationId: conv._id,
      sender: actualSender,
      text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
    conv.lastMsg = text;
    conv.lastTime = "Just now";
    if (actualSender === "patient") {
      conv.unreadDoctor = (conv.unreadDoctor || 0) + 1;
      conv.unreadPatient = 0;
    } else {
      conv.unreadPatient = (conv.unreadPatient || 0) + 1;
      conv.unreadDoctor = 0;
    }
    await conv.save();
    res.status(201).json(messageDoc(msg));
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

router.patch("/conversations/:id/read", authRequired, requireApproved, async (req, res) => {
  try {
    const { role } = req.body;
    const conv = await Conversation.findById(req.params.id);
    if (!conv) return res.status(404).json({ error: "Not found" });
    if (role === "doctor") conv.unreadDoctor = 0;
    else conv.unreadPatient = 0;
    await conv.save();
    res.json(conversationDoc(conv));
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

// ——— Consultations ———
router.get("/consultations", authRequired, requireApproved, async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    let q = {};
    if (req.user.role === "patient") {
      q = { $or: [{ patientId: req.user.id }, { patient: me?.name }] };
    } else if (req.user.role === "doctor") {
      q = { $or: [{ doctorId: req.user.id }, { doctor: me?.name }] };
    }
    const list = await Consultation.find(q).sort({ createdAt: -1 });
    res.json(list.map(consultationDoc));
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

router.patch("/consultations/:id", authRequired, requireApproved, requireRole("doctor"), async (req, res) => {
  try {
    const { status, diagnosis } = req.body;
    const c = await Consultation.findById(req.params.id);
    if (!c) return res.status(404).json({ error: "Not found" });
    if (status) c.status = status;
    if (status === "Ongoing") c.startedAt = Date.now();
    if (status === "Completed") {
      c.date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
      c.diagnosis = diagnosis || "Consultation completed";
    }
    await c.save();
    res.json(consultationDoc(c));
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

// ——— Earnings ———
router.get("/earnings", authRequired, requireApproved, requireRole("doctor"), async (req, res) => {
  try {
    const list = await Earning.find({ doctorId: req.user.id }).sort({ createdAt: -1 });
    res.json(list.map(earningDoc));
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

router.get("/earnings/summary", authRequired, requireApproved, requireRole("doctor"), async (req, res) => {
  try {
    const earnings = await Earning.find({ doctorId: req.user.id });
    const completed = earnings.filter((e) => e.status === "Completed");
    const pending = earnings.filter((e) => e.status === "Pending");
    const totalCompleted = completed.reduce((s, e) => s + e.amount, 0);
    const totalPending = pending.reduce((s, e) => s + e.amount, 0);
    res.json({
      totalCompleted,
      totalPending,
      completedCount: completed.length,
      pendingCount: pending.length,
      all: earnings.map(earningDoc),
    });
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

// ——— Patients (admin / doctor lists) ———
router.get("/patients", authRequired, requireApproved, requireRole("admin", "doctor"), async (req, res) => {
  try {
    const list = await User.find({ role: "patient" }).sort({ name: 1 });
    res.json(list.map(registeredPatient));
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

router.patch("/patients/:id/status", authRequired, requireApproved, requireRole("admin"), async (req, res) => {
  try {
    const { status } = req.body;
    const u = await User.findByIdAndUpdate(req.params.id, { $set: { userStatus: status } }, { new: true });
    if (!u) return res.status(404).json({ error: "Not found" });
    res.json(registeredPatient(u));
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

router.patch("/patients/:id/approve", authRequired, requireApproved, requireRole("admin"), async (req, res) => {
  try {
    const u = await User.findOneAndUpdate(
      { _id: req.params.id, role: "patient" },
      { $set: { approved: true } },
      { new: true }
    );
    if (!u) return res.status(404).json({ error: "Not found" });
    res.json(registeredPatient(u));
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

// ——— Doctor profile (current doctor) ———
router.get("/doctor-profile", authRequired, requireApproved, requireRole("doctor"), async (req, res) => {
  try {
    const u = await User.findById(req.user.id);
    if (!u) return res.status(404).json({ error: "Not found" });
    const sched = scheduleToObject(u.schedule);
    const defaultDay = { start: "09:00", end: "17:00", enabled: true };
    const schedule = {
      Monday: sched.Monday || defaultDay,
      Tuesday: sched.Tuesday || defaultDay,
      Wednesday: sched.Wednesday || defaultDay,
      Thursday: sched.Thursday || defaultDay,
      Friday: sched.Friday || defaultDay,
    };
    const notifications = {
      email: u.doctorNotifications?.get?.("email") ?? true,
      sms: u.doctorNotifications?.get?.("sms") ?? true,
      push: u.doctorNotifications?.get?.("push") ?? true,
      appointments: u.doctorNotifications?.get?.("appointments") ?? true,
      alerts: u.doctorNotifications?.get?.("alerts") ?? true,
    };
    res.json({
      name: u.name,
      specialization: u.specialty || "",
      license: u.license || "",
      experience: u.experience || "",
      fee: String(u.fee || "").replace(/[^0-9.]/g, "") || "100",
      hospital: u.hospital || "",
      practiceAddress: u.practiceAddress || "",
      latitude: u.latitude ?? null,
      longitude: u.longitude ?? null,
      avatar: u.avatar || "",
      schedule,
      notifications,
    });
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

router.put("/doctor-profile", authRequired, requireApproved, requireRole("doctor"), async (req, res) => {
  try {
    const { name, specialization, license, experience, fee, hospital, practiceAddress, latitude, longitude, schedule, notifications, avatar } =
      req.body;
    const u = await User.findById(req.user.id);
    if (!u) return res.status(404).json({ error: "Not found" });
    if (name) u.name = name;
    if (specialization) u.specialty = specialization;
    if (avatar) u.avatar = avatar;
    if (license) u.license = license;
    if (experience) u.experience = experience;
    if (fee) u.fee = fee.startsWith?.("$") ? fee : `$${fee}`;
    if (hospital !== undefined) u.hospital = hospital;
    if (practiceAddress !== undefined) u.practiceAddress = practiceAddress;
    if (latitude === null && longitude === null) {
      u.latitude = null;
      u.longitude = null;
    } else if (latitude !== undefined && longitude !== undefined) {
      const lat = Number(latitude);
      const lng = Number(longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        u.latitude = lat;
        u.longitude = lng;
      }
    }
    if (schedule) {
      u.schedule = new Map(Object.entries(schedule));
    }
    if (notifications) {
      u.doctorNotifications = new Map(Object.entries(notifications));
    }
    await u.save();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

router.get("/doctor/dashboard-summary", authRequired, requireApproved, requireRole("doctor"), async (req, res) => {
  try {
    const doctorApptFilter = { $or: [{ doctorId: req.user.id }] };
    const doctorRxFilter = { $or: [{ doctorId: req.user.id }] };

    const [
      me,
      appointments,
      rxList,
      convs,
      recentApts,
      monthEarn,
      prevMonthEarn,
      notifs,
      allCompletedEarn
    ] = await Promise.all([
      User.findById(req.user.id).lean(),
      Appointment.find(doctorApptFilter).sort({ time: 1 }).lean(),
      Prescription.find(doctorRxFilter).lean(),
      Conversation.find({ doctorId: req.user.id }).lean(),
      Appointment.find({ ...doctorApptFilter, createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }).lean(),
      Earning.find({
        doctorId: req.user.id,
        status: "Completed",
        createdAt: { $gte: new Date(new Date().setDate(1)).setHours(0,0,0,0) },
      }).lean(),
      Earning.find({
        doctorId: req.user.id,
        status: "Completed",
        createdAt: { 
          $gte: new Date(new Date(new Date().setDate(1)).setMonth(new Date().getMonth() - 1)).setHours(0,0,0,0),
          $lt: new Date(new Date().setDate(1)).setHours(0,0,0,0)
        },
      }).lean(),
      Notification.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(8).lean(),
      Earning.find({ doctorId: req.user.id, status: "Completed" }).sort({ createdAt: -1 }).lean()
    ]);

    if (!me) return res.status(404).json({ error: "Not found" });

    const todayApts = appointments.filter(
      (a) => isAppointmentDateToday(a.date) && (a.status === "confirmed" || a.status === "pending")
    );

    const patientKeys = new Set();
    for (const a of appointments) {
      if (a.patientId) patientKeys.add(`id:${a.patientId}`);
      else if (a.patientName) patientKeys.add(`n:${a.patientName}`);
    }
    for (const p of rxList) {
      if (p.patientId) patientKeys.add(`id:${p.patientId}`);
      else if (p.patientName) patientKeys.add(`n:${p.patientName}`);
    }
    for (const c of convs) {
      if (c.patientId) patientKeys.add(`id:${c.patientId}`);
      else if (c.patientName) patientKeys.add(`n:${c.patientName}`);
    }

    const monthlyEarningsCompleted = monthEarn.reduce((s, e) => s + (e.amount || 0), 0);
    const prevMonthly = prevMonthEarn.reduce((s, e) => s + (e.amount || 0), 0);
    
    let earningsMonthChangePct = null;
    if (prevMonthly > 0) {
      earningsMonthChangePct = Math.round(((monthlyEarningsCompleted - prevMonthly) / prevMonthly) * 100);
    } else if (monthlyEarningsCompleted > 0) {
      earningsMonthChangePct = 100;
    }

    const doctorOid = new mongoose.Types.ObjectId(req.user.id);
    const reviewAgg = await DoctorReview.aggregate([
      { $match: { doctorId: doctorOid } },
      { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    const ratingAvg = reviewAgg[0]?.count > 0 ? Math.round(reviewAgg[0].avg * 10) / 10 : null;
    const reviewCount = reviewAgg[0]?.count ?? 0;

    const monthTotals = {};
    for (const e of allCompletedEarn) {
      const key = new Date(e.createdAt).toISOString().slice(0, 7);
      monthTotals[key] = (monthTotals[key] || 0) + (e.amount || 0);
    }
    const earningsByMonth = Object.entries(monthTotals)
      .map(([monthKey, amount]) => ({ monthKey, amount }))
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey))
      .slice(0, 3);

    const consults = await Consultation.find({
      $or: [{ doctorId: req.user.id }, { doctor: me.name }],
    });
    const completedConsultations = consults.filter((c) => c.status === "Completed").length;
    const pendingEarningsTotal = (await Earning.find({ doctorId: req.user.id, status: "Pending" })).reduce(
      (s, e) => s + e.amount,
      0
    );
    const unreadMessages = convs.reduce((s, c) => s + (c.unreadDoctor || 0), 0);

    const weekPatientKeys = new Set();
    for (const a of recentApts) {
      if (a.patientId) weekPatientKeys.add(`id:${a.patientId}`);
      else if (a.patientName) weekPatientKeys.add(`n:${a.patientName}`);
    }

    res.json({
      doctorName: me.name,
      myPatientCount: patientKeys.size,
      newPatientTouchesThisWeek: weekPatientKeys.size,
      todayAppointments: todayApts.map((a) => ({
        id: a._id.toString(),
        patientName: a.patientName || "Patient",
        time: a.time,
        type: a.type,
        status: a.status,
        avatar:
          a.avatar ||
          (a.patientName || "P")
            .split(" ")
            .map((x) => x[0])
            .join("")
            .slice(0, 2)
            .toUpperCase(),
      })),
      todayAppointmentCount: todayApts.length,
      monthlyEarningsCompleted,
      earningsMonthChangePct,
      ratingAvg,
      reviewCount,
      alerts: notifs.map(notificationDoc),
      earningsByMonth,
      completedConsultations,
      pendingEarningsTotal,
      unreadMessages,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});

// ——— Pharmacy ———
router.get("/pharmacy/medicines", authRequired, requireApproved, async (req, res) => {
  try {
    const list = await PharmacyMedicine.find().sort({ name: 1 });
    res.json(list.map(medicineDoc));
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

router.post("/pharmacy/medicines", authRequired, requireApproved, requireRole("admin"), async (req, res) => {
  try {
    const m = await PharmacyMedicine.create({ ...req.body, sold: 0, legacyId: Date.now() % 1000000 });
    res.status(201).json(medicineDoc(m));
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

router.patch("/pharmacy/medicines/:id/stock", authRequired, requireApproved, requireRole("admin"), async (req, res) => {
  try {
    const { stock } = req.body;
    const id = req.params.id;
    let m = await PharmacyMedicine.findById(id);
    if (!m) m = await PharmacyMedicine.findOne({ legacyId: Number(id) });
    if (!m) return res.status(404).json({ error: "Not found" });
    m.stock = stock;
    await m.save();
    res.json(medicineDoc(m));
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

router.patch("/pharmacy/medicines/:id", authRequired, requireApproved, requireRole("admin"), async (req, res) => {
  try {
    const id = req.params.id;
    let m = await PharmacyMedicine.findById(id);
    if (!m) m = await PharmacyMedicine.findOne({ legacyId: Number(id) });
    if (!m) return res.status(404).json({ error: "Not found" });
    const allowed = [
      "name",
      "category",
      "price",
      "stock",
      "description",
      "usage",
      "sideEffects",
      "warnings",
      "requiresPrescription",
    ];
    for (const k of allowed) {
      if (req.body[k] !== undefined) m[k] = req.body[k];
    }
    await m.save();
    res.json(medicineDoc(m));
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

// ——— Orders ———
router.get("/orders", authRequired, requireApproved, async (req, res) => {
  try {
    const list = await DeliveryOrder.find().sort({ createdAt: -1 });
    res.json(list.map(orderDoc));
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

router.post("/orders", authRequired, requireApproved, async (req, res) => {
  try {
    if (process.env.ALLOW_UNPAID_PHARMACY_ORDERS !== "true") {
      return res.status(403).json({
        error:
          "Unpaid pharmacy orders are disabled. Complete checkout with Razorpay, or set ALLOW_UNPAID_PHARMACY_ORDERS=true on the server for demo mode.",
      });
    }
    const { items, total, buyerName, buyerRole, address } = req.body;
    const role = req.user.role === "doctor" ? "doctor" : "patient";
    const o = await DeliveryOrder.create({
      buyerId: req.user.id,
      items,
      total,
      buyerName: buyerName || (await User.findById(req.user.id))?.name,
      buyerRole: buyerRole || role,
      address,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      status: "Processing",
    });
    for (const item of items || []) {
      const meds = await PharmacyMedicine.find();
      const med = meds.find((x) => x.name === item.name);
      if (med) {
        med.stock = Math.max(0, med.stock - item.qty);
        med.sold = (med.sold || 0) + item.qty;
        await med.save();
      }
    }
    await Notification.create({
      userId: req.user.id,
      title: "New Order",
      message: `Order placed successfully`,
      time: "Just now",
      read: false,
      type: "pharmacy",
    });
    res.status(201).json(orderDoc(o));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed" });
  }
});

router.patch("/orders/:id/status", authRequired, requireApproved, requireRole("admin"), async (req, res) => {
  try {
    const { status } = req.body;
    const o = await DeliveryOrder.findByIdAndUpdate(req.params.id, { $set: { status } }, { new: true });
    if (!o) return res.status(404).json({ error: "Not found" });
    res.json(orderDoc(o));
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

// ——— Compliance ———
router.get("/compliance", authRequired, requireApproved, requireRole("admin"), async (req, res) => {
  try {
    const list = await ComplianceIssue.find().sort({ createdAt: -1 });
    res.json(list.map(complianceDoc));
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

router.post("/compliance", authRequired, requireApproved, requireRole("admin"), async (req, res) => {
  try {
    const issue = await ComplianceIssue.create({
      ...req.body,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    });
    res.status(201).json(complianceDoc(issue));
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

router.post("/reports/misconduct", authRequired, requireApproved, requireRole("patient", "doctor"), async (req, res) => {
  try {
    const { reportedUserId, type, severity, desc } = req.body;
    if (!reportedUserId || !type || !severity || !desc) {
      return res.status(400).json({ error: "reportedUserId, type, severity and desc are required" });
    }
    const me = await User.findById(req.user.id);
    const target = await User.findById(reportedUserId);
    if (!me || !target) return res.status(404).json({ error: "User not found" });
    if (target.role === me.role || target.role === "admin") {
      return res.status(400).json({ error: "You can only report the opposite clinical role" });
    }
    const issue = await ComplianceIssue.create({
      category: "misconduct",
      type,
      entity: `${target.name} (${target.role})`,
      severity,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      status: "Open",
      desc: String(desc).slice(0, 2000),
      reporterId: me._id,
      reporterName: me.name,
      reporterRole: me.role,
      reportedUserId: target._id,
      reportedUserName: target.name,
      reportedUserRole: target.role,
    });
    res.status(201).json(complianceDoc(issue));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to submit report" });
  }
});

router.patch("/compliance/:id/status", authRequired, requireApproved, requireRole("admin"), async (req, res) => {
  try {
    const { status, resolutionNotes } = req.body;
    const i = await ComplianceIssue.findByIdAndUpdate(
      req.params.id,
      { $set: { status, resolutionNotes: resolutionNotes || "" } },
      { new: true }
    );
    if (!i) return res.status(404).json({ error: "Not found" });
    if (i.reportedUserId && status === "Resolved") {
      const shouldSuspend = (resolutionNotes || "").toLowerCase().includes("suspend");
      if (shouldSuspend) {
        const roleField = i.reportedUserRole === "doctor" ? "doctorStatus" : "userStatus";
        await User.findByIdAndUpdate(i.reportedUserId, { $set: { [roleField]: "Suspended" } });
      }
    }
    res.json(complianceDoc(i));
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

// ——— Admin settings ———
router.get("/admin/settings", authRequired, requireApproved, requireRole("admin"), async (req, res) => {
  try {
    let s = await AdminSettings.findOne({ singleton: "default" });
    if (!s) {
      s = await AdminSettings.create({
        singleton: "default",
        platformName: "MediConnect+",
        supportEmail: "support@mediconnect.com",
        currency: "USD",
        commissionRate: 15,
        maintenance: false,
        registration: true,
        doctorApproval: true,
        emailNotifications: true,
        systemAlerts: true,
        sessionTimeout: 30,
        maxLoginAttempts: 5,
        passwordMinLength: 8,
      });
    }
    res.json({
      platformName: s.platformName,
      supportEmail: s.supportEmail,
      currency: s.currency,
      commissionRate: s.commissionRate,
      maintenance: s.maintenance,
      registration: s.registration,
      doctorApproval: s.doctorApproval,
      emailNotifications: s.emailNotifications,
      systemAlerts: s.systemAlerts,
      sessionTimeout: s.sessionTimeout,
      maxLoginAttempts: s.maxLoginAttempts,
      passwordMinLength: s.passwordMinLength,
    });
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

router.put("/admin/settings", authRequired, requireApproved, requireRole("admin"), async (req, res) => {
  try {
    await AdminSettings.findOneAndUpdate({ singleton: "default" }, { $set: req.body }, { upsert: true });
    const s = await AdminSettings.findOne({ singleton: "default" });
    res.json({
      platformName: s.platformName,
      supportEmail: s.supportEmail,
      currency: s.currency,
      commissionRate: s.commissionRate,
      maintenance: s.maintenance,
      registration: s.registration,
      doctorApproval: s.doctorApproval,
      emailNotifications: s.emailNotifications,
      systemAlerts: s.systemAlerts,
      sessionTimeout: s.sessionTimeout,
      maxLoginAttempts: s.maxLoginAttempts,
      passwordMinLength: s.passwordMinLength,
    });
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

// ——— Admin stats ———
router.get("/admin/stats", authRequired, requireApproved, requireRole("admin"), async (req, res) => {
  try {
    const [
      patients,
      doctors,
      appointments,
      earnings,
      orders,
      medicines,
      issues
    ] = await Promise.all([
      User.find({ role: "patient" }).lean(),
      User.find({ role: "doctor" }).lean(),
      Appointment.find().lean(),
      Earning.find().lean(),
      DeliveryOrder.find().lean(),
      PharmacyMedicine.find().lean(),
      ComplianceIssue.find().lean()
    ]);

    const totalRevenue = earnings.reduce((s, e) => s + (e.amount || 0), 0);
    const completedRevenue = earnings.filter((e) => e.status === "Completed").reduce((s, e) => s + (e.amount || 0), 0);
    const pendingRevenue = earnings.filter((e) => e.status === "Pending").reduce((s, e) => s + (e.amount || 0), 0);
    const pharmacyRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
    const totalUsers = patients.length;
    const activeDoctorsCount = doctors.filter((d) => d.approved !== false && d.doctorStatus !== "Suspended").length;
    const pendingDoctorsCount = doctors.filter((d) => d.approved === false).length;
    const totalAppointmentsCount = appointments.length;
    const completedAppointmentsCount = appointments.filter((a) => a.status === "completed").length;
    const totalStock = medicines.reduce((s, m) => s + (m.stock || 0), 0);
    const totalSold = medicines.reduce((s, m) => s + (m.sold || 0), 0);
    const lowStockCount = medicines.filter((m) => (m.stock || 0) > 0 && (m.stock || 0) < 10).length;
    const outOfStockCount = medicines.filter((m) => (m.stock || 0) === 0).length;
    const openIssuesCount = issues.filter((i) => i.status !== "Resolved").length;
    const resolvedIssuesCount = issues.filter((i) => i.status === "Resolved").length;
    const complianceScore = issues.length ? Math.round((resolvedIssuesCount / issues.length) * 100) : 100;

    const doctorList = await mapDoctorsForList(doctors, {
      viewerRole: "admin",
      patientLat: null,
      patientLon: null,
      patientHasCoords: false,
    });

    res.json({
      totalRevenue,
      completedRevenue,
      pendingRevenue,
      pharmacyRevenue,
      totalUsers,
      activeDoctors: activeDoctorsCount,
      pendingDoctors: pendingDoctorsCount,
      totalAppointments: totalAppointmentsCount,
      completedAppointments: completedAppointmentsCount,
      totalStock,
      totalSold,
      lowStockCount,
      outOfStockCount,
      openIssues: openIssuesCount,
      resolvedIssues: resolvedIssuesCount,
      complianceScore,
      patients: patients.map(registeredPatient),
      doctors: doctorList,
      appointments: appointments.map(appointmentDoc),
      earnings: earnings.map(earningDoc),
      orders: orders.map(orderDoc),
      medicines: medicines.map(medicineDoc),
      issues: issues.map(complianceDoc),
    });
  } catch (e) {
    console.error("[ADMIN_STATS_ERROR]", e);
    res.status(500).json({ error: "Failed to load admin stats" });
  }
});

// ——— Notifications ———
router.get("/notifications", authRequired, requireApproved, async (req, res) => {
  try {
    const list = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(list.map(notificationDoc));
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

router.patch("/notifications/:id/read", authRequired, requireApproved, async (req, res) => {
  try {
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: { read: true } },
      { new: true }
    );
    if (!n) return res.status(404).json({ error: "Not found" });
    res.json(notificationDoc(n));
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

router.post("/notifications/read-all", authRequired, requireApproved, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user.id }, { $set: { read: true } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

// ========================================
// DOCTOR LICENSE VERIFICATION (Like CareConnect)
// ========================================

// Doctor uploads license details
router.put("/doctors/license", authRequired, requireApproved, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (user.role !== "doctor") {
      return res.status(403).json({ error: "Only doctors can update license information" });
    }
    
    const { licenseNumber, issuingAuthority, expiryDate, qualification, yearsOfExperience, documentPath } = req.body;
    
    user.medicalLicense = {
      number: licenseNumber,
      issuingAuthority,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      document: documentPath,
    };
    user.qualification = qualification;
    user.yearsOfExperience = yearsOfExperience;
    user.verificationStatus = "pending";
    user.isVerified = false;
    
    await user.save();
    
    res.json({
      success: true,
      message: "License details submitted. Awaiting admin approval.",
      verificationStatus: "pending",
    });
  } catch (e) {
    console.error("Error updating license:", e);
    res.status(500).json({ error: "Failed to update license details" });
  }
});

// Admin approves or rejects doctor license
router.put("/admin/verify-doctor/:doctorId", authRequired, requireRole("admin"), async (req, res) => {
  try {
    const { status, reason } = req.body; // status: 'approved' or 'rejected'
    
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Status must be 'approved' or 'rejected'" });
    }
    
    const doctor = await User.findById(req.params.doctorId);
    
    if (!doctor || doctor.role !== "doctor") {
      return res.status(404).json({ error: "Doctor not found" });
    }
    
    doctor.verificationStatus = status;
    doctor.isVerified = status === "approved";
    doctor.rejectionReason = status === "rejected" ? reason : undefined;
    doctor.verifiedBy = req.user.id;
    doctor.verifiedAt = new Date();
    
    // Also set approved to true if verified
    if (status === "approved") {
      doctor.approved = true;
    }
    
    await doctor.save();
    
    res.json({
      success: true,
      message: `Doctor license ${status} successfully`,
      doctor: {
        id: doctor._id,
        name: doctor.name,
        verificationStatus: doctor.verificationStatus,
        isVerified: doctor.isVerified,
      },
    });
  } catch (e) {
    console.error("Error verifying doctor:", e);
    res.status(500).json({ error: "Failed to verify doctor license" });
  }
});

// Get all doctors pending verification (Admin only)
router.get("/admin/doctors/pending-verification", authRequired, requireRole("admin"), async (req, res) => {
  try {
    const pendingDoctors = await User.find({
      role: "doctor",
      verificationStatus: "pending",
    })
      .select("-password")
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: pendingDoctors.length,
      doctors: pendingDoctors.map((d) => ({
        id: d._id,
        name: d.name,
        email: d.email,
        specialty: d.specialty,
        qualification: d.qualification,
        yearsOfExperience: d.yearsOfExperience,
        medicalLicense: d.medicalLicense,
        verificationStatus: d.verificationStatus,
        createdAt: d.createdAt,
      })),
    });
  } catch (e) {
    console.error("Error fetching pending doctors:", e);
    res.status(500).json({ error: "Failed to fetch pending verifications" });
  }
});

// Get doctor's verification status
router.get("/doctors/verification-status", authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (user.role !== "doctor") {
      return res.status(403).json({ error: "Only doctors can check verification status" });
    }
    
    res.json({
      success: true,
      verificationStatus: user.verificationStatus,
      isVerified: user.isVerified,
      medicalLicense: user.medicalLicense,
      rejectionReason: user.rejectionReason,
    });
  } catch (e) {
    console.error("Error fetching verification status:", e);
    res.status(500).json({ error: "Failed to fetch verification status" });
  }
});

// ========================================
// PATIENT VITALS TRACKING (Like CareConnect)
// ========================================

// Doctor records patient vitals after consultation
router.post("/appointments/:id/vitals", authRequired, requireApproved, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }
    
    // Only the doctor who conducted the appointment can add vitals
    if (appointment.doctorId?.toString() !== req.user.id && appointment.doctor !== req.user.id) {
      return res.status(403).json({ error: "Only the assigned doctor can record vitals" });
    }
    
    // Update visit summary with vitals
    appointment.visitSummary = {
      ...appointment.visitSummary,
      ...req.body,
    };
    
    // Mark appointment as completed if not already
    if (appointment.status === "confirmed" || appointment.status === "pending") {
      appointment.status = "completed";
    }
    
    await appointment.save();
    
    res.json({
      success: true,
      message: "Patient vitals recorded successfully",
      vitals: appointment.visitSummary,
    });
  } catch (e) {
    console.error("Error recording vitals:", e);
    res.status(500).json({ error: "Failed to record vitals" });
  }
});

// Patient views their vitals history
router.get("/my-vitals", authRequired, async (req, res) => {
  try {
    const appointments = await Appointment.find({
      patientId: req.user.id,
      "visitSummary.bloodPressure": { $exists: true },
    })
      .sort({ date: -1 })
      .select("date doctor specialty type visitSummary")
      .limit(50);
    
    const vitalsHistory = appointments.map((apt) => ({
      _id: apt._id,
      date: apt.date,
      doctor: apt.doctor,
      specialty: apt.specialty,
      type: apt.type,
      vitals: apt.visitSummary,
    }));
    
    res.json({
      success: true,
      count: vitalsHistory.length,
      vitalsHistory,
    });
  } catch (e) {
    console.error("Error fetching vitals:", e);
    res.status(500).json({ error: "Failed to fetch vitals history" });
  }
});

// Doctor views patient's vitals history
router.get("/patients/:patientId/vitals", authRequired, requireApproved, async (req, res) => {
  try {
    const appointments = await Appointment.find({
      patientId: req.params.patientId,
      "visitSummary.bloodPressure": { $exists: true },
    })
      .sort({ date: -1 })
      .select("date doctor specialty type visitSummary")
      .limit(50);
    
    const vitalsHistory = appointments.map((apt) => ({
      _id: apt._id,
      date: apt.date,
      doctor: apt.doctor,
      specialty: apt.specialty,
      type: apt.type,
      vitals: apt.visitSummary,
    }));
    
    res.json({
      success: true,
      count: vitalsHistory.length,
      vitalsHistory,
    });
  } catch (e) {
    console.error("Error fetching patient vitals:", e);
    res.status(500).json({ error: "Failed to fetch patient vitals" });
  }
});

// Get latest vitals for a patient
router.get("/patients/:patientId/latest-vitals", authRequired, requireApproved, async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      patientId: req.params.patientId,
      "visitSummary.bloodPressure": { $exists: true },
    })
      .sort({ date: -1 })
      .select("date doctor visitSummary");
    
    if (!appointment) {
      return res.json({
        success: true,
        latestVitals: null,
        message: "No vitals recorded yet",
      });
    }
    
    res.json({
      success: true,
      latestVitals: {
        date: appointment.date,
        doctor: appointment.doctor,
        vitals: appointment.visitSummary,
      },
    });
  } catch (e) {
    console.error("Error fetching latest vitals:", e);
    res.status(500).json({ error: "Failed to fetch latest vitals" });
  }
});

export default router;

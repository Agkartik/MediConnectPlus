import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { User } from "./models/User.js";
import { Appointment } from "./models/Appointment.js";
import { Prescription } from "./models/Prescription.js";
import { Conversation } from "./models/Conversation.js";
import { Message } from "./models/Message.js";
import { Consultation } from "./models/Consultation.js";
import { Earning } from "./models/Earning.js";
import { PharmacyMedicine } from "./models/PharmacyMedicine.js";
import { ComplianceIssue } from "./models/ComplianceIssue.js";
import { AdminSettings } from "./models/AdminSettings.js";
import { Notification } from "./models/Notification.js";
import { DoctorReview } from "./models/DoctorReview.js";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/mediconnect";

const defaultMedicines = [
  { legacyId: 1, name: "Amlodipine 5mg", category: "Blood Pressure", price: 12.99, stock: 450, sold: 120, requiresPrescription: true, description: "Calcium channel blocker for hypertension" },
  { legacyId: 2, name: "Metformin 500mg", category: "Diabetes", price: 8.5, stock: 320, sold: 200, requiresPrescription: true, description: "First-line diabetes medication" },
  { legacyId: 3, name: "Paracetamol 500mg", category: "Pain Relief", price: 4.99, stock: 80, sold: 500, requiresPrescription: false, description: "Analgesic and antipyretic" },
  { legacyId: 4, name: "Cetirizine 10mg", category: "Allergy", price: 6.99, stock: 0, sold: 150, requiresPrescription: false, description: "Antihistamine for allergies" },
  { legacyId: 5, name: "Omeprazole 20mg", category: "Gastric", price: 9.99, stock: 200, sold: 90, requiresPrescription: true, description: "Proton pump inhibitor" },
  { legacyId: 6, name: "Vitamin D3 60K", category: "Supplements", price: 15.99, stock: 50, sold: 300, requiresPrescription: false, description: "Weekly vitamin D supplement" },
  { legacyId: 7, name: "Amoxicillin 250mg", category: "Antibiotic", price: 11.5, stock: 180, sold: 85, requiresPrescription: true, description: "Broad-spectrum antibiotic" },
  { legacyId: 8, name: "Ibuprofen 400mg", category: "Pain Relief", price: 5.99, stock: 300, sold: 220, requiresPrescription: false, description: "Anti-inflammatory painkiller" },
];

/** Mumbai-area coordinates — distances are computed vs patient location, not hardcoded */
const doctorCoords = [
  [19.076, 72.8777],
  [19.0896, 72.8656],
  [19.0544, 72.8766],
  [19.1136, 72.8697],
  [19.033, 72.8466],
  [19.097, 72.8827],
];

const seedDoctors = [
  { name: "Dr. Sarah Chen", specialty: "Cardiologist", available: "Today", avatar: "SC", fee: "$120", modes: ["video", "chat"], approved: true },
  { name: "Dr. James Miller", specialty: "Dermatologist", available: "Tomorrow", avatar: "JM", fee: "$100", modes: ["video"], approved: true },
  { name: "Dr. Priya Patel", specialty: "General Physician", available: "Today", avatar: "PP", fee: "$80", modes: ["video", "chat"], approved: true },
  { name: "Dr. Robert Lee", specialty: "Orthopedic", available: "Mar 30", avatar: "RL", fee: "$150", modes: ["video"], approved: true },
  { name: "Dr. Maria Garcia", specialty: "Neurologist", available: "Today", avatar: "MG", fee: "$140", modes: ["video", "chat"], approved: true },
  { name: "Dr. Ananya Sharma", specialty: "Pediatrician", available: "Tomorrow", avatar: "AS", fee: "$90", modes: ["video", "chat"], approved: true },
];

async function run() {
  await mongoose.connect(uri);
  console.log("Connected. Seeding...");

  await AdminSettings.findOneAndUpdate(
    { singleton: "default" },
    {
      $setOnInsert: {
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
      },
    },
    { upsert: true }
  );

  const adminEmail = process.env.ADMIN_EMAIL || "admin@mediconnect.com";
  const adminPass = process.env.ADMIN_PASSWORD || "admin123";
  const adminHash = await bcrypt.hash(adminPass, 10);
  await User.findOneAndUpdate(
    { email: adminEmail },
    {
      $setOnInsert: {
        email: adminEmail,
        password: adminHash,
        name: "Admin",
        role: "admin",
        avatar: "AD",
        approved: true,
      },
    },
    { upsert: true }
  );
  await User.updateOne({ email: adminEmail }, { $set: { approved: true } });
  console.log("Admin:", adminEmail);

  // Demo patient - ONLY for testing/demonstration
  // REAL USERS register themselves through the app with their own email
  const demoPatientEmail = "patient@demo.com";
  const demoPass = "demo123";
  const patientHash = await bcrypt.hash(demoPass, 10);
  let patient = await User.findOne({ email: demoPatientEmail });
  if (!patient) {
    patient = await User.create({
      email: demoPatientEmail,
      password: patientHash,
      name: "Demo Patient (For Testing Only)",
      role: "patient",
      avatar: "DP",
      age: 30,
      condition: "Hypertension",
      lastVisit: "Mar 25",
      nextVisit: "Apr 5",
      healthStatus: "Stable",
      approved: true,
    });
    console.log("Demo patient (testing only - real users register via app):", demoPatientEmail, "/", demoPass);
  }
  await User.updateOne(
    { email: demoPatientEmail },
    { $set: { approved: true, latitude: 19.0759, longitude: 72.8775 } }
  );

  const doctorIds = [];
  for (let i = 0; i < seedDoctors.length; i++) {
    const d = seedDoctors[i];
    const [lat, lng] = doctorCoords[i] || [19.076, 72.8777];
    const email = `${d.name.toLowerCase().replace(/[^a-z]+/g, ".")}@mediconnect.com`;
    let doc = await User.findOne({ email });
    const hash = await bcrypt.hash("doctor123", 10);
    if (!doc) {
      doc = await User.create({
        email,
        password: hash,
        name: d.name,
        role: "doctor",
        avatar: d.avatar,
        specialty: d.specialty,
        fee: d.fee,
        modes: d.modes,
        rating: 0,
        reviews: 0,
        available: d.available,
        approved: d.approved,
        doctorStatus: "Active",
        license: "MED-2024-001",
        experience: "10",
        hospital: "City General Hospital",
        practiceAddress: `${d.name} — City General Hospital`,
        latitude: lat,
        longitude: lng,
      });
    } else {
      await User.updateOne(
        { _id: doc._id },
        {
          $set: {
            practiceAddress: doc.practiceAddress || `${d.name} — City General Hospital`,
            latitude: doc.latitude != null ? doc.latitude : lat,
            longitude: doc.longitude != null ? doc.longitude : lng,
            rating: 0,
            reviews: 0,
          },
          $unset: { distance: "" },
        }
      );
      doc = await User.findById(doc._id);
    }
    doctorIds.push({ user: doc, seed: d });
  }
  await User.updateMany(
    { role: "doctor", name: { $in: seedDoctors.map((x) => x.name) } },
    { $set: { approved: true } }
  );

  if (patient && doctorIds.length >= 2 && (await DoctorReview.countDocuments()) === 0) {
    const sarah = doctorIds[0].user;
    const james = doctorIds[1].user;
    await DoctorReview.insertMany([
      { doctorId: sarah._id, patientId: patient._id, rating: 5, comment: "Excellent follow-up for BP." },
      { doctorId: james._id, patientId: patient._id, rating: 4, comment: "Helpful skin care advice." },
    ]);
    console.log("Demo doctor reviews seeded (demo patient)");
  }

  if ((await PharmacyMedicine.countDocuments()) === 0) {
    await PharmacyMedicine.insertMany(defaultMedicines);
    console.log("Pharmacy medicines seeded");
  }

  const sarah = doctorIds[0]?.user;
  if (patient && sarah && (await Appointment.countDocuments()) === 0) {
    await Appointment.insertMany([
      {
        patientId: patient._id,
        doctorId: sarah._id,
        doctor: "Dr. Sarah Chen",
        specialty: "Cardiologist",
        time: "10:00 AM",
        date: "Today, Mar 28",
        type: "Video",
        status: "confirmed",
        avatar: "SC",
        patientName: patient.name,
      },
    ]);
  }

  if (patient && doctorIds.length >= 3 && (await Conversation.countDocuments()) === 0) {
    const d1 = doctorIds[0].user;
    const d2 = doctorIds[1].user;
    const d3 = doctorIds[2].user;
    const convs = await Conversation.insertMany([
      {
        patientId: patient._id,
        doctorId: d1._id,
        doctorName: d1.name,
        patientName: patient.name,
        doctorAvatar: d1.avatar,
        patientAvatar: patient.avatar,
        doctorSpecialty: d1.specialty,
        patientCondition: "Hypertension",
        lastMsg: "Your test results look good!",
        lastTime: "2m ago",
        unreadDoctor: 0,
        unreadPatient: 2,
      },
      {
        patientId: patient._id,
        doctorId: d2._id,
        doctorName: d2.name,
        patientName: patient.name,
        doctorAvatar: d2.avatar,
        patientAvatar: patient.avatar,
        doctorSpecialty: d2.specialty,
        patientCondition: "Skin Care",
        lastMsg: "Please apply the cream twice daily",
        lastTime: "1h ago",
        unreadDoctor: 0,
        unreadPatient: 0,
      },
      {
        patientId: patient._id,
        doctorId: d3._id,
        doctorName: d3.name,
        patientName: patient.name,
        doctorAvatar: d3.avatar,
        patientAvatar: patient.avatar,
        doctorSpecialty: d3.specialty,
        patientCondition: "Checkup",
        lastMsg: "See you at your next appointment",
        lastTime: "Yesterday",
        unreadDoctor: 1,
        unreadPatient: 0,
      },
    ]);

    const c0 = convs[0];
    await Message.insertMany([
      { conversationId: c0._id, sender: "doctor", text: "Hello! How are you feeling today?", time: "10:00 AM" },
      { conversationId: c0._id, sender: "patient", text: "Hi Doctor, I'm feeling much better after the medication.", time: "10:02 AM" },
      { conversationId: c0._id, sender: "doctor", text: "That's great to hear! Your test results look good!", time: "10:05 AM" },
    ]);
    console.log("Conversations/messages seeded");
  }

  if (patient && sarah && (await Prescription.countDocuments()) === 0) {
    await Prescription.create({
      patientId: patient._id,
      doctorId: sarah._id,
      medicine: "Amlodipine 5mg",
      dosage: "1 tablet daily",
      doctor: "Dr. Sarah Chen",
      patientName: patient.name,
      date: "Mar 25, 2026",
      endDate: "Jun 25, 2026",
      status: "Active",
      notes: "Take in the morning with water",
      addedBy: "doctor",
    });
  }

  if (sarah && (await Consultation.countDocuments()) === 0 && patient) {
    await Consultation.insertMany([
      {
        patientId: patient._id,
        doctorId: sarah._id,
        patient: patient.name,
        doctor: sarah.name,
        type: "Video Call",
        status: "Ongoing",
        duration: "25 min",
        notes: "Reviewing BP medication efficacy",
        avatar: patient.avatar,
        startedAt: Date.now() - 25 * 60000,
      },
    ]);
  }

  if (sarah && patient && (await Earning.countDocuments()) === 0) {
    // Create earnings for last 3 months with proper timestamps
    const now = new Date();
    const earningsToCreate = [];
    
    // Current month
    for (let i = 0; i < 5; i++) {
      const dayOffset = Math.floor(Math.random() * 28) + 1;
      const earningDate = new Date(now.getFullYear(), now.getMonth(), dayOffset);
      earningsToCreate.push({
        doctorId: sarah._id,
        patient: patient.name,
        type: ["Video Consultation", "In-Person Visit", "Chat Consultation"][i % 3],
        amount: [100, 120, 70, 150, 200][i],
        date: earningDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        status: "Completed",
        createdAt: earningDate,
      });
    }
    
    // Previous month
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    for (let i = 0; i < 8; i++) {
      const dayOffset = Math.floor(Math.random() * 28) + 1;
      const earningDate = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), dayOffset);
      earningsToCreate.push({
        doctorId: sarah._id,
        patient: patient.name,
        type: ["Video Consultation", "In-Person Visit", "Chat Consultation"][i % 3],
        amount: [100, 120, 70, 150, 200, 180, 90, 110][i],
        date: earningDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        status: "Completed",
        createdAt: earningDate,
      });
    }
    
    // Two months ago
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    for (let i = 0; i < 6; i++) {
      const dayOffset = Math.floor(Math.random() * 28) + 1;
      const earningDate = new Date(twoMonthsAgo.getFullYear(), twoMonthsAgo.getMonth(), dayOffset);
      earningsToCreate.push({
        doctorId: sarah._id,
        patient: patient.name,
        type: ["Video Consultation", "In-Person Visit", "Chat Consultation"][i % 3],
        amount: [100, 120, 70, 150, 200, 180][i],
        date: earningDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        status: "Completed",
        createdAt: earningDate,
      });
    }
    
    await Earning.insertMany(earningsToCreate);
    console.log(`Created ${earningsToCreate.length} sample earnings for last 3 months`);
  }

  if ((await ComplianceIssue.countDocuments()) === 0) {
    await ComplianceIssue.insertMany([
      { type: "Prescription Irregularity", entity: "Dr. Unknown", severity: "High", date: "Mar 26", status: "Open", desc: "Unusual prescription pattern detected" },
      { type: "Late Cancellation", entity: "Dr. Sofia Rossi", severity: "Medium", date: "Mar 25", status: "Under Review", desc: "Multiple late cancellations in one week" },
    ]);
  }

  console.log("Seed completed.");
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

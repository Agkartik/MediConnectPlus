import { Router } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { Notification } from "../models/Notification.js";
import { authRequired } from "../middleware/auth.js";
import { signToken, userToClient } from "../utils/token.js";
import { sendOTP, verifyOTP } from "../utils/otp.js";
import { setAuthCookie, clearAuthCookie } from "../utils/cookieAuth.js";

const router = Router();

// Request OTP for email verification
router.post("/request-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    
    await sendOTP(email);
    res.json({ success: true, message: "OTP sent to your email" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

// Verify OTP
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required" });
    }
    
    const result = verifyOTP(email, otp);
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Verification failed" });
  }
});

router.post("/register", async (req, res) => {
  try {
    const { 
      email, password, name, role, 
      specialty, fee, modes,
      licenseNumber, qualification, experience, // Doctor fields
      dob, phone, gender, bloodGroup // Patient fields
    } = req.body;
    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: "email, password, name, and role are required" });
    }
    if (!["patient", "doctor"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ error: "Email already registered" });

    const hash = await bcrypt.hash(password, 10);
    const avatar = name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const doc = {
      email: email.toLowerCase(),
      password: hash,
      name: role === "doctor" && !name.startsWith("Dr.") ? `Dr. ${name}` : name,
      role,
      avatar,
      approved: role === "doctor" ? false : true,
    };

    if (role === "patient") {
      let age = 30;
      if (dob) {
        const birthDate = new Date(dob);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
      }
      doc.age = age;
      doc.dob = dob || "";
      doc.phone = phone || "";
      doc.gender = gender || "";
      doc.bloodGroup = bloodGroup || "";
      doc.condition = "General Checkup";
      doc.lastVisit = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
      doc.nextVisit = "TBD";
      doc.healthStatus = "Stable";
      doc.verificationStatus = "pending";
    }

    if (role === "doctor") {
      doc.specialty = specialty || "General Physician";
      doc.fee = fee ? (fee.startsWith("$") ? fee : `$${fee}`) : "$100";
      doc.modes = Array.isArray(modes) && modes.length ? modes : ["video", "chat"];
      doc.rating = 0;
      doc.reviews = 0;
      doc.available = "Today";
      doc.doctorStatus = "Active";
      doc.license = licenseNumber || "MED-PENDING";
      doc.experience = experience || "1";
      doc.hospital = "—";
      doc.qualification = qualification || "";
      doc.medicalLicense = {
        number: licenseNumber || "",
        status: "pending"
      };
      doc.verificationStatus = "pending";
    }

    const user = await User.create(doc);

    await Notification.create({
      userId: user._id,
      title: "Welcome!",
      message: "Welcome to MediConnect+. Explore the dashboard to get started.",
      time: "Just now",
      read: false,
      type: "system",
    });

    const token = signToken(user);
    
    // Set HTTP-only cookie (more secure than localStorage)
    setAuthCookie(res, token);
    
    res.status(201).json({ 
      token, // Also return token for backward compatibility
      user: userToClient(user),
      message: "Registration successful. Cookie set for secure authentication."
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "email and password required" });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });
    if (user.role === "patient" && user.userStatus === "Suspended") {
      return res.status(403).json({ error: "Account suspended" });
    }
    if (user.role === "doctor" && user.doctorStatus === "Suspended") {
      return res.status(403).json({ error: "Account suspended" });
    }
    const token = signToken(user);
    
    // Set HTTP-only cookie (more secure than localStorage)
    setAuthCookie(res, token);
    
    res.json({ 
      token, // Also return token for backward compatibility
      user: userToClient(user),
      message: "Login successful. Cookie set for secure authentication."
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Login failed" });
  }
});

router.get("/me", authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user: userToClient(user) });
  } catch (e) {
    res.status(500).json({ error: "Failed to load user" });
  }
});

// Logout - clear authentication cookie
router.post("/logout", (req, res) => {
  clearAuthCookie(res);
  res.json({ 
    success: true, 
    message: "Logged out successfully. Cookie cleared."
  });
});

export default router;

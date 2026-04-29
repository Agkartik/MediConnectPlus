import mongoose from "mongoose";

const scheduleDaySchema = new mongoose.Schema(
  {
    start: String,
    end: String,
    enabled: Boolean,
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ["patient", "doctor", "admin"], required: true },
    avatar: { type: String, default: "" },
    // Patient
    age: { type: Number },
    dob: { type: String },
    phone: { type: String },
    gender: { type: String },
    bloodGroup: { type: String },
    condition: { type: String },
    lastVisit: { type: String },
    nextVisit: { type: String },
    healthStatus: { type: String, enum: ["Stable", "Monitoring", "Critical"], default: "Stable" },
    userStatus: { type: String, enum: ["Active", "Suspended"], default: "Active" },
    // Doctor listing
    specialty: { type: String },
    fee: { type: String },
    modes: [{ type: String }],
    approved: { type: Boolean, default: false },
    doctorStatus: { type: String, enum: ["Active", "Suspended"], default: "Active" },
    rating: { type: Number, default: 4.5 },
    reviews: { type: Number, default: 0 },
    distance: { type: String },
    available: { type: String },
    license: { type: String },
    experience: { type: String },
    hospital: { type: String },
    practiceAddress: { type: String, default: "" },
    
    // Doctor License Verification (Like CareConnect)
    medicalLicense: {
      number: { type: String },                  // License number
      issuingAuthority: { type: String },        // e.g., "Medical Council of India"
      expiryDate: { type: Date },                // License expiration
      document: { type: String },                // File path to uploaded license
      documentType: { type: String },            // 'pdf', 'image', etc.
    },
    qualification: { type: String },             // e.g., "MBBS, MD"
    yearsOfExperience: { type: Number },         // Numeric years
    verificationStatus: { 
      type: String, 
      enum: ["pending", "approved", "rejected", null],
      default: null,
    },
    isVerified: { type: Boolean, default: false }, // Quick access flag
    rejectionReason: { type: String },           // If rejected, why?
    verifiedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User" 
    },                                             // Admin who verified
    verifiedAt: { type: Date },                  // When verified
    
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    schedule: { type: Map, of: scheduleDaySchema },
    doctorNotifications: { type: Map, of: Boolean },
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model("User", userSchema);

export interface Doctor {
  id: string;
  email?: string;
  phone?: string;
  name: string;
  specialty: string;
  /** Average from real reviews only; null when there are no reviews */
  rating: number | null;
  reviews: number;
  distance: string;
  distanceKm?: number | null;
  hasClinicLocation?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  practiceAddress?: string;
  available: string;
  avatar: string;
  fee: string;
  modes: string[];
  approved?: boolean;
  status?: "Active" | "Suspended";
  qualification?: string;
  yearsOfExperience?: number;
  verificationStatus?: "pending" | "approved" | "rejected" | null;
  medicalLicense?: {
    number?: string;
    issuingAuthority?: string;
    expiryDate?: string;
    document?: string;
  };
  hospital?: string;
}

export interface Appointment {
  id: string;
  doctorId?: string | null;
  doctor: string;
  specialty: string;
  time: string;
  date: string;
  type: "Video" | "In-Person" | "Chat";
  status: "confirmed" | "pending" | "completed" | "cancelled";
  avatar: string;
  patientName?: string;
  paymentStatus?: "paid" | "unpaid";
  consultationFeeInr?: number;
}

export interface Prescription {
  id: string;
  medicine: string;
  dosage: string;
  doctor: string;
  patientName: string;
  date: string;
  endDate: string;
  status: "Active" | "Completed";
  notes: string;
  addedBy: "doctor" | "patient";
}

export interface CartItem {
  medicineId: number;
  quantity: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: "appointment" | "prescription" | "system" | "pharmacy";
}

export interface ChatMessage {
  id: string;
  sender: "doctor" | "patient";
  text: string;
  time: string;
  conversationId: string;
}

export interface Conversation {
  id: string;
  doctorName: string;
  patientName: string;
  doctorAvatar: string;
  patientAvatar: string;
  doctorSpecialty: string;
  patientCondition: string;
  lastMsg: string;
  lastTime: string;
  unreadDoctor: number;
  unreadPatient: number;
}

export interface ConsultationSession {
  id: string;
  appointmentId?: string | null;
  patient: string;
  doctor: string;
  type: "Video Call" | "Chat" | "In-Person";
  status: "Ongoing" | "Waiting" | "Completed";
  duration: string;
  notes: string;
  avatar: string;
  date?: string;
  diagnosis?: string;
  startedAt?: number;
}

export interface Earning {
  id: string;
  patient: string;
  type: string;
  amount: number;
  date: string;
  status: "Completed" | "Pending";
}

export interface DoctorTodayAppointment {
  id: string;
  patientName: string;
  time: string;
  type: string;
  status: string;
  avatar: string;
}

export interface DoctorDashboardMonthEarning {
  monthKey: string;
  amount: number;
}

export interface DoctorDashboardSummary {
  doctorName: string;
  myPatientCount: number;
  newPatientTouchesThisWeek: number;
  todayAppointments: DoctorTodayAppointment[];
  todayAppointmentCount: number;
  monthlyEarningsCompleted: number;
  earningsMonthChangePct: number | null;
  ratingAvg: number | null;
  reviewCount: number;
  alerts: Notification[];
  earningsByMonth: DoctorDashboardMonthEarning[];
  completedConsultations: number;
  pendingEarningsTotal: number;
  unreadMessages: number;
}

export interface RegisteredPatient {
  id: string;
  email?: string;
  name: string;
  age: number;
  condition: string;
  lastVisit: string;
  nextVisit: string;
  status: "Stable" | "Monitoring" | "Critical";
  avatar: string;
  userStatus?: "Active" | "Suspended";
  approved?: boolean;
  phone?: string;
  dob?: string;
  gender?: string;
  bloodGroup?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface DoctorProfile {
  name: string;
  specialization: string;
  license: string;
  experience: string;
  fee: string;
  hospital: string;
  practiceAddress: string;
  latitude: number | null;
  longitude: number | null;
  avatar?: string;
  schedule: Record<string, { start: string; end: string; enabled: boolean }>;
  notifications: Record<string, boolean>;
}

export interface VideoCallState {
  active: boolean;
  remoteName: string;
  remoteAvatar: string;
  type: "patient" | "doctor";
  appointmentId?: string;
  consultationId?: string;
}

export interface PharmacyMedicine {
  id: number;
  /** Present when loaded from API — used for admin stock updates */
  _mongoId?: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  sold: number;
  requiresPrescription: boolean;
  /** Short line shown on medicine cards */
  description: string;
  /** What it is used for (conditions, symptoms) */
  usage: string;
  /** Common side effects — informational */
  sideEffects: string;
  /** Warnings and precautions */
  warnings: string;
}

export interface DeliveryOrder {
  id: string;
  items: { name: string; qty: number; price: number }[];
  total: number;
  buyerName: string;
  buyerRole: "patient" | "doctor";
  address: string;
  status: "Processing" | "Shipped" | "Delivered" | "Cancelled";
  date: string;
  paymentStatus?: "paid" | "unpaid";
  razorpayPaymentId?: string;
}

export interface ComplianceIssue {
  id: string;
  type: string;
  entity: string;
  severity: "High" | "Medium" | "Low";
  date: string;
  status: "Open" | "Under Review" | "Resolved";
  desc: string;
  category?: "misconduct" | "compliance" | "security";
  reporterId?: string;
  reporterName?: string;
  reporterRole?: "patient" | "doctor" | "admin";
  reportedUserId?: string;
  reportedUserName?: string;
  reportedUserRole?: "patient" | "doctor";
  resolutionNotes?: string;
}

export interface AdminSettings {
  platformName: string;
  supportEmail: string;
  currency: string;
  commissionRate: number;
  maintenance: boolean;
  registration: boolean;
  doctorApproval: boolean;
  emailNotifications: boolean;
  systemAlerts: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  passwordMinLength: number;
}

export interface AdminStats {
  totalRevenue: number;
  completedRevenue: number;
  pendingRevenue: number;
  pharmacyRevenue: number;
  totalUsers: number;
  activeDoctors: number;
  pendingDoctors: number;
  totalAppointments: number;
  completedAppointments: number;
  totalStock: number;
  totalSold: number;
  lowStockCount: number;
  outOfStockCount: number;
  openIssues: number;
  resolvedIssues: number;
  complianceScore: number;
  patients: RegisteredPatient[];
  doctors: Doctor[];
  appointments: Appointment[];
  earnings: Earning[];
  orders: DeliveryOrder[];
  medicines: PharmacyMedicine[];
  issues: ComplianceIssue[];
}

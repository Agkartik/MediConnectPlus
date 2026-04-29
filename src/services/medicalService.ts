import { apiFetch } from "@/lib/api";
import { notifyDataChanged } from "@/hooks/useAsyncSync";
import type {
  Doctor,
  Appointment,
  Prescription,
  Notification,
  ChatMessage,
  Conversation,
  ConsultationSession,
  Earning,
  RegisteredPatient,
  DoctorProfile,
  PharmacyMedicine,
  DeliveryOrder,
  ComplianceIssue,
  AdminSettings,
  AdminStats,
  DoctorDashboardSummary,
} from "@/types/store";

function n() {
  notifyDataChanged();
}

// ——— Auth ———
export async function authRegister(body: {
  email: string;
  password: string;
  name: string;
  role: "patient" | "doctor";
  specialty?: string;
  fee?: string;
  modes?: string[];
  // New verification fields
  licenseNumber?: string;
  qualification?: string;
  experience?: string;
  dob?: string;
  phone?: string;
  gender?: string;
  bloodGroup?: string;
}) {
  return apiFetch<{
    token: string;
    user: { id: string; email: string; name: string; role: string; approved?: boolean };
  }>("/api/auth/register", { method: "POST", body: JSON.stringify(body) });
}

export async function authLogin(email: string, password: string) {
  return apiFetch<{
    token: string;
    user: { id: string; email: string; name: string; role: string; approved?: boolean };
  }>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
}

export type AuthMeUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  approved?: boolean;
  age?: number;
  dob?: string;
  phone?: string;
  gender?: string;
  bloodGroup?: string;
  condition?: string;
  healthStatus?: string;
  hasLocation?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  specialty?: string;
  hasClinicLocation?: boolean;
  avatar?: string;
};

export async function authMe() {
  return apiFetch<{ user: AuthMeUser }>("/api/auth/me");
}

export async function updateMyLocation(latitude: number, longitude: number) {
  const { user } = await apiFetch<{ user: AuthMeUser }>("/api/me/location", {
    method: "PATCH",
    body: JSON.stringify({ latitude, longitude }),
  });
  n();
  return user;
}

export async function updateMyProfile(body: { name?: string; email?: string; phone?: string; dob?: string; avatar?: string }) {
  const { user } = await apiFetch<{ user: AuthMeUser }>("/api/me/profile", {
    method: "PUT",
    body: JSON.stringify(body),
  });
  n();
  return user;
}

// ——— Doctors ———
export async function getDoctors(): Promise<Doctor[]> {
  return apiFetch<Doctor[]>("/api/doctors");
}

export async function getDoctorAvailableSlots(doctorId: string, date: string) {
  return apiFetch<{
    doctorId: string;
    date: string;
    availableSlots: string[];
    bookedSlots: string[];
    totalAvailable: number;
    totalBooked: number;
  }>(`/api/doctors/${encodeURIComponent(doctorId)}/available-slots?date=${encodeURIComponent(date)}`);
}

export async function getMyDoctorReview(doctorId: string) {
  return apiFetch<{ review: { id: string; rating: number; comment: string } | null }>(
    `/api/doctors/${encodeURIComponent(doctorId)}/reviews/me`
  );
}

export async function submitDoctorReview(body: {
  doctorId: string;
  rating: number;
  comment?: string;
  appointmentId?: string;
}) {
  await apiFetch(`/api/doctors/${encodeURIComponent(body.doctorId)}/reviews`, {
    method: "POST",
    body: JSON.stringify({
      rating: body.rating,
      comment: body.comment ?? "",
      appointmentId: body.appointmentId,
    }),
  });
  n();
}

export async function getAllDoctorsForAdmin(): Promise<{ approved: Doctor[]; pending: Doctor[] }> {
  return apiFetch("/api/doctors/admin-split");
}

export type AdminDoctorDetailResponse = {
  doctor: Doctor & {
    dob?: string;
    gender?: string;
    experience?: string;
    license?: string;
    createdAt?: string;
  };
  misconductReports: ComplianceIssue[];
};

export type AdminPatientDetailResponse = {
  patient: RegisteredPatient;
  misconductReports: ComplianceIssue[];
};

export async function getDoctorAdminDetail(doctorId: string): Promise<AdminDoctorDetailResponse> {
  return apiFetch(`/api/doctors/${encodeURIComponent(doctorId)}/admin-detail`);
}

export async function getPatientAdminDetail(patientId: string): Promise<AdminPatientDetailResponse> {
  return apiFetch(`/api/patients/${encodeURIComponent(patientId)}/admin-detail`);
}


export async function approveDoctor(id: string) {
  await apiFetch(`/api/doctors/${id}/approve`, { method: "PATCH" });
  n();
}

export async function rejectDoctor(id: string) {
  await apiFetch(`/api/doctors/${id}`, { method: "DELETE" });
  n();
}

export async function updateDoctorStatus(id: string, status: "Active" | "Suspended") {
  await apiFetch(`/api/doctors/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
  n();
}

// ——— Appointments ———
export async function getAppointments(): Promise<Appointment[]> {
  return apiFetch<Appointment[]>("/api/appointments");
}

export async function getUpcomingAppointments(): Promise<Appointment[]> {
  const all = await getAppointments();
  return all.filter((a) => a.status === "confirmed" || a.status === "pending");
}

export async function getPastAppointments(): Promise<Appointment[]> {
  const all = await getAppointments();
  return all.filter((a) => a.status === "completed" || a.status === "cancelled");
}

export type NewAppointment = Omit<Appointment, "id"> & { doctorUserId?: string };

export async function addAppointment(apt: NewAppointment) {
  await apiFetch("/api/appointments", {
    method: "POST",
    body: JSON.stringify({
      doctorId: apt.doctorUserId,
      doctor: apt.doctor,
      specialty: apt.specialty,
      time: apt.time,
      date: apt.date,
      type: apt.type,
      status: apt.status,
      avatar: apt.avatar,
      patientName: apt.patientName,
    }),
  });
  n();
}

export async function updateAppointmentStatus(id: string, status: Appointment["status"]) {
  await apiFetch(`/api/appointments/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
  n();
}

// ——— Prescriptions ———
export async function getPrescriptions(): Promise<Prescription[]> {
  return apiFetch<Prescription[]>("/api/prescriptions");
}

export async function addPrescription(
  p: Omit<Prescription, "id"> & { patientId?: string; doctorId?: string }
) {
  await apiFetch("/api/prescriptions", { method: "POST", body: JSON.stringify(p) });
  n();
}

// ——— Messages ———
export async function bootstrapPatientConversations() {
  await apiFetch("/api/conversations/bootstrap", { method: "POST" });
  n();
}

export async function getConversations(): Promise<Conversation[]> {
  return apiFetch<Conversation[]>("/api/conversations");
}

export async function getMessages(conversationId: string): Promise<ChatMessage[]> {
  if (!conversationId) return [];
  return apiFetch<ChatMessage[]>(`/api/conversations/${conversationId}/messages`);
}

export async function sendMessage(conversationId: string, sender: "doctor" | "patient", text: string) {
  await apiFetch(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ text, sender }),
  });
  n();
}

export async function markConversationRead(conversationId: string, role: "doctor" | "patient") {
  await apiFetch(`/api/conversations/${conversationId}/read`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
  n();
}

// ——— Consultations ———
export async function getConsultations(): Promise<ConsultationSession[]> {
  return apiFetch<ConsultationSession[]>("/api/consultations");
}

export async function getActiveConsultations(): Promise<ConsultationSession[]> {
  const all = await getConsultations();
  return all.filter((c) => c.status === "Ongoing" || c.status === "Waiting");
}

export async function getCompletedConsultations(): Promise<ConsultationSession[]> {
  const all = await getConsultations();
  return all.filter((c) => c.status === "Completed");
}

export async function updateConsultationStatus(
  id: string,
  status: ConsultationSession["status"],
  diagnosis?: string
) {
  await apiFetch(`/api/consultations/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status, diagnosis }),
  });
  n();
}

// ——— Earnings ———
export async function getEarnings(): Promise<Earning[]> {
  return apiFetch<Earning[]>("/api/earnings");
}

export async function getEarningsSummary() {
  return apiFetch<{
    totalCompleted: number;
    totalPending: number;
    completedCount: number;
    pendingCount: number;
    all: Earning[];
  }>("/api/earnings/summary");
}

// ——— Patients ———
export async function getRegisteredPatients(): Promise<RegisteredPatient[]> {
  return apiFetch<RegisteredPatient[]>("/api/patients");
}

export async function updatePatientStatus(id: string, status: "Active" | "Suspended") {
  await apiFetch(`/api/patients/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
  n();
}

export async function approvePatient(id: string) {
  await apiFetch(`/api/patients/${id}/approve`, { method: "PATCH" });
  n();
}

// ——— Doctor profile ———
export async function getDoctorProfile(): Promise<DoctorProfile> {
  const raw = await apiFetch<{
    name: string;
    specialization: string;
    license: string;
    experience: string;
    fee: string;
    hospital: string;
    practiceAddress?: string;
    latitude?: number | null;
    longitude?: number | null;
    avatar?: string;
    schedule: DoctorProfile["schedule"];
    notifications: DoctorProfile["notifications"];
  }>("/api/doctor-profile");
  return {
    name: raw.name,
    specialization: raw.specialization,
    license: raw.license,
    experience: raw.experience,
    fee: raw.fee,
    hospital: raw.hospital,
    practiceAddress: raw.practiceAddress ?? "",
    latitude: raw.latitude ?? null,
    longitude: raw.longitude ?? null,
    avatar: raw.avatar ?? "",
    schedule: raw.schedule,
    notifications: raw.notifications,
  };
}

export async function getDoctorDashboardSummary(): Promise<DoctorDashboardSummary> {
  return apiFetch<DoctorDashboardSummary>("/api/doctor/dashboard-summary");
}

export async function saveDoctorProfile(profile: DoctorProfile) {
  await apiFetch("/api/doctor-profile", {
    method: "PUT",
    body: JSON.stringify({
      name: profile.name,
      specialization: profile.specialization,
      license: profile.license,
      experience: profile.experience,
      fee: profile.fee,
      hospital: profile.hospital,
      practiceAddress: profile.practiceAddress,
      latitude: profile.latitude,
      longitude: profile.longitude,
      avatar: profile.avatar,
      schedule: profile.schedule,
      notifications: profile.notifications,
    }),
  });
  n();
}

// ——— Pharmacy ———
export async function getPharmacyMedicines(): Promise<PharmacyMedicine[]> {
  const raw = await apiFetch<
    (PharmacyMedicine & { _mongoId?: string })[]
  >("/api/pharmacy/medicines");
  return raw.map((m) => ({
    ...m,
    _mongoId: (m as PharmacyMedicine & { _mongoId?: string })._mongoId,
    usage: m.usage ?? "",
    sideEffects: m.sideEffects ?? "",
    warnings: m.warnings ?? "",
  }));
}

export async function addPharmacyMedicine(
  m: Omit<PharmacyMedicine, "id" | "sold" | "_mongoId">
) {
  await apiFetch("/api/pharmacy/medicines", {
    method: "POST",
    body: JSON.stringify({
      name: m.name,
      category: m.category,
      price: m.price,
      stock: m.stock,
      requiresPrescription: m.requiresPrescription,
      description: m.description,
      usage: m.usage,
      sideEffects: m.sideEffects,
      warnings: m.warnings,
    }),
  });
  n();
}

export async function updatePharmacyMedicine(
  id: number | string,
  patch: Partial<
    Pick<
      PharmacyMedicine,
      | "name"
      | "category"
      | "price"
      | "stock"
      | "description"
      | "usage"
      | "sideEffects"
      | "warnings"
      | "requiresPrescription"
    >
  >
) {
  await apiFetch(`/api/pharmacy/medicines/${encodeURIComponent(String(id))}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  n();
}

export async function updateMedicineStock(id: number | string, stock: number) {
  await apiFetch(`/api/pharmacy/medicines/${encodeURIComponent(String(id))}/stock`, {
    method: "PATCH",
    body: JSON.stringify({ stock }),
  });
  n();
}

export async function recordMedicineSale(_id: number, _qty: number) {
  n();
}

// ——— Orders ———
export async function getDeliveryOrders(): Promise<DeliveryOrder[]> {
  return apiFetch<DeliveryOrder[]>("/api/orders");
}

export async function addDeliveryOrder(order: Omit<DeliveryOrder, "id" | "date" | "status">) {
  await apiFetch("/api/orders", {
    method: "POST",
    body: JSON.stringify({
      items: order.items,
      total: order.total,
      buyerName: order.buyerName,
      buyerRole: order.buyerRole,
      address: order.address,
    }),
  });
  n();
}

export async function updateDeliveryStatus(id: string, status: DeliveryOrder["status"]) {
  await apiFetch(`/api/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
  n();
}

// ——— Compliance ———
export async function getComplianceIssues(): Promise<ComplianceIssue[]> {
  return apiFetch<ComplianceIssue[]>("/api/compliance");
}

export async function updateComplianceStatus(id: string, status: ComplianceIssue["status"]) {
  await apiFetch(`/api/compliance/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
  n();
}

export async function updateComplianceStatusWithNotes(
  id: string,
  status: ComplianceIssue["status"],
  resolutionNotes: string
) {
  await apiFetch(`/api/compliance/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, resolutionNotes }),
  });
  n();
}

export async function addComplianceIssue(issue: Omit<ComplianceIssue, "id" | "date">) {
  await apiFetch("/api/compliance", { method: "POST", body: JSON.stringify(issue) });
  n();
}

export async function submitMisconductReport(body: {
  reportedUserId: string;
  type: string;
  severity: "High" | "Medium" | "Low";
  desc: string;
}) {
  await apiFetch("/api/reports/misconduct", { method: "POST", body: JSON.stringify(body) });
  n();
}

// ——— Support (FAQ, feedback, ask admin) ———
export type SupportFaq = {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  published?: boolean;
  updatedAt?: string;
};

export type SupportFeedback = {
  id: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  rating?: number;
  category?: string;
  message: string;
  createdAt?: string;
};

export type SupportInquiry = {
  id: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  subject: string;
  body: string;
  status: "Open" | "Answered";
  adminReply?: string;
  repliedAt?: string;
  createdAt?: string;
};

export async function getSupportFaq(): Promise<SupportFaq[]> {
  return apiFetch<SupportFaq[]>("/api/support/faq");
}

export async function submitSupportFeedback(body: { rating?: number; category?: string; message: string }) {
  await apiFetch("/api/support/feedback", { method: "POST", body: JSON.stringify(body) });
  n();
}

export async function getMySupportFeedback(): Promise<SupportFeedback[]> {
  return apiFetch<SupportFeedback[]>("/api/support/feedback/mine");
}

export async function createSupportInquiry(body: { subject: string; body: string }) {
  await apiFetch("/api/support/inquiries", { method: "POST", body: JSON.stringify(body) });
  n();
}

export async function getMySupportInquiries(): Promise<SupportInquiry[]> {
  return apiFetch<SupportInquiry[]>("/api/support/inquiries/mine");
}

export async function adminListSupportInquiries(): Promise<SupportInquiry[]> {
  return apiFetch<SupportInquiry[]>("/api/support/inquiries");
}

export async function adminReplySupportInquiry(id: string, adminReply: string) {
  await apiFetch(`/api/support/inquiries/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ adminReply }),
  });
  n();
}

export async function adminListSupportFeedback(): Promise<SupportFeedback[]> {
  return apiFetch<SupportFeedback[]>("/api/support/feedback");
}

export async function adminCreateSupportFaq(body: {
  question: string;
  answer: string;
  sortOrder?: number;
  published?: boolean;
}) {
  await apiFetch("/api/support/faq", { method: "POST", body: JSON.stringify(body) });
  n();
}

export async function adminUpdateSupportFaq(
  id: string,
  body: Partial<{ question: string; answer: string; sortOrder: number; published: boolean }>
) {
  await apiFetch(`/api/support/faq/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) });
  n();
}

export async function adminDeleteSupportFaq(id: string) {
  await apiFetch(`/api/support/faq/${encodeURIComponent(id)}`, { method: "DELETE" });
  n();
}

export async function sendAssistantMessage(messages: { role: "user" | "assistant"; content: string }[]): Promise<{
  reply: string;
  source?: string;
}> {
  return apiFetch("/api/assistant/chat", {
    method: "POST",
    body: JSON.stringify({ messages }),
  });
}

// ——— Admin ———
export async function getAdminSettings(): Promise<AdminSettings> {
  return apiFetch<AdminSettings>("/api/admin/settings");
}

export async function saveAdminSettings(settings: AdminSettings) {
  await apiFetch("/api/admin/settings", { method: "PUT", body: JSON.stringify(settings) });
  n();
}

export async function getAdminStats(): Promise<AdminStats> {
  return apiFetch<AdminStats>("/api/admin/stats");
}

// ——— Notifications ———
export async function getNotifications(): Promise<Notification[]> {
  return apiFetch<Notification[]>("/api/notifications");
}

export async function markNotificationRead(id: string) {
  await apiFetch(`/api/notifications/${id}/read`, { method: "PATCH" });
  n();
}

export async function markAllNotificationsRead() {
  await apiFetch("/api/notifications/read-all", { method: "POST" });
  n();
}

// ——— Razorpay (INR) ———
export async function getPaymentConfig() {
  return apiFetch<{
    razorpayEnabled: boolean;
    keyId: string | null;
    currency: string;
    allowUnpaidPharmacyOrders: boolean;
    allowUnpaidAppointments: boolean;
  }>("/api/payments/config");
}

export async function createConsultationRazorpayOrder(body: {
  doctorId: string;
  type: "Video" | "In-Person" | "Chat";
  date: string;
  time: string;
}) {
  return apiFetch<{
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
    feeInr: number;
    doctorName: string;
  }>("/api/payments/razorpay/create-consultation-order", { method: "POST", body: JSON.stringify(body) });
}

export async function verifyConsultationBooking(body: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  patientName?: string;
}) {
  const a = await apiFetch<Appointment>("/api/payments/razorpay/verify-consultation-booking", {
    method: "POST",
    body: JSON.stringify(body),
  });
  n();
  return a;
}

export async function createRazorpayCartOrder(body: {
  items: { name: string; qty: number }[];
  address: string;
  buyerName?: string;
  buyerRole?: "patient" | "doctor";
}) {
  return apiFetch<{
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
    resolvedItems: { name: string; qty: number; price: number }[];
    totalInr: number;
  }>("/api/payments/razorpay/create-order", { method: "POST", body: JSON.stringify(body) });
}

export async function verifyRazorpayAndCreateOrder(body: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  items: { name: string; qty: number }[];
  address: string;
  buyerName?: string;
  buyerRole?: "patient" | "doctor";
}) {
  const o = await apiFetch<DeliveryOrder>("/api/payments/razorpay/verify-and-order", {
    method: "POST",
    body: JSON.stringify(body),
  });
  n();
  return o;
}

// ——— DNA profile (summary for dashboard) ———
export async function getDnaProfileSummary(): Promise<{ hasProfile: boolean }> {
  try {
    const data = await apiFetch<{ hasProfile?: boolean }>("/api/dna/profile");
    return { hasProfile: !!data?.hasProfile };
  } catch {
    return { hasProfile: false };
  }
}

// ——— Virtual Health Twin ———
export async function getHealthTwin(userId: string) {
  return apiFetch<any>(`/api/twin/${userId}`);
}

export async function simulateHealthTwin(userId: string, payload: { targetWeight: number; targetAdherence: number; targetSleep: number; targetStress: number; targetSteps: number }) {
  return apiFetch<{ projectedHealthScore: number; insights: string[]; originalScore: number; biologicalAge?: number; organScores?: { heartHealth: number; metabolicHealth: number; mentalCognition: number } }>(`/api/twin/${userId}/simulate`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

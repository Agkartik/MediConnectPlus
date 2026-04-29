export function id(doc) {
  return doc?._id?.toString?.() ?? doc;
}

function distanceLabel({ viewerRole, patientHasCoords, doctorHasCoords, distanceKm }) {
  if (distanceKm != null && Number.isFinite(distanceKm)) return `${distanceKm.toFixed(1)} km`;
  if (viewerRole === "patient") {
    if (!doctorHasCoords) return "Clinic not on map";
    if (!patientHasCoords) return "Set your location";
  }
  return "—";
}

export function doctorListing(user, opts = {}) {
  const {
    reviewAvg = null,
    reviewCount = 0,
    distanceKm = null,
    viewerRole = "patient",
    patientHasCoords = false,
  } = opts;
  const doctorHasCoords =
    typeof user.latitude === "number" &&
    typeof user.longitude === "number" &&
    !Number.isNaN(user.latitude) &&
    !Number.isNaN(user.longitude);
  const rating = reviewCount > 0 && reviewAvg != null ? Math.round(reviewAvg * 10) / 10 : null;
  return {
    id: user._id.toString(),
    email: user.email || "",
    phone: user.phone || "",
    name: user.name,
    specialty: user.specialty || "General Physician",
    rating,
    reviews: reviewCount,
    distance: distanceLabel({ viewerRole, patientHasCoords, doctorHasCoords, distanceKm }),
    distanceKm: distanceKm != null && Number.isFinite(distanceKm) ? distanceKm : null,
    hasClinicLocation: doctorHasCoords,
    latitude: doctorHasCoords ? user.latitude : null,
    longitude: doctorHasCoords ? user.longitude : null,
    practiceAddress: user.practiceAddress || user.hospital || "",
    available: user.available || "Today",
    avatar: user.avatar || "",
    fee: user.fee || "$100",
    modes: user.modes?.length ? user.modes : ["video", "chat"],
    approved: user.approved !== false,
    status: user.doctorStatus || "Active",
    qualification: user.qualification || "",
    yearsOfExperience: user.yearsOfExperience ?? null,
    verificationStatus: user.verificationStatus ?? null,
    medicalLicense: user.medicalLicense
      ? {
          number: user.medicalLicense.number || "",
          issuingAuthority: user.medicalLicense.issuingAuthority || "",
          expiryDate: user.medicalLicense.expiryDate || null,
          document: user.medicalLicense.document || "",
        }
      : null,
    hospital: user.hospital || "",
  };
}

export function appointmentDoc(a) {
  return {
    id: a._id.toString(),
    doctorId: a.doctorId?.toString?.() ?? null,
    doctor: a.doctor,
    specialty: a.specialty,
    time: a.time,
    date: a.date,
    type: a.type,
    status: a.status,
    avatar: a.avatar,
    patientName: a.patientName,
    paymentStatus: a.paymentStatus,
    consultationFeeInr: a.consultationFeeInr,
  };
}

export function prescriptionDoc(p) {
  return {
    id: p._id.toString(),
    medicine: p.medicine,
    dosage: p.dosage,
    doctor: p.doctor,
    patientName: p.patientName,
    date: p.date,
    endDate: p.endDate,
    status: p.status,
    notes: p.notes,
    addedBy: p.addedBy,
  };
}

export function conversationDoc(c) {
  return {
    id: c._id.toString(),
    doctorName: c.doctorName,
    patientName: c.patientName,
    doctorAvatar: c.doctorAvatar,
    patientAvatar: c.patientAvatar,
    doctorSpecialty: c.doctorSpecialty,
    patientCondition: c.patientCondition,
    lastMsg: c.lastMsg,
    lastTime: c.lastTime,
    unreadDoctor: c.unreadDoctor,
    unreadPatient: c.unreadPatient,
  };
}

export function messageDoc(m) {
  return {
    id: m._id.toString(),
    sender: m.sender,
    text: m.text,
    time: m.time,
    conversationId: m.conversationId?.toString?.() ?? m.conversationId,
  };
}

export function consultationDoc(c) {
  return {
    id: c._id.toString(),
    appointmentId: c.appointmentId?.toString?.() ?? null,
    patient: c.patient,
    doctor: c.doctor,
    type: c.type,
    status: c.status,
    duration: c.duration,
    notes: c.notes,
    avatar: c.avatar,
    date: c.date,
    diagnosis: c.diagnosis,
    startedAt: c.startedAt,
  };
}

export function earningDoc(e) {
  return {
    id: e._id.toString(),
    patient: e.patient,
    type: e.type,
    amount: e.amount,
    date: e.date,
    status: e.status,
  };
}

export function registeredPatient(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    age: user.age ?? 30,
    condition: user.condition || "General Checkup",
    lastVisit: user.lastVisit || "—",
    nextVisit: user.nextVisit || "TBD",
    status: user.healthStatus || "Stable",
    avatar: user.avatar || "",
    dob: user.dob,
    phone: user.phone,
    gender: user.gender,
    bloodGroup: user.bloodGroup,
    latitude: user.latitude ?? null,
    longitude: user.longitude ?? null,
    userStatus: user.userStatus || "Active",
    approved: user.approved === true,
  };
}

export function medicineDoc(m) {
  const legacy = m.legacyId ?? parseInt(m._id.toString().slice(-8), 16) % 1000000;
  return {
    id: m.legacyId ?? legacy,
    _mongoId: m._id.toString(),
    name: m.name,
    category: m.category,
    price: m.price,
    stock: m.stock,
    sold: m.sold,
    requiresPrescription: m.requiresPrescription,
    description: m.description ?? "",
    usage: m.usage ?? "",
    sideEffects: m.sideEffects ?? "",
    warnings: m.warnings ?? "",
  };
}

export function orderDoc(o) {
  return {
    id: o._id.toString(),
    items: o.items,
    total: o.total,
    buyerName: o.buyerName,
    buyerRole: o.buyerRole,
    address: o.address,
    status: o.status,
    date: o.date,
    paymentStatus: o.paymentStatus,
    razorpayPaymentId: o.razorpayPaymentId,
  };
}

export function complianceDoc(i) {
  return {
    id: i._id.toString(),
    type: i.type,
    entity: i.entity,
    severity: i.severity,
    date: i.date,
    status: i.status,
    desc: i.desc,
    category: i.category || "compliance",
    reporterId: i.reporterId?.toString?.() ?? null,
    reporterName: i.reporterName || "",
    reporterRole: i.reporterRole || null,
    reportedUserId: i.reportedUserId?.toString?.() ?? null,
    reportedUserName: i.reportedUserName || "",
    reportedUserRole: i.reportedUserRole || null,
    resolutionNotes: i.resolutionNotes || "",
  };
}

export function notificationDoc(n) {
  return {
    id: n._id.toString(),
    title: n.title,
    message: n.message,
    time: n.time,
    read: n.read,
    type: n.type,
  };
}

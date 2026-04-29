import { Router } from "express";
import crypto from "crypto";
import Razorpay from "razorpay";
import { authRequired, requireApproved, requireRole } from "../middleware/auth.js";
import { DeliveryOrder } from "../models/DeliveryOrder.js";
import { PharmacyMedicine } from "../models/PharmacyMedicine.js";
import { Notification } from "../models/Notification.js";
import { User } from "../models/User.js";
import { Appointment } from "../models/Appointment.js";
import { Consultation } from "../models/Consultation.js";
import { Earning } from "../models/Earning.js";
import { orderDoc, appointmentDoc } from "../utils/serializers.js";

const router = Router();

function getRazorpay() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) return null;
  return new Razorpay({ key_id, key_secret });
}

/** Matches app.routes appointment earning logic (INR uses doctor fee field as rupees). */
function consultationFeeInrFromDoctor(doctorUser, type) {
  const feeNum = parseFloat(String(doctorUser?.fee || "$100").replace(/[^0-9.]/g, "")) || 100;
  const mult = type === "Video" ? 1 : type === "In-Person" ? 1.2 : 0.7;
  return Math.round(feeNum * mult * 100) / 100;
}

/** Public: exposes key id for Checkout (safe). */
router.get("/payments/config", (req, res) => {
  res.json({
    razorpayEnabled: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
    keyId: process.env.RAZORPAY_KEY_ID || null,
    currency: process.env.RAZORPAY_CURRENCY || "INR",
    allowUnpaidPharmacyOrders: process.env.ALLOW_UNPAID_PHARMACY_ORDERS === "true",
    allowUnpaidAppointments: process.env.ALLOW_UNPAID_APPOINTMENTS === "true",
  });
});

/**
 * Create a Razorpay order. Amount is validated server-side from cart items (INR, paise).
 * Body: { items: { name: string, qty: number }[], address, buyerName?, buyerRole? }
 */
router.post("/payments/razorpay/create-order", authRequired, requireApproved, async (req, res) => {
  try {
    const rz = getRazorpay();
    if (!rz) return res.status(503).json({ error: "Razorpay is not configured on the server" });

    const { items, address, buyerName, buyerRole } = req.body;
    if (!Array.isArray(items) || !items.length || !address) {
      return res.status(400).json({ error: "items and address are required" });
    }

    const meds = await PharmacyMedicine.find();
    let totalInr = 0;
    const resolved = [];
    for (const line of items) {
      const med = meds.find((m) => m.name === line.name);
      if (!med) return res.status(400).json({ error: `Unknown medicine: ${line.name}` });
      const qty = Number(line.qty);
      if (!qty || qty < 1) return res.status(400).json({ error: "Invalid quantity" });
      if (med.stock < qty) return res.status(400).json({ error: `Insufficient stock for ${line.name}` });
      totalInr += med.price * qty;
      resolved.push({ name: med.name, qty, price: med.price });
    }

    const amountPaise = Math.round(totalInr * 100);
    if (amountPaise < 100) return res.status(400).json({ error: "Minimum order amount is ₹1" });

    const receipt = `mc_${req.user.id.slice(-8)}_${Date.now()}`;
    const order = await rz.orders.create({
      amount: amountPaise,
      currency: process.env.RAZORPAY_CURRENCY || "INR",
      receipt,
      notes: {
        userId: req.user.id,
        itemCount: String(items.length),
      },
    });

    // Store pending payload to attach after verify (notes field size limit — use minimal ref)
    // We pass resolved cart back to client only after verify uses same items; for stronger security
    // store PendingOrder in DB — keep MVP: client sends same items on verify and server recomputes.
    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      resolvedItems: resolved,
      totalInr,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Failed to create payment order" });
  }
});

/**
 * Verify Razorpay payment signature and create delivery order + decrement stock.
 */
router.post("/payments/razorpay/verify-and-order", authRequired, requireApproved, async (req, res) => {
  try {
    const rz = getRazorpay();
    if (!rz) return res.status(503).json({ error: "Razorpay is not configured" });

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      items,
      address,
      buyerName,
      buyerRole,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !address) {
      return res.status(400).json({ error: "Missing payment or address fields" });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    const sig = crypto.createHmac("sha256", secret).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");
    if (sig !== razorpay_signature) {
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    const payment = await rz.payments.fetch(razorpay_payment_id);
    if (payment.order_id !== razorpay_order_id) {
      return res.status(400).json({ error: "Payment does not match order" });
    }
    if (!["captured", "authorized"].includes(payment.status)) {
      return res.status(400).json({ error: "Payment not successful" });
    }

    const existing = await DeliveryOrder.findOne({ razorpayPaymentId: razorpay_payment_id });
    if (existing) return res.status(200).json(orderDoc(existing));

    const meds = await PharmacyMedicine.find();
    let totalInr = 0;
    const lineItems = [];
    for (const line of items || []) {
      const med = meds.find((m) => m.name === line.name);
      if (!med) return res.status(400).json({ error: `Unknown medicine: ${line.name}` });
      const qty = Number(line.qty);
      totalInr += med.price * qty;
      lineItems.push({ name: med.name, qty, price: med.price });
    }
    const expectedPaise = Math.round(totalInr * 100);
    if (Number(payment.amount) !== expectedPaise) {
      return res.status(400).json({ error: "Amount mismatch" });
    }

    const role = buyerRole || (req.user.role === "doctor" ? "doctor" : "patient");
    const user = await User.findById(req.user.id);

    const order = await DeliveryOrder.create({
      buyerId: req.user.id,
      items: lineItems,
      total: totalInr,
      buyerName: buyerName || user?.name || "Customer",
      buyerRole: role,
      address,
      status: "Processing",
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      paymentStatus: "paid",
    });

    for (const line of lineItems) {
      const med = meds.find((m) => m.name === line.name);
      if (med) {
        med.stock = Math.max(0, med.stock - line.qty);
        med.sold = (med.sold || 0) + line.qty;
        await med.save();
      }
    }

    await Notification.create({
      userId: req.user.id,
      title: "Order placed",
      message: `Paid order ${order._id} confirmed`,
      time: "Just now",
      read: false,
      type: "pharmacy",
    });

    res.status(201).json(orderDoc(order));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Verification failed" });
  }
});

/** Patient pays doctor consultation fee before appointment is confirmed (INR). */
router.post("/payments/razorpay/create-consultation-order", authRequired, requireApproved, requireRole("patient"), async (req, res) => {
  try {
    const rz = getRazorpay();
    if (!rz) return res.status(503).json({ error: "Razorpay is not configured on the server" });

    const { doctorId, type, date, time } = req.body;
    if (!doctorId || !type || !date || !time) {
      return res.status(400).json({ error: "doctorId, type, date, and time are required" });
    }
    if (!["Video", "In-Person", "Chat"].includes(type)) {
      return res.status(400).json({ error: "Invalid consultation type" });
    }
    const du = await User.findById(doctorId);
    if (!du || du.role !== "doctor" || du.approved === false) {
      return res.status(400).json({ error: "Invalid or unapproved doctor" });
    }

    const amountInr = consultationFeeInrFromDoctor(du, type);
    const amountPaise = Math.round(amountInr * 100);
    if (amountPaise < 100) {
      return res.status(400).json({ error: "Consultation fee below minimum charge" });
    }

    const receipt = `cc_${req.user.id.slice(-8)}_${Date.now()}`;
    const order = await rz.orders.create({
      amount: amountPaise,
      currency: process.env.RAZORPAY_CURRENCY || "INR",
      receipt,
      notes: {
        purpose: "consultation",
        doctorId: String(du._id),
        ctype: type,
        adate: String(date),
        atime: String(time),
        pid: String(req.user.id),
      },
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      feeInr: amountInr,
      doctorName: du.name,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Failed to create consultation order" });
  }
});

router.post("/payments/razorpay/verify-consultation-booking", authRequired, requireApproved, requireRole("patient"), async (req, res) => {
  try {
    const rz = getRazorpay();
    if (!rz) return res.status(503).json({ error: "Razorpay is not configured" });

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, patientName } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: "Missing payment fields" });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    const sig = crypto.createHmac("sha256", secret).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");
    if (sig !== razorpay_signature) {
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    const payment = await rz.payments.fetch(razorpay_payment_id);
    if (payment.order_id !== razorpay_order_id) {
      return res.status(400).json({ error: "Payment does not match order" });
    }
    if (!["captured", "authorized"].includes(payment.status)) {
      return res.status(400).json({ error: "Payment not successful" });
    }

    const existing = await Appointment.findOne({ razorpayPaymentId: razorpay_payment_id });
    if (existing) return res.status(201).json(appointmentDoc(existing));

    const rzOrder = await rz.orders.fetch(razorpay_order_id);
    const notes = rzOrder.notes || {};
    if (notes.purpose !== "consultation" || String(notes.pid) !== String(req.user.id)) {
      return res.status(400).json({ error: "Order is not for this consultation" });
    }

    const du = await User.findById(notes.doctorId);
    if (!du) return res.status(400).json({ error: "Doctor not found" });

    const type = notes.ctype;
    const expectedPaise = Math.round(consultationFeeInrFromDoctor(du, type) * 100);
    if (Number(rzOrder.amount) !== expectedPaise || Number(payment.amount) !== expectedPaise) {
      return res.status(400).json({ error: "Amount mismatch" });
    }

    const patient = await User.findById(req.user.id);
    const pname = patientName || patient?.name || "Patient";

    const apt = await Appointment.create({
      patientId: req.user.id,
      doctorId: du._id,
      doctor: du.name,
      specialty: du.specialty || "General",
      time: notes.atime,
      date: notes.adate,
      type,
      status: "confirmed",
      avatar: du.avatar || "",
      patientName: pname,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      paymentStatus: "paid",
      consultationFeeInr: expectedPaise / 100,
    });

    if (type === "Video") {
      await Consultation.findOneAndUpdate(
        { appointmentId: apt._id },
        {
          $set: {
            appointmentId: apt._id,
            patientId: apt.patientId,
            doctorId: apt.doctorId,
            patient: apt.patientName || "Patient",
            doctor: apt.doctor || "Doctor",
            type: "Video Call",
            status: "Waiting",
            notes: `Appointment on ${apt.date} at ${apt.time}`,
            avatar:
              apt.avatar ||
              (apt.patientName || "P")
                .split(" ")
                .map((x) => x[0])
                .join("")
                .slice(0, 2)
                .toUpperCase(),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    await Earning.create({
      doctorId: du._id,
      patient: pname,
      type: `${type} Consultation`,
      amount: expectedPaise / 100,
      date: String(notes.adate),
      status: "Completed",
    });

    await Notification.create({
      userId: du._id,
      title: "Consultation booked & paid",
      message: `${pname} paid for a ${type} consultation on ${notes.adate}`,
      time: "Just now",
      read: false,
      type: "appointment",
    });

    await Notification.create({
      userId: req.user.id,
      title: "Appointment confirmed",
      message: `Paid consultation with ${du.name} on ${notes.adate} at ${notes.atime}`,
      time: "Just now",
      read: false,
      type: "appointment",
    });

    res.status(201).json(appointmentDoc(apt));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Verification failed" });
  }
});

export default router;

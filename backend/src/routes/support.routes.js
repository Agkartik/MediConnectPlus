import { Router } from "express";
import { FaqEntry } from "../models/FaqEntry.js";
import { PlatformFeedback } from "../models/PlatformFeedback.js";
import { AdminInquiry } from "../models/AdminInquiry.js";
import { User } from "../models/User.js";
import { authRequired, requireApproved, requireRole } from "../middleware/auth.js";

const router = Router();

function faqDoc(f) {
  return {
    id: f._id.toString(),
    question: f.question,
    answer: f.answer,
    sortOrder: f.sortOrder,
    published: f.published,
    updatedAt: f.updatedAt,
  };
}

function feedbackDoc(x) {
  return {
    id: x._id.toString(),
    userId: x.userId?.toString?.(),
    userName: x.userName,
    userRole: x.userRole,
    rating: x.rating,
    category: x.category,
    message: x.message,
    createdAt: x.createdAt,
  };
}

function inquiryDoc(q) {
  return {
    id: q._id.toString(),
    userId: q.userId?.toString?.(),
    userName: q.userName,
    userRole: q.userRole,
    subject: q.subject,
    body: q.body,
    status: q.status,
    adminReply: q.adminReply || "",
    repliedAt: q.repliedAt,
    createdAt: q.createdAt,
  };
}

async function ensureDefaultFaqs() {
  const n = await FaqEntry.countDocuments();
  if (n > 0) return;
  await FaqEntry.insertMany([
    {
      question: "How do I join a video appointment?",
      answer:
        "Open Appointments from your dashboard at the scheduled date and time. Video visits are available on the appointment day (or in the time window around your slot). Both patient and doctor must use the same booking. Use a modern browser and allow camera/microphone.",
      sortOrder: 0,
      published: true,
    },
    {
      question: "Where do I report misconduct or safety concerns?",
      answer:
        "Use the Support page → Report tab (sidebar: Support). That creates a compliance record for administrators. You can also submit feedback and questions to admins from the same Support area.",
      sortOrder: 1,
      published: true,
    },
    {
      question: "Are DNA insights from uploaded files medically accurate?",
      answer:
        "Uploaded PDFs and generic files are analyzed with automated text heuristics for demo and education only—not a clinical diagnosis. For medically actionable genetics, use certified laboratory reports and consult your doctor. Structured raw data (e.g. provider JSON/CSV) is closer to real analysis but still not a substitute for professional care.",
      sortOrder: 2,
      published: true,
    },
  ]);
}

// ——— FAQ (patients & doctors) ———
router.get("/support/faq", authRequired, requireApproved, async (req, res) => {
  try {
    await ensureDefaultFaqs();
    const onlyPublished = req.user.role !== "admin";
    const q = onlyPublished ? { published: true } : {};
    const list = await FaqEntry.find(q).sort({ sortOrder: 1, createdAt: 1 });
    res.json(list.map(faqDoc));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load FAQ" });
  }
});

router.post("/support/faq", authRequired, requireApproved, requireRole("admin"), async (req, res) => {
  try {
    const { question, answer, sortOrder, published } = req.body;
    if (!question || !answer) return res.status(400).json({ error: "question and answer required" });
    const f = await FaqEntry.create({
      question: String(question).slice(0, 500),
      answer: String(answer).slice(0, 20000),
      sortOrder: Number(sortOrder) || 0,
      published: published !== false,
    });
    res.status(201).json(faqDoc(f));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create FAQ" });
  }
});

router.patch("/support/faq/:id", authRequired, requireApproved, requireRole("admin"), async (req, res) => {
  try {
    const f = await FaqEntry.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          ...(req.body.question != null ? { question: String(req.body.question).slice(0, 500) } : {}),
          ...(req.body.answer != null ? { answer: String(req.body.answer).slice(0, 20000) } : {}),
          ...(req.body.sortOrder != null ? { sortOrder: Number(req.body.sortOrder) } : {}),
          ...(req.body.published != null ? { published: !!req.body.published } : {}),
        },
      },
      { new: true }
    );
    if (!f) return res.status(404).json({ error: "Not found" });
    res.json(faqDoc(f));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update FAQ" });
  }
});

router.delete("/support/faq/:id", authRequired, requireApproved, requireRole("admin"), async (req, res) => {
  try {
    await FaqEntry.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to delete" });
  }
});

// ——— Feedback ———
router.post("/support/feedback", authRequired, requireApproved, requireRole("patient", "doctor"), async (req, res) => {
  try {
    const { rating, category, message } = req.body;
    if (!message || !String(message).trim()) return res.status(400).json({ error: "message required" });
    const me = await User.findById(req.user.id).select("name role");
    if (!me) return res.status(404).json({ error: "User not found" });
    let r = undefined;
    if (rating != null && rating !== "") {
      const n = Number(rating);
      if (n >= 1 && n <= 5) r = n;
    }
    const doc = await PlatformFeedback.create({
      userId: req.user.id,
      userName: me.name,
      userRole: me.role,
      rating: r,
      category: String(category || "general").slice(0, 100),
      message: String(message).trim().slice(0, 8000),
    });
    res.status(201).json(feedbackDoc(doc));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to submit feedback" });
  }
});

router.get("/support/feedback", authRequired, requireApproved, requireRole("admin"), async (req, res) => {
  try {
    const list = await PlatformFeedback.find().sort({ createdAt: -1 }).limit(500);
    res.json(list.map(feedbackDoc));
  } catch (e) {
    res.status(500).json({ error: "Failed to list feedback" });
  }
});

router.get("/support/feedback/mine", authRequired, requireApproved, requireRole("patient", "doctor"), async (req, res) => {
  try {
    const list = await PlatformFeedback.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(100);
    res.json(list.map(feedbackDoc));
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

// ——— Ask admin ———
router.post("/support/inquiries", authRequired, requireApproved, requireRole("patient", "doctor"), async (req, res) => {
  try {
    const { subject, body } = req.body;
    if (!subject || !body) return res.status(400).json({ error: "subject and body required" });
    const me = await User.findById(req.user.id).select("name role");
    if (!me) return res.status(404).json({ error: "User not found" });
    const doc = await AdminInquiry.create({
      userId: req.user.id,
      userName: me.name,
      userRole: me.role,
      subject: String(subject).trim().slice(0, 200),
      body: String(body).trim().slice(0, 8000),
    });
    res.status(201).json(inquiryDoc(doc));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to submit question" });
  }
});

router.get("/support/inquiries/mine", authRequired, requireApproved, requireRole("patient", "doctor"), async (req, res) => {
  try {
    const list = await AdminInquiry.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(100);
    res.json(list.map(inquiryDoc));
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

router.get("/support/inquiries", authRequired, requireApproved, requireRole("admin"), async (req, res) => {
  try {
    const list = await AdminInquiry.find().sort({ createdAt: -1 }).limit(500);
    res.json(list.map(inquiryDoc));
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

router.patch("/support/inquiries/:id", authRequired, requireApproved, requireRole("admin"), async (req, res) => {
  try {
    const { adminReply, status } = req.body;
    const q = await AdminInquiry.findById(req.params.id);
    if (!q) return res.status(404).json({ error: "Not found" });
    if (adminReply != null) q.adminReply = String(adminReply).slice(0, 8000);
    if (status === "Open" || status === "Answered") q.status = status;
    if (q.adminReply && q.adminReply.trim()) {
      q.status = "Answered";
      q.repliedAt = new Date();
      q.repliedBy = req.user.id;
    }
    await q.save();
    res.json(inquiryDoc(q));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update" });
  }
});

export default router;

import { Router } from "express";
import { authRequired } from "../middleware/auth.js";

const router = Router();

const SYSTEM_PROMPT = `You are "MediConnect Assistant", the in-app helper for MediConnect+, a telehealth-style platform with:
- Patient: Find Doctors, Appointments (including video), Consultations, Health Data, DNA Profile (educational analysis), Virtual Twin, Pharmacy, Prescriptions, Messages, Support (FAQ, feedback, report misconduct, ask admin).
- Doctor: Patients, Appointments, Consultations, Prescriptions, Earnings, Messages, Pharmacy, Support.
- Admin: Users, Doctors, Revenue, Pharmacy, Compliance, Support desk, Analytics.

Rules:
1. Be concise and friendly. Short bullets are OK; avoid long essays.
2. MEDICINE — SPECIFIC DRUG QUESTIONS ("What is X used for?", "details", side effects, brand names like Dolo/Crocin):
   - Always structure answers when possible with clear sections: **What it is** (drug class), **What it’s used for** (conditions/symptoms—fever, pain types, infections, etc.), **Common side effects**, **Important cautions** (liver/kidney, pregnancy, interactions, overdose).
   - Give factual, educational information only—not a personal prescription or dose for this user.
   - End with: read the package insert and ask a **doctor or pharmacist** for personal advice.
3. MEDICINE — "WHAT SHOULD I TAKE?" (e.g. cold, cough, fever, headache):
   - You MAY name common OTC categories and widely known example product lines (e.g. acetaminophen/paracetamol; ibuprofen; combination cold/flu products sold under various brand names in different countries such as DayQuil/NyQuil-style or Tylenol Cold-style products — wording varies by region).
   - Always add: check labels for age/dosing, avoid duplicate ingredients, and **ask a doctor or pharmacist** before choosing, especially for children, pregnancy, chronic disease, or other medications.
   - Never present one option as the only correct treatment.
4. Emergencies: chest pain, trouble breathing, stroke signs, severe allergic reaction → direct to emergency services immediately.
5. APP features: explain at a high level; if unsure, say "check Support in the sidebar."
6. Do not claim regulatory approval for DNA or device features.`;

/** User seems to want medicine facts (details, side effects, brand name, etc.) */
function wantsMedicineFacts(q) {
  return (
    /detail|detaill|side effect|what is|what are|used for|what for|tell me about|information about|describe|explain/i.test(q) ||
    /dolo|crocin|calpol|paracetamol|acetaminophen|ibuprofen|aspirin|metformin|amoxicillin|omeprazole|azithromycin|cetirizine|ranitidine|pantoprazole|saridon|combiflam|avil|cetrizine|antibiotic|insulin|inhaler/i.test(q)
  );
}

/**
 * Built-in educational blurbs for very common drugs/brands (no API key).
 * Order: more specific brand matches first.
 */
function medicineKnowledgeFallback(q) {
  if (!wantsMedicineFacts(q)) return null;

  const blocks = [
    {
      match: (s) => /dolo|crocin|calpol|panadol|tylenol|650\b|paracetamol|acetaminophen/i.test(s),
      reply: `**Paracetamol (acetaminophen)** — e.g. **Dolo 650**, Crocin, Calpol (brands vary by country)

**What it is:** An analgesic (pain reliever) and antipyretic (fever reducer). Not an antibiotic.

**What it’s used for (common):** Mild to moderate pain (headache, toothache, muscle ache, period pain); fever from colds/flu or other causes.

**Common side effects:** Usually well tolerated. Occasionally nausea, stomach upset, allergic reactions (rash—rare). **Liver injury** mainly with **overdose** or unsafe use with alcohol/liver disease.

**Important cautions:** Max daily dose on label—do not exceed. Avoid or use only with medical advice if you have **severe liver disease**, heavy alcohol use, or take other medicines containing paracetamol (duplicate ingredients). Pregnancy/breastfeeding: usually considered relatively safe at normal doses but **ask your doctor**.

**This is general education, not your personal prescription.** Read the leaflet and ask your **doctor or pharmacist**.`,
    },
    {
      match: (s) => /ibuprofen|brufen|advil|motrin/i.test(s),
      reply: `**Ibuprofen** (NSAID — non-steroidal anti-inflammatory drug)

**What it’s used for:** Pain and inflammation (headache, dental pain, cramps, sprains); fever.

**Common side effects:** Stomach upset, heartburn, nausea; rarely kidney effects or stomach bleeding with long/high use.

**Cautions:** Avoid or seek advice if you have **stomach ulcers**, kidney disease, some heart conditions, late pregnancy. Can interact with blood thinners and other drugs.

**Not personal medical advice** — follow your prescriber/label and ask a **doctor or pharmacist**.`,
    },
    {
      match: (s) => /aspirin|disprin|ecosprin/i.test(s),
      reply: `**Aspirin (acetylsalicylic acid)**

**What it’s used for:** Pain, fever, inflammation; in some adults **low-dose** for blood clot prevention only when prescribed by a doctor.

**Common side effects:** Stomach irritation/bleeding risk; allergy (including asthma in some); bleeding risk.

**Cautions:** **Children/teens** with viral illness: avoid (Reye’s syndrome risk). Bleeding disorders, ulcers, some surgeries. Many drug interactions.

**Educational only** — ask your **doctor or pharmacist** for your situation.`,
    },
    {
      match: (s) => /metformin/i.test(s),
      reply: `**Metformin**

**What it’s used for:** Type 2 diabetes (blood sugar control); sometimes other uses only under specialist care.

**Common side effects:** Nausea, diarrhea, stomach upset (often improve with time); rarely lactic acidosis (very rare but serious).

**Cautions:** Kidney function matters; contrast dye procedures; alcohol. **Never start/stop without your doctor.**

**Educational only.**`,
    },
    {
      match: (s) => /amoxicillin|penicillin|azithromycin|antibiotic/i.test(s),
      reply: `**Antibiotics (general)**

**What they’re used for:** **Bacterial** infections (some ear/sinus/throat, urine, skin, etc.). They do **not** treat viral colds/flu.

**Common side effects:** Diarrhea, nausea, rash; **allergy** (can be serious—seek urgent care if swelling/breathing trouble).

**Cautions:** Finish course if prescribed; misuse drives resistance. Only take when a clinician indicates they’re appropriate.

**Educational only** — which antibiotic and dose must come from your **doctor**.`,
    },
    {
      match: (s) => /omeprazole|pantoprazole|ranitidine|antacid|ppi\b/i.test(s),
      reply: `**Omeprazole / PPIs (stomach acid reducers)**

**What they’re used for:** Acid reflux (GERD), stomach ulcers, sometimes with other meds to protect the stomach.

**Common side effects:** Headache, diarrhea/constipation, stomach pain; long-term use has other considerations your doctor monitors.

**Cautions:** Can interact with some drugs; not for every stomach ache without evaluation.

**Educational only** — ask your **doctor or pharmacist**.`,
    },
    {
      match: (s) => /cetirizine|levocetirizine|avil|cetrizine|antihistamine/i.test(s),
      reply: `**Antihistamines (e.g. cetirizine-type)**

**What they’re used for:** Allergies (hay fever, hives), sometimes itch; some products for colds (read label).

**Common side effects:** Sleepiness (less with newer “non-drowsy” types in many people), dry mouth, headache.

**Cautions:** Driving if drowsy; interactions with alcohol/other sedatives.

**Educational only** — read label and ask **pharmacist** if unsure.`,
    },
    {
      match: (s) => /saridon|combiflam/i.test(s),
      reply: `**Combination pain tablets (brand examples: Saridon, Combiflam — ingredients vary by product)**

**What they are:** Often combine **paracetamol** with **other** ingredients (e.g. caffeine, or ibuprofen in some “Combiflam”-style products—check your exact pack).

**What they’re used for:** Headache, body pain, fever—per label.

**Side effects / cautions:** Depends on ingredients—same themes as paracetamol and/or NSAIDs. **Do not double up** with separate paracetamol/ibuprofen tablets.

**Always read the box** and ask a **pharmacist**.`,
    },
  ];

  for (const b of blocks) {
    if (b.match(q)) return b.reply;
  }

  if (/(medicine|medication|drug|tablet|pill)/i.test(q) && /detail|what is|tell|about|side/i.test(q)) {
    return `I can describe **common medicines in general terms**: what they’re **for** (symptoms/conditions), **typical side effects**, and **cautions**.

Name a **specific medicine** (brand or generic), for example:
- **Paracetamol** / **Dolo** / **Crocin** — fever & pain
- **Ibuprofen** — pain & inflammation  
- **Metformin** — diabetes  
- **Amoxicillin** — bacterial infections (prescription)

**I don’t replace your doctor.** For dosing and what’s safe *for you*, ask your **doctor or pharmacist**.`;
  }

  return null;
}

function fallbackReply(userMessage) {
  const q = String(userMessage || "").toLowerCase();

  // Urgent triage
  if (q.includes("emergency") || q.includes("chest pain") || q.includes("suicide") || q.includes("can't breathe") || q.includes("sine me dard") || q.includes("saans lene me") || q.includes("behoshi")) {
    return "🚨 **URGENT CARE NEEDED:** Symptoms like chest pain or severe breathing difficulty can be serious. Please call your local emergency number (e.g., 112 / 911) or go to the nearest ER immediately.";
  }

  // Symptom Triage (Hinglish & English)
  if (q.includes("pet drd") || q.includes("pet dard") || q.includes("stomach ache") || q.includes("loose motion") || q.includes("vomit")) {
    return "🩺 **Self-care / Monitor:** Stomach issues are often due to indigestion or food. Stay hydrated with ORS, eat light/bland foods, and rest. If pain is severe or lasts over 24 hours, **Book a Doctor**.";
  }

  if (q.includes("sir drd") || q.includes("sir dard") || q.includes("headache") || q.includes("migraine")) {
    return "🩺 **Self-care:** Drink plenty of water, rest in a dark/quiet room, and consider a mild over-the-counter pain reliever like Paracetamol. If it's the worst headache of your life, seek **Urgent Care**.";
  }

  if (q.includes("bukhar") || q.includes("fever") || q.includes("body pain") || q.includes("badan dard")) {
    return "🩺 **Book a Doctor / Self-care:** A fever usually means your body is fighting an infection. Rest, stay hydrated, and use Paracetamol to manage temperature. If fever stays high (above 102°F) for over 3 days, book a consultation.";
  }

  if (q.includes("khasi") || q.includes("cough") || q.includes("cold") || q.includes("jukhamb") || q.includes("zukam")) {
    return "🩺 **Self-care:** For a common cold or cough, drink warm fluids, do steam inhalation, and rest. If symptoms worsen after a week or you have trouble breathing, **Book a Doctor**.";
  }

  if (q.includes("kamar drd") || q.includes("kamar dard") || q.includes("back pain") || q.includes("backache") || q.includes("waist pain")) {
    return "🩺 **Self-care / Book Doctor:** Back or waist pain is often due to posture or muscle strain. Rest, apply a hot/cold compress, and avoid heavy lifting. If the pain radiates down your legs or persists, **Book a Doctor**.";
  }

  if (q.includes("per drd") || q.includes("pair dard") || q.includes("leg pain") || q.includes("knee pain") || q.includes("ghutno me dard") || q.includes("ghutne drd")) {
    return "🩺 **Self-care / Monitor:** Leg or knee pain can be from exertion, arthritis, or minor injuries. Rest the leg, elevate it, and apply ice if swollen. If you cannot bear weight or there's severe swelling, **Book an Orthopedist**.";
  }

  if (q.includes("haath drd") || q.includes("hath dard") || q.includes("hand pain") || q.includes("wrist pain") || q.includes("kalai me dard")) {
    return "🩺 **Self-care:** Hand or wrist pain is often caused by repetitive strain (like typing) or minor sprains. Rest your hand, avoid strenuous tasks, and try a wrist brace. If pain is sharp or you lose mobility, **Book a Doctor**.";
  }

  if (q.includes("joint pain") || q.includes("jodo me dard") || q.includes("muscle pain") || q.includes("nass me dard") || q.includes("sprain")) {
    return "🩺 **Self-care / Monitor:** For muscle or joint sprains, use the R.I.C.E method: Rest, Ice, Compression, and Elevation. You may take mild pain relievers. If the pain doesn't improve after a few days, **Book a Consultation**.";
  }

  const medKb = medicineKnowledgeFallback(q);
  if (medKb) return medKb;

  if (q.includes("dna") || q.includes("genetic")) {
    return (
      "**DNA Profile** (patient): Upload **raw data** (e.g. 23andMe `.txt` export) for the most meaningful results. **PDF reports** are read as text in your browser—if the PDF is text-based, we extract words and match markers; scanned image PDFs may not yield much text. " +
        "Everything here is **educational**, not a clinical diagnosis—confirm with your doctor.\n\n" +
        "To improve results: download your **raw genotype file** from your testing company and upload that file instead of (or in addition to) a PDF."
    );
  }

  if (q.includes("appointment") || q.includes("book") || q.includes("video call")) {
    return (
      "Book a visit under **Find Doctors**, pick date/time and type (Video / In-Person / Chat). " +
        "For **video**, both sides open the call from **Appointments** near the scheduled time. " +
        "Use **Support** if something fails."
    );
  }

  if (q.includes("support") || q.includes("report") || q.includes("faq")) {
    return "Open **Support** in the sidebar: **Report** (safety), **Feedback**, **FAQ**, and **Ask admin** for questions to your administrators.";
  }

  // "What should I take for a cold?" / flu / OTC suggestions — give examples + always say ask doctor/pharmacist
  const wantsColdAdvice =
    (q.includes("cold") || q.includes("flu") || q.includes("cough") || q.includes("fever") || q.includes("sniffle")) &&
    (q.includes("take") || q.includes("should i") || q.includes("medicine") || q.includes("medication") || q.includes("pill") || q.includes("drug") || q.includes("what can"));

  if (wantsColdAdvice) {
    return (
      "For **common cold** symptoms (stuffy nose, sore throat, mild fever, aches), many people use **over-the-counter (OTC) symptom relievers** — this is general education, not a personal prescription.\n\n" +
        "**Examples people often use** (names and availability vary by country; always read the label):\n" +
        "- **Pain/fever:** acetaminophen (paracetamol) or ibuprofen — follow package dosing; ask if you have liver, kidney, or stomach issues.\n" +
        "- **Combination cold/flu products:** widely sold lines include **DayQuil / NyQuil**-style (day vs night) or **Tylenol Cold**-style products in some markets — check active ingredients and avoid doubling the same drug in two products.\n" +
        "- **Congestion:** saline nasal spray; some people use decongestants where appropriate — not suitable for everyone (e.g. some blood pressure conditions).\n\n" +
        "**You should ask your doctor or pharmacist** which option fits *you*, especially for children, pregnancy, chronic illness, or if you take other medicines."
    );
  }

  // Specific medicine: what is X used for / details (including common drug names without the word "medicine")
  const drugNameHints = [
    "paracetamol",
    "acetaminophen",
    "ibuprofen",
    "aspirin",
    "metformin",
    "amoxicillin",
    "omeprazole",
    "antibiotic",
    "antihistamine",
    "decongestant",
    "inhaler",
    "insulin",
    "penicillin",
  ];
  const mentionsNamedDrug = drugNameHints.some((d) => q.includes(d));

  const asksDrugInfo =
    (q.includes("used for") ||
      q.includes("tell me about") ||
      q.includes("details about") ||
      q.includes("detail") ||
      q.includes("detaill") ||
      q.includes("what does") ||
      (q.includes("what is") && mentionsNamedDrug) ||
      (q.includes("what are") && mentionsNamedDrug)) ||
    ((q.includes("what is") || q.includes("what are")) &&
      (q.includes("medicine") || q.includes("medication") || q.includes("drug") || q.includes("tablet") || q.includes("pill") || q.includes("injection") || q.includes("capsule")));

  if (asksDrugInfo) {
    return (
      "I can explain **medicines in educational form**: **what they’re for** (symptoms/conditions), **drug class**, **common side effects**, and **cautions**.\n\n" +
        "Try naming a medicine (e.g. **Dolo**, **paracetamol**, **ibuprofen**, **metformin**). " +
        "**Not a personal prescription** — ask your **doctor or pharmacist** for advice for you."
    );
  }

  if (q.includes("medicine") || q.includes("drug") || q.includes("medication") || q.includes("pill")) {
    return (
      "I can share **educational** information: what a medicine is **typically** used for, drug class, and general safety themes.\n\n" +
        "For **“what should I take?”** questions I can mention **common OTC examples** (e.g. for colds: acetaminophen/ibuprofen; some people use **DayQuil/NyQuil**-style or **Tylenol Cold**-style products where sold) — **always confirm with your doctor or pharmacist**.\n\n" +
        "I won’t choose your dose or replace your clinician."
    );
  }

  if (q.includes("wearable") || q.includes("watch") || q.includes("fitbit")) {
    return (
      "**Wearables:** connecting devices isn’t enabled in this build yet. **Health Data** may show demo-style vitals. " +
        "When you add integrations later, they would sync via official APIs (e.g. Fitbit, Apple Health) with your consent."
    );
  }

  if (q.includes("hello") || q.includes("hi ") || q === "hi") {
    return "Hi! I’m **MediConnect Assistant**. Ask me how the app works, or general health education (not personal diagnosis). For emergencies, use local emergency services.";
  }

  return (
    "I’m the built-in assistant. I can explain **MediConnect+** (appointments, DNA uploads, Support, pharmacy, etc.) and **general health education**.\n\n" +
      "**For smarter answers**, your server admin can set `OPENAI_API_KEY` (optional). " +
      "I’m not a substitute for a doctor or pharmacist.\n\n" +
      "Try: “How do I book a video visit?” or “What is the DNA page for?”"
  );
}

router.post("/assistant/chat", authRequired, async (req, res) => {
  try {
    const { messages } = req.body;
    const list = Array.isArray(messages) ? messages : [];
    const lastUser = [...list].reverse().find((m) => m.role === "user");
    const lastContent = String(lastUser?.content || "").slice(0, 8000);

    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...list.slice(-16).map((m) => ({
              role: m.role === "assistant" ? "assistant" : "user",
              content: String(m.content || "").slice(0, 8000),
            })),
          ],
          max_tokens: 900,
          temperature: 0.5,
        }),
      });

      if (!r.ok) {
        const errText = await r.text();
        console.error("OpenAI error:", r.status, errText);
        return res.json({
          reply: fallbackReply(lastContent),
          source: "fallback_openai_error",
        });
      }

      const data = await r.json();
      const reply = data.choices?.[0]?.message?.content?.trim();
      if (!reply) {
        return res.json({ reply: fallbackReply(lastContent), source: "fallback_empty" });
      }
      return res.json({ reply, source: "openai" });
    }

    return res.json({
      reply: fallbackReply(lastContent),
      source: "fallback",
    });
  } catch (e) {
    console.error("assistant/chat", e);
    res.status(500).json({ error: "Assistant unavailable" });
  }
});

export default router;

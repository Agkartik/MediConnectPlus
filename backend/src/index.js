import http from "http";
import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDb } from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import appRoutes from "./routes/app.routes.js";
import paymentRoutes from "./routes/payments.routes.js";
import dnaRoutes from "./routes/dna.routes.js";
import twinRoutes from "./routes/twin.routes.js";
import supportRoutes from "./routes/support.routes.js";
import assistantRoutes from "./routes/assistant.routes.js";
import { attachSignaling } from "./socket/signaling.js";
import { csrfProtection, attachCSRFToken, getCSRFToken } from "./middleware/csrf.js";

const app = express();
const origin = process.env.CLIENT_ORIGIN?.split(",").map((s) => s.trim()) || true;
app.use(cors({ origin, credentials: true }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser()); // Parse cookies for HTTP-only JWT

// CSRF Protection
app.use(csrfProtection); // Verify CSRF on POST/PUT/DELETE requests

app.get("/api/health", (req, res) => res.json({ ok: true }));

// CSRF token endpoint
app.get("/api/csrf-token", getCSRFToken);

app.use("/api/auth", authRoutes);
app.use("/api", paymentRoutes);
app.use("/api", appRoutes);
app.use("/api/dna", dnaRoutes); // DNA-based health recommendations
app.use("/api/twin", twinRoutes); // Virtual Health Twin
app.use("/api", supportRoutes); // FAQ, feedback, admin inquiries
app.use("/api", assistantRoutes); // AI assistant (optional OpenAI)

const PORT = Number(process.env.PORT) || 5000;
const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/mediconnect";

const server = http.createServer(app);

// Prevent noisy "Unhandled 'error' event" crashes on dev restarts
server.on("error", (err) => {
  if (err && typeof err === "object" && "code" in err && err.code === "EADDRINUSE") {
    console.error(
      `[API] Port ${PORT} is already in use. Another backend instance is running.\n` +
        `- Fix: stop the other process, or change PORT in backend/.env\n`
    );
    process.exit(1);
  }
  console.error("[API] Server error:", err);
  process.exit(1);
});

server.listen(PORT, () =>
  console.log(`MediConnect API + WebRTC signaling on http://localhost:${PORT}`)
);

connectDb(uri)
  .then(() => {
    attachSignaling(server);
    console.log("MongoDB connection established successfully");
  })
  .catch((err) => {
    console.error("CRITICAL: Failed to connect to MongoDB:", err.message);
    // Don't exit process, let the server stay up so we can see errors in health checks
  });

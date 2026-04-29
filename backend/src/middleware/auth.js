import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { getTokenFromCookie } from "../utils/cookieAuth.js";

export function authRequired(req, res, next) {
  // Try to get token from Authorization header OR HTTP-only cookie
  let token = null;
  
  // Check Authorization header first
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    token = header.slice(7);
  }
  
  // If no header token, try cookie
  if (!token) {
    token = getTokenFromCookie(req);
  }
  
  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Authentication required" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

/** Only doctors need admin approval; patients and admins always pass. */
export async function requireApproved(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ error: "Authentication required" });
    if (req.user.role === "admin" || req.user.role === "patient") return next();
    const user = await User.findById(req.user.id).select("approved role");
    if (!user) return res.status(401).json({ error: "User not found" });
    if (user.role === "doctor" && user.approved === false) {
      return res.status(403).json({ error: "Account pending admin approval", code: "NOT_APPROVED" });
    }
    next();
  } catch {
    res.status(500).json({ error: "Authorization check failed" });
  }
}

import { isAppointmentDateToday } from "./appointmentDate.js";

/**
 * Parse appointment local date + time. Supports:
 * - Date: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, or Date.parse-able strings
 * - Time: "3:30 PM", "3:30PM", "15:30"
 */
export function parseAppointmentDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const ds = String(dateStr).trim();
  const ts = String(timeStr).trim();

  let y;
  let m;
  let d;
  const iso = ds.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    y = Number(iso[1]);
    m = Number(iso[2]);
    d = Number(iso[3]);
  } else {
    const dmy = ds.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (dmy) {
      d = Number(dmy[1]);
      m = Number(dmy[2]);
      y = Number(dmy[3]);
    } else {
      const parsed = Date.parse(ds);
      if (Number.isNaN(parsed)) return null;
      const dt = new Date(parsed);
      y = dt.getFullYear();
      m = dt.getMonth() + 1;
      d = dt.getDate();
    }
  }

  let hour = 0;
  let minute = 0;
  const ampmSp = ts.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  const ampmNoSp = ts.match(/^(\d{1,2}):(\d{2})(AM|PM)$/i);
  const h24 = ts.match(/^(\d{1,2}):(\d{2})$/);

  if (ampmSp) {
    hour = Number(ampmSp[1]);
    minute = Number(ampmSp[2]);
    const ap = ampmSp[3].toUpperCase();
    if (ap === "PM" && hour !== 12) hour += 12;
    if (ap === "AM" && hour === 12) hour = 0;
  } else if (ampmNoSp) {
    hour = Number(ampmNoSp[1]);
    minute = Number(ampmNoSp[2]);
    const ap = ampmNoSp[3].toUpperCase();
    if (ap === "PM" && hour !== 12) hour += 12;
    if (ap === "AM" && hour === 12) hour = 0;
  } else if (h24) {
    hour = Number(h24[1]);
    minute = Number(h24[2]);
    if (hour > 23 || minute > 59) return null;
  } else {
    return null;
  }

  return new Date(y, m - 1, d, hour, minute, 0, 0);
}

/**
 * Participants may join a video room if: env override is true, or strictly within slot window (start time to +60mins).
 */
export function isWithinVideoCallWindow(appointment) {
  if (process.env.ALLOW_VIDEO_CALL_ANYTIME === "true") return true;
  if (!appointment || !["confirmed", "pending"].includes(appointment.status)) return false;

  const start = parseAppointmentDateTime(appointment.date, appointment.time);
  const now = Date.now();
  if (start) {
    const startMs = start.getTime();
    // 0 minutes early, up to 60 minutes late
    const earlyWindowMs = 0;
    const lateWindowMs = 60 * 60 * 1000;
    if (now >= startMs - earlyWindowMs && now <= startMs + lateWindowMs) return true;
  }

  return false;
}

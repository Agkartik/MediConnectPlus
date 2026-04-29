/** Same calendar day as `dateStr` (browser local), matching server appointmentDate helper. */
function isAppointmentDateToday(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== "string") return false;
  if (/today/i.test(dateStr)) return true;
  const iso = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) {
    const [y, m, d] = iso[1].split("-").map(Number);
    const t = new Date(y, m - 1, d);
    const now = new Date();
    return t.getFullYear() === now.getFullYear() && t.getMonth() === now.getMonth() && t.getDate() === now.getDate();
  }
  const parsed = Date.parse(dateStr);
  if (!Number.isNaN(parsed)) {
    const t = new Date(parsed);
    const now = new Date();
    return t.getFullYear() === now.getFullYear() && t.getMonth() === now.getMonth() && t.getDate() === now.getDate();
  }
  return false;
}

function parseAppointmentDateTime(dateStr: string, timeStr: string): Date | null {
  if (!dateStr || !timeStr) return null;
  const ds = String(dateStr).trim();
  const ts = String(timeStr).trim();

  let y: number;
  let m: number;
  let d: number;
  const isoMatch = ds.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    y = Number(isoMatch[1]);
    m = Number(isoMatch[2]);
    d = Number(isoMatch[3]);
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
 * Patient video join: near slot time, same calendar day (Video), or VITE_ALLOW_VIDEO_CALL_ANYTIME=true.
 */
export function canPatientJoinAppointmentCall(date: string, time: string, type?: string): boolean {
  if (import.meta.env.VITE_ALLOW_VIDEO_CALL_ANYTIME === "true") return true;

  const isVideo = type === "Video" || type === undefined;
  const start = parseAppointmentDateTime(date, time);
  const now = Date.now();
  if (start) {
    const startMs = start.getTime();
    const earlyWindowMs = 10 * 60 * 1000;
    const lateWindowMs = 60 * 60 * 1000;
    if (now >= startMs - earlyWindowMs && now <= startMs + lateWindowMs) return true;
  }

  if (isVideo && isAppointmentDateToday(date)) return true;

  return false;
}

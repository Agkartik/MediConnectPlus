/** True if appointment `date` string refers to the user's local calendar day (server TZ). */
export function isAppointmentDateToday(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return false;
  if (/today/i.test(dateStr)) return true;
  const iso = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) {
    const [y, m, d] = iso[1].split("-").map(Number);
    const t = new Date(y, m - 1, d);
    const now = new Date();
    return (
      t.getFullYear() === now.getFullYear() && t.getMonth() === now.getMonth() && t.getDate() === now.getDate()
    );
  }
  const parsed = Date.parse(dateStr);
  if (!Number.isNaN(parsed)) {
    const t = new Date(parsed);
    const now = new Date();
    return (
      t.getFullYear() === now.getFullYear() && t.getMonth() === now.getMonth() && t.getDate() === now.getDate()
    );
  }
  return false;
}

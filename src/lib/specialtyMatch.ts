/** Normalize specialty labels so filters match seeded + registered doctors (e.g. Cardiology vs Cardiologist). */
export function canonSpecialty(raw: string): string {
  const s = raw.trim().toLowerCase();
  if (!s) return "";
  if (s.includes("cardio")) return "cardiologist";
  if (s.includes("derma")) return "dermatologist";
  if (s.includes("neuro")) return "neurologist";
  if (s.includes("ortho")) return "orthopedic";
  if (s.includes("pediatr") || s.includes("paediatr")) return "pediatrician";
  if (s.includes("general") || s === "gp" || s.includes("physician") || s.includes("family")) return "general physician";
  return s.replace(/\s+/g, " ");
}

export function specialtyMatches(doctorSpecialty: string, filterChip: string): boolean {
  if (filterChip === "All") return true;
  return canonSpecialty(doctorSpecialty) === canonSpecialty(filterChip);
}

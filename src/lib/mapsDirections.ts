/**
 * Opens Google Maps **turn-by-turn directions** to the doctor's clinic.
 * If the patient has saved coordinates, uses them as the starting point.
 * Destination is always the clinic lat/lng from the doctor profile.
 */
export function buildDirectionsToClinicUrl(
  clinicLat: number,
  clinicLng: number,
  opts?: { patientLat?: number | null; patientLng?: number | null }
): string {
  const dest = `${clinicLat},${clinicLng}`;
  let url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
  const oLat = opts?.patientLat;
  const oLng = opts?.patientLng;
  if (oLat != null && oLng != null && Number.isFinite(oLat) && Number.isFinite(oLng)) {
    url += `&origin=${encodeURIComponent(`${oLat},${oLng}`)}`;
  }
  return url;
}

/** Simple map pin (no directions) — e.g. patient “my location”. */
export function buildMapPinUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`;
}

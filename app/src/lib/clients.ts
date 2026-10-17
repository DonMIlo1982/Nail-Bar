export interface Client {
  id: string;
  name: string;
  phone: string;
  phone_norm: string | null;
  email: string;
  birth_month: number | null;
  birth_day: number | null;
  preferred_tech_id: string | null;
  allergies: string;
  notes: string;
  marketing_consent: boolean;
  consent_at: string | null;
  consent_source: string | null;
  created_at: string;
  updated_at: string;
}

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** 082 123 4567, +27 82 123 4567 and 27821234567 all become 0821234567 (same as the database). */
export function normPhone(p: string | null | undefined): string {
  let d = String(p || "").replace(/\D/g, "");
  if (/^27\d{9}$/.test(d)) d = "0" + d.slice(2);
  return d.length >= 9 ? d : "";
}

export function fmtBirthday(m: number | null, d: number | null): string {
  return m && d ? `${d} ${MONTHS[m - 1]}` : "";
}

/** Days until the next birthday (0 = today), or null if none saved. */
export function daysToBirthday(m: number | null, d: number | null, from = new Date()): number | null {
  if (!m || !d) return null;
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let next = new Date(today.getFullYear(), m - 1, d);
  if (next < today) next = new Date(today.getFullYear() + 1, m - 1, d);
  return Math.round((next.getTime() - today.getTime()) / 864e5);
}

/** "Thandi" / "Thandi M" / "Thandi Mokoena" count as similar (same rule as the POS). */
export function namesSimilar(a: string, b: string): boolean {
  const A = a.toLowerCase().replace(/\./g, "").split(/\s+/).filter(Boolean);
  const B = b.toLowerCase().replace(/\./g, "").split(/\s+/).filter(Boolean);
  if (!A.length || !B.length || A[0] !== B[0]) return false;
  if (A.length < 2 || B.length < 2) return true;
  return A[1].startsWith(B[1]) || B[1].startsWith(A[1]);
}

/** WhatsApp link for a South African cellphone number. */
export function waLink(phone: string, text: string): string | null {
  let p = String(phone || "").replace(/\D/g, "");
  if (p.startsWith("0")) p = "27" + p.slice(1);
  return p ? `https://wa.me/${p}?text=${encodeURIComponent(text)}` : null;
}

export const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : "";

export const csvCell = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

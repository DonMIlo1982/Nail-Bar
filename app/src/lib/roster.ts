import type { DayHours } from "./settings";

/** Same rules as the single-file POS. Dates are "YYYY-MM-DD" strings in salon time. */
export const LEAVE_TYPES = ["Annual leave", "Sick leave", "Family responsibility", "Study or training", "Unpaid leave", "Other time away"];

export interface Leave { id: string; tech_id: string; from_date: string; to_date: string; type: string; note: string; by_name: string }
export interface DayChange { tech_id: string; day: string; state: "on" | "off"; by_name: string }
export interface RosterTech { id: string; name: string; colour: string; active: boolean; usual_days: boolean[] }
export interface WorkStatus { on: boolean; why: string; changed?: boolean; leave?: Leave }

export const dateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const parseDay = (s: string) => new Date(s + "T00:00:00");
export const addDays = (s: string, n: number) => { const d = parseDay(s); d.setDate(d.getDate() + n); return dateStr(d); };
export const mondayOf = (s: string) => { const d = parseDay(s); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return dateStr(d); };
export const daysBetween = (a: string, b: string) => Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 864e5);
/** Today in South Africa, whatever the server's own time zone. */
export const todayZA = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });
export const isDay = (s: string | undefined): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(parseDay(s).getTime());

/** Who works on a day. A single-day change wins; then leave; then the salon being closed; then usual days. */
export function planStatus(t: RosterTech, day: string, ctx: { leave: Leave[]; changes: DayChange[]; hours: DayHours[] }): WorkStatus {
  const c = ctx.changes.find((x) => x.tech_id === t.id && x.day === day);
  if (c?.state === "on") return { on: true, why: "Added for this day", changed: true };
  if (c?.state === "off") return { on: false, why: "Off this day", changed: true };
  const l = ctx.leave.find((x) => x.tech_id === t.id && x.from_date <= day && x.to_date >= day);
  if (l) return { on: false, why: l.type, leave: l };
  const dow = parseDay(day).getDay();
  if (ctx.hours[dow]?.closed) return { on: false, why: "Salon closed" };
  if (t.usual_days?.[dow] === false) return { on: false, why: "Day off" };
  return { on: true, why: "Working" };
}

/** What the diary uses: the full roster, or only single-day changes if the roster is switched off. */
export function workStatus(t: RosterTech, day: string, ctx: { leave: Leave[]; changes: DayChange[]; hours: DayHours[]; follow: boolean }): WorkStatus {
  if (ctx.follow) return planStatus(t, day, ctx);
  const c = ctx.changes.find((x) => x.tech_id === t.id && x.day === day);
  return c?.state === "off" ? { on: false, why: "Off this day", changed: true } : { on: true, why: c ? "Added for this day" : "Working", changed: !!c };
}

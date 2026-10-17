"use server";
import { revalidatePath } from "next/cache";
import { logAct, requirePerm } from "@/lib/auth";
import { LEAVE_TYPES, isDay } from "@/lib/roster";

export type RosterMsg = { error?: string; ok?: boolean; warn?: string } | null;

const refresh = () => { revalidatePath("/roster"); revalidatePath("/diary"); };

/** Change one technician for one day: "on", "off", or null to go back to the usual roster. */
export async function setDayChange(techId: string, day: string, state: "on" | "off" | null, why = ""): Promise<RosterMsg> {
  const { supabase, staff } = await requirePerm("roster");
  if (!isDay(day)) return { error: "That date isn't valid." };
  const { data: t } = await supabase.from("technicians").select("name").eq("id", techId).single();
  const { error } = state
    ? await supabase.from("roster_days").upsert({ tech_id: techId, day, state, by_name: staff.name, changed_at: new Date().toISOString() })
    : await supabase.from("roster_days").delete().eq("tech_id", techId).eq("day", day);
  if (error) return { error: "Couldn't change the roster: " + error.message };
  await logAct(supabase, staff, "Roster change", `${t?.name} on ${day}: ${state === "on" ? "working" : state === "off" ? "off" : "back to usual roster"}${why ? ` (${why})` : ""}`);
  refresh();
  return { ok: true };
}

export async function saveLeave(_prev: RosterMsg, form: FormData): Promise<RosterMsg> {
  const { supabase, staff } = await requirePerm("roster");
  const id = String(form.get("id") || "") || null;
  const row = {
    tech_id: String(form.get("tech_id")),
    type: String(form.get("type")),
    from_date: String(form.get("from_date")),
    to_date: String(form.get("to_date")),
    note: String(form.get("note") || "").trim(),
  };
  if (!LEAVE_TYPES.includes(row.type)) return { error: "Choose the type of leave." };
  if (!isDay(row.from_date) || !isDay(row.to_date)) return { error: "Choose the first and last day." };
  if (row.to_date < row.from_date) return { error: "The last day is before the first day." };

  // Warn about bookings during the leave before saving.
  if (form.get("confirm") !== "1") {
    const { data: bks } = await supabase.from("bookings").select("client_name,day,start_time")
      .eq("tech_id", row.tech_id).eq("status", "booked").gte("day", row.from_date).lte("day", row.to_date).order("day");
    if (bks?.length) {
      return { warn: `This technician has ${bks.length} booking${bks.length === 1 ? "" : "s"} during this leave: ${bks.slice(0, 6).map((b) => `${b.day} ${b.start_time.slice(0, 5)} ${b.client_name}`).join("; ")}${bks.length > 6 ? "…" : ""}. Move them to another technician in the diary. Save the leave anyway?` };
    }
  }

  const { data: t } = await supabase.from("technicians").select("name").eq("id", row.tech_id).single();
  const { error } = id
    ? await supabase.from("roster_leave").update(row).eq("id", id)
    : await supabase.from("roster_leave").insert({ ...row, by_name: staff.name });
  if (error) {
    if (error.message.includes("exclu") || error.code === "23P01") return { error: `${t?.name} already has leave on some of those days.` };
    return { error: "Couldn't save: " + error.message };
  }
  // Single-day "off" changes inside the leave are no longer needed.
  await supabase.from("roster_days").delete().eq("tech_id", row.tech_id).eq("state", "off").gte("day", row.from_date).lte("day", row.to_date);
  await logAct(supabase, staff, id ? "Changed leave" : "Added leave", `${t?.name}: ${row.type}, ${row.from_date} to ${row.to_date}${row.note ? ` (${row.note})` : ""}`);
  refresh();
  return { ok: true };
}

export async function deleteLeave(id: string): Promise<RosterMsg> {
  const { supabase, staff } = await requirePerm("roster");
  const { data: l } = await supabase.from("roster_leave").select("type,from_date,to_date,technicians(name)").eq("id", id).single();
  const { error } = await supabase.from("roster_leave").delete().eq("id", id);
  if (error) return { error: error.message };
  const name = (l?.technicians as unknown as { name: string } | null)?.name;
  await logAct(supabase, staff, "Deleted leave", `${name}: ${l?.type}, ${l?.from_date} to ${l?.to_date}`);
  refresh();
  return { ok: true };
}

export async function saveUsualDays(_prev: RosterMsg, form: FormData): Promise<RosterMsg> {
  const { supabase, staff } = await requirePerm("roster");
  const { data: techs } = await supabase.from("technicians").select("id,name,usual_days").eq("active", true);
  const changes: string[] = [];
  for (const t of techs || []) {
    const days = Array.from({ length: 7 }, (_, i) => form.get(`d_${t.id}_${i}`) === "on");
    if (days.some((d, i) => d !== t.usual_days[i])) {
      const { error } = await supabase.rpc("set_usual_days", { p_tech: t.id, p_days: days });
      if (error) return { error: error.message };
      const off = [1, 2, 3, 4, 5, 6, 0].filter((i) => !days[i]).map((i) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i]);
      changes.push(`${t.name}: off ${off.join(", ") || "none"}`);
    }
  }
  if (changes.length) await logAct(supabase, staff, "Changed usual working days", changes.join("; "));
  refresh();
  return { ok: true };
}

export async function setRosterInDiary(on: boolean): Promise<RosterMsg> {
  const { supabase, staff } = await requirePerm("roster");
  const { error } = await supabase.rpc("set_roster_in_diary", { p_on: on });
  if (error) return { error: error.message };
  await logAct(supabase, staff, "Roster setting", on ? "Diary follows the roster" : "Diary stopped following the roster");
  refresh();
  return { ok: true };
}

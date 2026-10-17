"use server";
import { revalidatePath } from "next/cache";
import { logAct, requirePerm } from "@/lib/auth";
import { normPhone } from "@/lib/clients";
import { DAYS, toMin, type DayHours } from "@/lib/settings";
import { isDay, parseDay, workStatus, type RosterTech } from "@/lib/roster";

export type BookingMsg = { error?: string; warn?: string[]; ok?: boolean; values?: Record<string, string> } | null;

const LATEST = 22 * 60; // bookings must finish by 22:00

export async function saveBooking(_prev: BookingMsg, form: FormData): Promise<BookingMsg> {
  const r = await save(form);
  return r && (r.error || r.warn) ? { ...r, values: Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)])) } : r;
}

async function save(form: FormData): Promise<BookingMsg> {
  const { supabase, staff } = await requirePerm();
  const id = String(form.get("id") || "") || null;
  let client_name = String(form.get("client_name") || "").trim().replace(/\s+/g, " ");
  let phone = String(form.get("phone") || "").trim();
  const tech_id = String(form.get("tech_id") || "");
  const day = String(form.get("day") || "");
  const start = String(form.get("start_time") || "");
  const duration = Math.round((parseInt(String(form.get("duration_min"))) || 0) / 5) * 5;
  const deposit = Math.max(0, Math.round((parseFloat(String(form.get("deposit") || "0")) || 0) * 100) / 100);
  const notes = String(form.get("notes") || "").trim();
  const itemIds = form.getAll("item").map(String);
  const confirmed = form.get("confirm") === "1";

  if (!client_name) return { error: "Add the client's name." };
  if (!itemIds.length) return { error: "Tick at least one service." };
  if (!tech_id) return { error: "Choose a technician." };
  if (!isDay(day)) return { error: "Choose a date." };
  if (!/^\d{2}:\d{2}$/.test(start)) return { error: "Choose a start time." };
  if (duration < 5) return { error: "Enter how long it takes." };
  if (toMin(start) + duration > LATEST) return { error: "That booking runs past 22:00." };

  // Link to a client by name, or by cellphone if the name isn't on file.
  let client_id: string | null = null;
  const warn: string[] = [];
  const { data: byName } = await supabase.from("clients").select("id,name,phone").ilike("name", client_name).limit(1);
  let linked = byName?.[0] || null;
  const np = normPhone(phone);
  if (!linked && np) {
    const { data: byPhone } = await supabase.from("clients").select("id,name,phone").eq("phone_norm", np).limit(1);
    if (byPhone?.[0]) {
      linked = byPhone[0];
      warn.push(`This cellphone number belongs to ${linked.name}. The booking will be saved under their name.`);
      client_name = linked.name;
    }
  }
  if (linked) { client_id = linked.id; if (!phone) phone = linked.phone || ""; }

  // Roster and opening hours: warn, don't block.
  const [{ data: tech }, { data: s }, { data: leave }, { data: changes }] = await Promise.all([
    supabase.from("technicians").select("id,name,colour,active,usual_days").eq("id", tech_id).single<RosterTech>(),
    supabase.from("settings").select("opening_hours,roster_in_diary").eq("id", 1).single<{ opening_hours: DayHours[]; roster_in_diary: boolean }>(),
    supabase.from("roster_leave").select("*").eq("tech_id", tech_id).lte("from_date", day).gte("to_date", day),
    supabase.from("roster_days").select("*").eq("tech_id", tech_id).eq("day", day),
  ]);
  if (!tech) return { error: "That technician wasn't found." };
  const hours = s?.opening_hours || [];
  const ctx = { leave: leave || [], changes: changes || [], hours, follow: !!s?.roster_in_diary };
  const ws = workStatus(tech, day, ctx);
  if (!ws.on) warn.push(`${tech.name} isn't working on ${parseDay(day).toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" })} (${ws.why}). Saving will add them as working that day.`);
  const h = hours[parseDay(day).getDay()];
  if (h?.closed) warn.push(`The salon is normally closed on ${DAYS[parseDay(day).getDay()]}s.`);
  else if (h && (toMin(start) < toMin(h.open) || toMin(start) + duration > toMin(h.close))) warn.push(`This is outside opening hours (${h.open}–${h.close}).`);
  if (warn.length && !confirmed) return { warn };

  // Snapshot the services as they are today.
  const { data: items } = await supabase.from("items").select("id,name,price,duration_min").in("id", itemIds);
  const ordered = itemIds.map((i) => items?.find((x) => x.id === i)).filter(Boolean) as { id: string; name: string; price: number; duration_min: number }[];

  const row = { client_id, client_name, phone, tech_id, day, start_time: start, duration_min: duration, deposit, notes };
  let bookingId = id;
  if (id) {
    const { error } = await supabase.from("bookings").update({ ...row, updated_by_name: staff.name }).eq("id", id);
    if (error) return { error: clashMessage(error) };
    await supabase.from("booking_items").delete().eq("booking_id", id);
  } else {
    const { data, error } = await supabase.from("bookings").insert({ ...row, created_by_name: staff.name }).select("id").single();
    if (error) return { error: clashMessage(error) };
    bookingId = data.id;
  }
  await supabase.from("booking_items").insert(ordered.map((it, position) => ({
    booking_id: bookingId, item_id: it.id, name: it.name, price: it.price, duration_min: it.duration_min ?? 0, position,
  })));

  // Booking someone who isn't rostered brings them in for that day.
  if (!ws.on && (await supabase.rpc("has_perm", { p: "roster" })).data) {
    await supabase.from("roster_days").upsert({ tech_id, day, state: "on", by_name: staff.name, changed_at: new Date().toISOString() });
    await logAct(supabase, staff, "Roster change", `${tech.name} added as working on ${day} for a booking`);
  }
  const desc = `${client_name}, ${ordered.map((o) => o.name).join(" + ")} with ${tech.name}, ${day} ${start}`;
  await logAct(supabase, staff, id ? "Changed booking" : "New booking", desc + (deposit ? `, deposit R${deposit}` : ""));
  revalidatePath("/diary");
  return { ok: true };
}

function clashMessage(e: { code?: string; message: string }) {
  if (e.code === "23P01" || e.message.includes("bookings_no_overlap"))
    return "That technician already has a booking at that time. Choose another time or technician.";
  return "Couldn't save the booking: " + e.message;
}

/** Arrived, cancelled, no-show, or back to booked (restore). */
export async function setBookingStatus(id: string, status: "booked" | "arrived" | "cancelled" | "no_show"): Promise<BookingMsg> {
  const { supabase, staff } = await requirePerm();
  const { data: b } = await supabase.from("bookings").select("client_name,day,start_time,status,technicians(name)").eq("id", id).single();
  if (!b) return { error: "That booking wasn't found." };
  const { error } = await supabase.from("bookings").update({ status, status_by: staff.name, status_at: new Date().toISOString() }).eq("id", id);
  if (error) {
    if (error.code === "23P01" || error.message.includes("bookings_no_overlap")) return { error: "Another booking now takes that time, so this one can't be restored. Make a new booking instead." };
    return { error: error.message.replace(/^.*?: /, "") };
  }
  const label = { booked: "Restored booking", arrived: "Client arrived", cancelled: "Cancelled booking", no_show: "No-show" }[status];
  const tn = (b.technicians as unknown as { name: string } | null)?.name;
  await logAct(supabase, staff, label, `${b.client_name}, ${tn}, ${b.day} ${b.start_time.slice(0, 5)}`);
  revalidatePath("/diary");
  return { ok: true };
}

export async function markReminded(id: string) {
  const { supabase } = await requirePerm();
  await supabase.from("bookings").update({ reminded_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/diary");
}

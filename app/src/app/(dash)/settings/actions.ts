"use server";
import { revalidatePath } from "next/cache";
import { logAct, requirePerm } from "@/lib/auth";
import { DAYS, toMin, type DayHours } from "@/lib/settings";

export type FormMsg = { ok?: boolean; error?: string } | null;

export async function saveSettings(_prev: FormMsg, form: FormData): Promise<FormMsg> {
  const { supabase, staff } = await requirePerm("settings");
  const s = (k: string) => String(form.get(k) || "").trim();
  const hours: DayHours[] = DAYS.map((_, i) => ({
    open: s(`open_${i}`) || "08:00",
    close: s(`close_${i}`) || "19:00",
    closed: form.get(`closed_${i}`) === "on",
  }));
  const bad = hours.findIndex((h) => !h.closed && toMin(h.close) <= toMin(h.open));
  if (bad >= 0) return { error: `${DAYS[bad]}: closing time must be after opening time.` };
  const months = parseInt(s("voucher_months")) || 36;
  if (months < 36) return { error: "Vouchers must be valid for at least 36 months (Consumer Protection Act)." };
  const vatReg = form.get("vat_registered") === "on";
  if (vatReg && !s("vat_no")) return { error: "Add the VAT number, or untick VAT registered." };

  const { error } = await supabase.from("settings").update({
    business_name: s("business_name") || "Spoilt Brat",
    address: s("address"), phone: s("phone"), email: s("email"),
    vat_registered: vatReg, vat_no: s("vat_no"), receipt_footer: s("receipt_footer"),
    voucher_months: months, opening_hours: hours, updated_at: new Date().toISOString(),
  }).eq("id", 1);
  if (error) return { error: "Couldn't save: " + error.message };
  await logAct(supabase, staff, "Changed settings");
  revalidatePath("/", "layout");
  return { ok: true };
}

const pct = (v: FormDataEntryValue | null) => Math.min(100, Math.max(0, parseFloat(String(v || "0")) || 0));

export async function saveTechnician(_prev: FormMsg, form: FormData): Promise<FormMsg> {
  const { supabase, staff } = await requirePerm("settings");
  const id = String(form.get("id") || "") || null;
  const name = String(form.get("name") || "").trim();
  if (!name) return { error: "Add the technician's name." };
  const colour = /^#[0-9a-f]{6}$/i.test(String(form.get("colour"))) ? String(form.get("colour")) : "#C2185B";
  const row = { name, colour, comm_svc: pct(form.get("comm_svc")), comm_prod: pct(form.get("comm_prod")), active: form.get("active") === "on" };

  if (id) {
    const { error } = await supabase.from("technicians").update(row).eq("id", id);
    if (error) return { error: "Couldn't save: " + error.message };
    await logAct(supabase, staff, "Changed technician", `${name}: services ${row.comm_svc}%, products ${row.comm_prod}%${row.active ? "" : " (not working here)"}`);
  } else {
    const { count } = await supabase.from("technicians").select("id", { count: "exact", head: true });
    const { error } = await supabase.from("technicians").insert({ ...row, active: true, sort: count ?? 0 });
    if (error) return { error: "Couldn't add: " + error.message };
    await logAct(supabase, staff, "Added technician", name);
  }
  revalidatePath("/settings");
  return { ok: true };
}

/** Move a technician up or down the list (the order used on the till and in the diary). */
export async function moveTechnician(form: FormData) {
  const { supabase } = await requirePerm("settings");
  const id = String(form.get("id"));
  const dir = Number(form.get("dir"));
  const { data } = await supabase.from("technicians").select("id,sort").order("sort").order("name");
  const list = data || [];
  const i = list.findIndex((t) => t.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await Promise.all(list.map((t, k) => supabase.from("technicians").update({ sort: k }).eq("id", t.id)));
  revalidatePath("/settings");
}

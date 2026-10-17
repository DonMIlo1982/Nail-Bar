"use server";
import { revalidatePath } from "next/cache";
import { logAct, requirePerm } from "@/lib/auth";

/** The parts of a single-file POS backup we bring across in stage 1. */
export interface BackupPayload {
  techs: { id: string; name: string; color?: string; commSvc?: number; commProd?: number }[];
  items: { id: string; type: string; name: string; category?: string; code?: string; duration?: number; cost?: number; price?: number; qty?: number; low?: number }[];
  clients: {
    id: string; name: string; phone?: string; email?: string; birthday?: string; preferredTech?: string;
    allergies?: string; notes?: string; consent?: boolean; consentDate?: string | null; consentSource?: string | null; created?: string;
  }[];
}

export interface ImportResult { error?: string; techs?: number; items?: number; clients?: number; skipped?: string[] }

const chunk = <T,>(a: T[], n = 300) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

/** Adds or updates records matched on their POS id, so the same backup can be imported more than once. */
export async function importBackup(p: BackupPayload): Promise<ImportResult> {
  const { supabase, staff } = await requirePerm("settings");
  const skipped: string[] = [];

  const techRows = p.techs.filter((t) => t.id && t.name).map((t, i) => ({
    legacy_id: t.id, name: t.name.slice(0, 80), colour: /^#[0-9a-f]{6}$/i.test(t.color || "") ? t.color : "#C2185B",
    comm_svc: Number(t.commSvc) || 0, comm_prod: Number(t.commProd) || 0, sort: i,
  }));
  for (const part of chunk(techRows)) {
    const { error } = await supabase.from("technicians").upsert(part, { onConflict: "legacy_id" });
    if (error) return { error: "Technicians: " + error.message };
  }
  const { data: techMap } = await supabase.from("technicians").select("id,legacy_id").not("legacy_id", "is", null);
  const techId = Object.fromEntries((techMap || []).map((t) => [t.legacy_id, t.id]));

  const itemRows = p.items.filter((i) => i.id && i.name && (i.type === "service" || i.type === "product")).map((i) => ({
    legacy_id: i.id, kind: i.type, name: i.name.slice(0, 120), category: i.category || "", code: i.code || "",
    duration_min: i.type === "service" ? Number(i.duration) || 30 : null,
    cost: Math.max(0, Number(i.cost) || 0), price: Math.max(0, Number(i.price) || 0),
    qty: i.type === "product" ? Math.trunc(Number(i.qty) || 0) : 0, reorder_at: Math.trunc(Number(i.low) || 0),
  }));
  let itemsDone = 0;
  const { data: me } = await supabase.rpc("has_perm", { p: "stock" });
  if (me) {
    for (const part of chunk(itemRows)) {
      const { error } = await supabase.from("items").upsert(part, { onConflict: "legacy_id" });
      if (error) return { error: "Services and products: " + error.message };
      itemsDone += part.length;
    }
  } else if (itemRows.length) skipped.push("services and products (needs the stock permission)");

  const clientRows = p.clients.filter((c) => c.id && c.name?.trim()).map((c) => {
    const m = (c.birthday || "").match(/(\d{2})-(\d{2})$/);
    const bm = m ? +m[1] : null, bd = m ? +m[2] : null;
    return {
      legacy_id: c.id, name: c.name.trim().slice(0, 120), phone: c.phone || "", email: c.email || "",
      birth_month: bm && bd && bm <= 12 && bd <= 31 ? bm : null, birth_day: bm && bd && bm <= 12 && bd <= 31 ? bd : null,
      preferred_tech_id: c.preferredTech ? techId[c.preferredTech] ?? null : null,
      allergies: c.allergies || "", notes: c.notes || "", marketing_consent: !!c.consent,
      consent_at: c.consent ? c.consentDate || c.created || new Date().toISOString() : null,
      consent_source: c.consent ? (["till", "client form", "online"].includes(c.consentSource || "") ? c.consentSource : "import") : null,
      ...(c.created ? { created_at: c.created } : {}),
    };
  });
  for (const part of chunk(clientRows)) {
    const { error } = await supabase.from("clients").upsert(part, { onConflict: "legacy_id" });
    if (error) return { error: "Clients: " + error.message };
  }

  await logAct(supabase, staff, "Imported POS backup",
    `${techRows.length} technicians, ${itemsDone} services/products, ${clientRows.length} clients`);
  revalidatePath("/clients");
  return { techs: techRows.length, items: itemsDone, clients: clientRows.length, skipped };
}

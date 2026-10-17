"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { logAct, requirePerm } from "@/lib/auth";
import { MONTHS, namesSimilar, normPhone } from "@/lib/clients";

export interface SaveState {
  error?: string;
  /** Possible duplicates found; the form asks the person to confirm before saving again. */
  dups?: { id: string; name: string; phone: string; why: string[] }[];
  /** What was typed, so the form can show it again after a warning. */
  values?: Record<string, string>;
}

export async function saveClient(_prev: SaveState, form: FormData): Promise<SaveState> {
  const result = await save(form);
  return result.error || result.dups ? { ...result, values: Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)])) } : result;
}

async function save(form: FormData): Promise<SaveState> {
  const { supabase, staff } = await requirePerm("clients");
  const id = String(form.get("id") || "") || null;
  const name = String(form.get("name") || "").trim().replace(/\s+/g, " ");
  const phone = String(form.get("phone") || "").trim();
  const email = String(form.get("email") || "").trim();
  const bd = Number(form.get("birth_day") || 0);
  const bm = Number(form.get("birth_month") || 0);
  const consent = form.get("marketing_consent") === "on";
  const confirmed = form.get("confirm_dups") === "1";

  if (!name) return { error: "Add the client's name." };
  if ((bd && !bm) || (!bd && bm)) return { error: "Choose both the day and month of the birthday, or neither." };
  if (bd && bm && bd > new Date(2000, bm, 0).getDate()) return { error: `${MONTHS[bm - 1]} doesn't have ${bd} days.` };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "That email address doesn't look right." };

  const existing = id
    ? (await supabase.from("clients").select("name,phone,email,marketing_consent,consent_at,consent_source").eq("id", id).single()).data
    : null;

  // Look for likely duplicates: same cellphone, same email, or a similar name.
  if (!confirmed) {
    const first = name.split(" ")[0];
    const np = normPhone(phone);
    const ors = [`name.ilike.${first.replace(/[,()]/g, "")}%`];
    if (np) ors.push(`phone_norm.eq.${np}`);
    if (email) ors.push(`email.ilike.${email.replace(/[,()]/g, "")}`);
    const { data: cands } = await supabase.from("clients").select("id,name,phone,phone_norm,email").or(ors.join(",")).limit(50);
    const dups = (cands || [])
      .filter((c) => c.id !== id)
      .map((c) => {
        const why: string[] = [];
        if (np && c.phone_norm === np && (!existing || normPhone(existing.phone) !== np)) why.push("same cellphone");
        if (email && c.email?.toLowerCase() === email.toLowerCase() && (!existing || existing.email.toLowerCase() !== email.toLowerCase())) why.push("same email");
        if (namesSimilar(c.name, name) && (!existing || existing.name !== name)) why.push(c.name.toLowerCase() === name.toLowerCase() ? "same name" : "similar name");
        return { id: c.id, name: c.name, phone: c.phone, why };
      })
      .filter((d) => d.why.length);
    if (dups.length) return { dups };
  }

  const row = {
    name, phone, email,
    birth_month: bm || null, birth_day: bd || null,
    preferred_tech_id: String(form.get("preferred_tech_id") || "") || null,
    allergies: String(form.get("allergies") || "").trim(),
    notes: String(form.get("notes") || "").trim(),
    marketing_consent: consent,
    // Keep the original consent date and source; record new ones when consent is first given.
    consent_at: consent ? (existing?.marketing_consent && existing.consent_at) || new Date().toISOString() : null,
    consent_source: consent ? (existing?.marketing_consent && existing.consent_source) || "client form" : null,
  };

  let savedId = id;
  if (id) {
    const { error } = await supabase.from("clients").update(row).eq("id", id);
    if (error) return { error: "Couldn't save: " + error.message };
    const changed = existing ? (["name", "phone", "email", "marketing_consent"] as const).filter((k) => String(existing[k]) !== String(row[k])) : [];
    await logAct(supabase, staff, "Edited client", name + (changed.length ? ` (${changed.join(", ")})` : ""));
  } else {
    const { data, error } = await supabase.from("clients").insert({ ...row, created_by: staff.id }).select("id").single();
    if (error) return { error: "Couldn't save: " + error.message };
    savedId = data.id;
    await logAct(supabase, staff, "New client", name);
  }
  revalidatePath("/clients");
  redirect(`/clients/${savedId}?saved=1`);
}

export async function deleteClient(form: FormData) {
  const { supabase, staff } = await requirePerm("clients");
  const id = String(form.get("id"));
  const { data: c } = await supabase.from("clients").select("name").eq("id", id).single();
  const { error, count } = await supabase.from("clients").delete({ count: "exact" }).eq("id", id);
  if (error || !count) redirect(`/clients/${id}?error=delete`);
  await logAct(supabase, staff, "Deleted client", c?.name || id);
  revalidatePath("/clients");
  redirect("/clients?deleted=1");
}

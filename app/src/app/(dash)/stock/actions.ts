"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { logAct, requirePerm } from "@/lib/auth";
import { R } from "@/lib/settings";

export type ItemMsg = { error?: string; ok?: boolean } | null;

const money = (v: FormDataEntryValue | null) => Math.max(0, Math.round((parseFloat(String(v ?? "")) || 0) * 100) / 100);
const int = (v: FormDataEntryValue | null) => Math.trunc(parseFloat(String(v ?? "")) || 0);

export async function saveItem(_prev: ItemMsg, form: FormData): Promise<ItemMsg> {
  const { supabase, staff } = await requirePerm("stock");
  const id = String(form.get("id") || "") || null;
  const kind = String(form.get("kind")) === "product" ? "product" : "service";
  const name = String(form.get("name") || "").trim();
  if (!name) return { error: "Give it a name." };
  if (String(form.get("price") ?? "").trim() === "") return { error: "Enter a price." };
  const row = {
    kind, name,
    category: String(form.get("category") || "").trim(),
    code: kind === "product" ? String(form.get("code") || "").trim() : "",
    duration_min: kind === "service" ? Math.max(5, int(form.get("duration_min")) || 30) : null,
    cost: money(form.get("cost")),
    price: money(form.get("price")),
    reorder_at: kind === "product" ? Math.max(0, int(form.get("reorder_at"))) : 0,
    active: id ? form.get("active") === "on" : true,
  };

  let itemId = id;
  if (id) {
    const { data: old } = await supabase.rpc("items_with_cost").eq("id", id).single<{ price: number; cost: number; name: string }>();
    const { error } = await supabase.from("items").update(row).eq("id", id);
    if (error) return { error: "Couldn't save: " + error.message };
    const ch = old ? [old.price !== row.price && `price ${R(old.price)} → ${R(row.price)}`, old.cost !== row.cost && `cost ${R(old.cost)} → ${R(row.cost)}`].filter(Boolean) : [];
    await logAct(supabase, staff, kind === "service" ? "Edited service" : "Edited product", name + (ch.length ? ": " + ch.join(", ") : "") + (row.active ? "" : " (no longer sold)"));
  } else {
    const { data, error } = await supabase.from("items").insert({ ...row, qty: 0 }).select("id").single();
    if (error) return { error: "Couldn't add: " + error.message };
    itemId = data.id;
    const opening = kind === "product" ? Math.max(0, int(form.get("opening"))) : 0;
    if (opening) await supabase.rpc("adjust_stock", { p_item: itemId, p_change: opening, p_reason: "opening", p_note: "Opening stock" });
    await logAct(supabase, staff, kind === "service" ? "Added service" : "Added product", `${name} ${R(row.price)}${opening ? `, ${opening} in stock` : ""}`);
  }
  revalidatePath("/stock");
  if (!id) redirect(`/stock?added=${encodeURIComponent(name)}`);
  return { ok: true };
}

/** Deliveries, write-offs and stock counts. */
export async function changeStock(_prev: ItemMsg, form: FormData): Promise<ItemMsg> {
  const { supabase, staff } = await requirePerm("stock");
  const id = String(form.get("id"));
  const reason = String(form.get("reason"));
  const n = int(form.get("qty"));
  const note = String(form.get("note") || "").trim();
  if (!["delivery", "write_off", "count"].includes(reason)) return { error: "Choose what happened." };
  if (reason === "count" ? n < 0 || String(form.get("qty") ?? "") === "" : n <= 0) return { error: reason === "count" ? "Enter how many you counted." : "Enter how many." };
  if (reason === "write_off" && !note) return { error: "Add a reason for the write-off, e.g. damaged or used in the salon." };

  const { data: newQty, error } = await supabase.rpc("adjust_stock", {
    p_item: id,
    p_change: reason === "delivery" ? n : reason === "write_off" ? -n : 0,
    p_reason: reason,
    p_note: note,
    p_set_to: reason === "count" ? n : null,
  });
  if (error) return { error: error.message };
  const { data: it } = await supabase.from("items").select("name").eq("id", id).single();
  const label = { delivery: "Stock received", write_off: "Stock written off", count: "Stock counted" }[reason]!;
  await logAct(supabase, staff, label, `${it?.name}: ${reason === "count" ? `counted ${n}` : (reason === "delivery" ? "+" : "-") + n}, now ${newQty}${note ? ` (${note})` : ""}`);
  revalidatePath(`/stock/${id}`);
  revalidatePath("/stock");
  return { ok: true };
}

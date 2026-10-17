"use server";
import { revalidatePath } from "next/cache";
import { logAct, PERMS, requirePerm, ROLE_LABEL, type Role } from "@/lib/auth";

export async function updateStaff(_prev: string | null, form: FormData): Promise<string | null> {
  const { supabase, staff: me } = await requirePerm("settings");
  const id = String(form.get("id"));
  const name = String(form.get("name") || "").trim();
  const role = String(form.get("role")) as Role;
  const active = form.get("active") === "on";
  if (!name) return "Add a name.";
  if (!(role in ROLE_LABEL)) return "Choose a role.";
  if (id === me.id && (!active || role !== me.role)) return "You can't switch off or change the role of your own login. Ask another owner.";
  const perms = role === "owner" ? [] : PERMS.map((p) => p[0]).filter((k) => form.get("perm_" + k) === "on");
  const { data: before } = await supabase.from("staff").select("name,role,perms,active").eq("id", id).single();
  const { error } = await supabase.from("staff").update({ name, role, perms, active }).eq("id", id);
  if (error) return error.message.includes("owner") ? "There must always be at least one active owner." : "Couldn't save: " + error.message;
  await logAct(supabase, me, "Changed staff login",
    `${name}: ${before ? `${ROLE_LABEL[before.role as Role]}${before.active ? "" : " (off)"}` : "?"} → ${ROLE_LABEL[role]}${active ? "" : " (off)"}, ${perms.join("/") || "-"}`);
  revalidatePath("/staff");
  return "saved";
}

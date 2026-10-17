import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export * from "./perms";
import { can, type Staff } from "./perms";

/** Logged-in user and their staff record. Sends visitors to /login. */
export async function getSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: staff } = await supabase.from("staff").select("*").eq("id", user.id).maybeSingle<Staff>();
  return { supabase, user, staff };
}

/** For pages and actions that need an active staff member with a permission. */
export async function requirePerm(perm?: string) {
  const s = await getSession();
  if (!s.staff?.active) redirect("/");
  if (perm && !can(s.staff, perm)) redirect("/?denied=" + encodeURIComponent(perm));
  return s as typeof s & { staff: Staff };
}

/** Add a line to the activity log. Never blocks the action it describes. */
export async function logAct(
  supabase: Awaited<ReturnType<typeof createClient>>,
  staff: Staff,
  action: string,
  detail = "",
) {
  await supabase.from("activity_log").insert({ staff_id: staff.id, staff_name: staff.name, action, detail });
}

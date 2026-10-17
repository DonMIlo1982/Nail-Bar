import { NextResponse } from "next/server";
import { can, getSession, logAct } from "@/lib/auth";
import { csvCell, fmtBirthday } from "@/lib/clients";

/** Client list as CSV, for owners and anyone with the export permission. */
export async function GET() {
  const { supabase, staff } = await getSession();
  if (!staff || !can(staff, "clientExport")) return new NextResponse("You don't have permission to export clients.", { status: 403 });
  const [{ data: clients }, { data: techs }] = await Promise.all([
    supabase.from("clients").select("*").order("name"),
    supabase.from("technicians").select("id,name"),
  ]);
  const tn = Object.fromEntries((techs || []).map((t) => [t.id, t.name]));
  const rows = [
    ["Name", "Cellphone", "Email", "Birthday", "Usually sees", "Allergies", "Notes", "Opted in to specials", "Consent date", "Consent source", "Added"],
    ...(clients || []).map((c) => [
      c.name, c.phone, c.email, fmtBirthday(c.birth_month, c.birth_day), c.preferred_tech_id ? tn[c.preferred_tech_id] : "",
      c.allergies, c.notes, c.marketing_consent ? "Yes" : "No", c.consent_at?.slice(0, 10) || "", c.consent_source || "", c.created_at.slice(0, 10),
    ]),
  ];
  await logAct(supabase, staff, "Exported client list", `${clients?.length ?? 0} clients`);
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse("﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="spoilt-brat-clients-${date}.csv"`,
    },
  });
}

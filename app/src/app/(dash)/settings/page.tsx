import Link from "next/link";
import { requirePerm } from "@/lib/auth";
import type { Settings, Technician } from "@/lib/settings";
import { moveTechnician } from "./actions";
import { AddTech, BusinessForm, TechForm } from "./SettingsForms";

export default async function SettingsPage() {
  const { supabase } = await requirePerm("settings");
  const [{ data: s }, { data: techs }] = await Promise.all([
    supabase.from("settings").select("*").eq("id", 1).single<Settings>(),
    supabase.from("technicians").select("*").order("sort").order("name"),
  ]);
  const list = (techs || []) as Technician[];

  return (
    <main className="page narrow">
      <div className="head">
        <h1>Settings</h1>
        <div className="row"><Link href="/staff" className="btn">Staff logins</Link><Link href="/import" className="btn ghost">Import from POS</Link></div>
      </div>
      {s && <BusinessForm s={s} />}

      <div className="head"><h2>Technicians</h2></div>
      <div className="panel">
        <p className="muted small" style={{ marginTop: 0 }}>
          The colour marks each technician on the till and in the diary. Commission is worked out on what they sell, after discounts.
          Untick <b>Works here</b> when someone leaves: their past sales stay in the reports.
        </p>
        {list.map((t, i) => (
          <div key={t.id} className={`tech-line ${t.active ? "" : "inactive"}`}>
            <form action={moveTechnician} className="order">
              <input type="hidden" name="id" value={t.id} />
              <button name="dir" value="-1" disabled={i === 0} aria-label={`Move ${t.name} up`}>↑</button>
              <button name="dir" value="1" disabled={i === list.length - 1} aria-label={`Move ${t.name} down`}>↓</button>
            </form>
            <TechForm t={t} />
          </div>
        ))}
        {!list.length && <p className="muted">No technicians yet. Add the first one below.</p>}
        <div className="tech-line add"><AddTech /></div>
      </div>
    </main>
  );
}

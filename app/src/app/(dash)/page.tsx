import Link from "next/link";
import { can, getSession } from "@/lib/auth";
import { daysToBirthday, fmtBirthday, PERMS_LABEL } from "./helpers";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const { supabase, staff } = await getSession();
  const { denied } = await searchParams;
  const seeClients = can(staff, "clients");

  let total = 0, optedIn = 0;
  let upcoming: { id: string; name: string; when: number; birthday: string }[] = [];
  if (seeClients) {
    const { data } = await supabase.from("clients").select("id,name,birth_month,birth_day,marketing_consent");
    const rows = data || [];
    total = rows.length;
    optedIn = rows.filter((r) => r.marketing_consent).length;
    upcoming = rows
      .map((r) => ({ id: r.id, name: r.name, when: daysToBirthday(r.birth_month, r.birth_day), birthday: fmtBirthday(r.birth_month, r.birth_day) }))
      .filter((r): r is { id: string; name: string; when: number; birthday: string } => r.when !== null && r.when <= 14)
      .sort((a, b) => a.when - b.when);
  }

  return (
    <main className="page">
      {denied && <p className="notice warn">You don&apos;t have permission for that ({PERMS_LABEL[denied] || denied}). Ask the owner if you need it.</p>}
      <div className="head"><h1>Hello {staff?.name?.split(" ")[0]}</h1></div>
      {seeClients ? (
        <>
          <div className="stats">
            <div className="stat"><b>{total}</b><span>Clients</span></div>
            <div className="stat"><b>{optedIn}</b><span>Opted in to specials</span></div>
            <div className="stat"><b>{upcoming.length}</b><span>Birthdays in the next 14 days</span></div>
          </div>
          <div className="head"><h2>Birthdays coming up</h2><Link href="/clients" className="btn">Open clients</Link></div>
          {upcoming.length ? (
            <div className="bdays">
              {upcoming.map((b) => (
                <Link key={b.id} href={`/clients/${b.id}`} className={`bday ${b.when === 0 ? "today" : ""}`} style={{ color: "inherit", textDecoration: "none" }}>
                  <span className="when">{b.when === 0 ? "Today" : b.when === 1 ? "Tomorrow" : `In ${b.when} days`}</span>
                  <b style={{ display: "block" }}>{b.name}</b>
                  <span className="muted small">{b.birthday}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="muted">No client birthdays in the next 14 days.</p>
          )}
        </>
      ) : (
        <p className="muted">More of the salon system will appear here as it moves online.</p>
      )}
      <div className="head"><h2>What&apos;s online so far</h2></div>
      <div className="panel small">
        <p style={{ marginTop: 0 }}>This is the start of the online system. Staff logins and the client database are live. The till, diary, roster, vouchers, cash-up and reports move over next; until then, keep using the POS on the salon computer for those.</p>
      </div>
    </main>
  );
}

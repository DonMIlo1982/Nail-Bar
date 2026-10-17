import Link from "next/link";
import { can, requirePerm } from "@/lib/auth";
import { daysToBirthday, fmtBirthday, fmtDate, normPhone, waLink } from "@/lib/clients";

export default async function Clients({ searchParams }: { searchParams: Promise<{ q?: string; deleted?: string }> }) {
  const { supabase, staff } = await requirePerm("clients");
  const { q = "", deleted } = await searchParams;
  const term = q.trim();

  let query = supabase
    .from("clients")
    .select("id,name,phone,email,birth_month,birth_day,marketing_consent,preferred_tech_id,created_at")
    .order("name")
    .limit(500);
  if (term) {
    const safe = term.replace(/[,()%]/g, "");
    const digits = normPhone(term) || term.replace(/\D/g, "");
    query = query.or(
      [`name.ilike.%${safe}%`, `email.ilike.%${safe}%`, ...(digits.length >= 3 ? [`phone_norm.like.%${digits}%`] : [])].join(","),
    );
  }
  const [{ data: clients }, { data: techs }, { count }] = await Promise.all([
    query,
    supabase.from("technicians").select("id,name"),
    supabase.from("clients").select("id", { count: "exact", head: true }),
  ]);
  const techName = Object.fromEntries((techs || []).map((t) => [t.id, t.name]));

  const soon = term ? [] : (clients || [])
    .map((c) => ({ c, d: daysToBirthday(c.birth_month, c.birth_day) }))
    .filter((x): x is { c: (typeof x)["c"]; d: number } => x.d !== null && x.d <= 30)
    .sort((a, b) => a.d - b.d);
  const msg = (n: string) => `Happy birthday ${n.split(" ")[0]}! From all of us at Spoilt Brat, enjoy a little birthday treat on your next visit.`;

  return (
    <main className="page">
      {deleted && <p className="notice ok">Client deleted.</p>}
      <div className="head">
        <h1>Clients <span className="muted" style={{ fontWeight: 400 }}>({count ?? 0})</span></h1>
        <div className="row">
          {can(staff, "clientExport") && <a href="/clients/export" className="btn">Export CSV</a>}
          <Link href="/clients/new" className="btn primary">Add client</Link>
        </div>
      </div>

      {!term && (
        <>
          <div className="head"><h2>Birthdays in the next 30 days</h2></div>
          {soon.length ? (
            <div className="bdays">
              {soon.map(({ c, d }) => {
                const wa = c.marketing_consent ? waLink(c.phone, msg(c.name)) : null;
                return (
                  <div key={c.id} className={`bday ${d === 0 ? "today" : ""}`}>
                    <span className="when">{d === 0 ? "Birthday today" : d === 1 ? "Birthday tomorrow" : `Birthday in ${d} days`}</span>
                    <b style={{ display: "block" }}><Link href={`/clients/${c.id}`} style={{ color: "inherit" }}>{c.name}</Link></b>
                    <span className="muted small">{fmtBirthday(c.birth_month, c.birth_day)}</span>
                    <div className="row" style={{ marginTop: 8 }}>
                      {wa ? <a className="btn small" href={wa} target="_blank" rel="noopener">WhatsApp wishes</a>
                        : <span className="muted small">{c.marketing_consent ? "No cellphone saved" : "Not opted in to messages"}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="muted">No client birthdays in the next 30 days.</p>
          )}
        </>
      )}

      <div className="head">
        <h2>{term ? `Search results for “${term}”` : "All clients"}</h2>
        <form className="row" action="/clients">
          <input name="q" type="search" defaultValue={term} placeholder="Search name, cellphone or email" style={{ width: 280 }} aria-label="Search clients" />
          <button>Search</button>
          {term && <Link href="/clients" className="btn ghost">Clear</Link>}
        </form>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Name</th><th>Cellphone</th><th>Email</th><th>Birthday</th><th>Usually sees</th><th>Specials</th><th>Added</th></tr>
          </thead>
          <tbody>
            {(clients || []).map((c) => (
              <tr key={c.id}>
                <td><Link href={`/clients/${c.id}`}><b>{c.name}</b></Link></td>
                <td>{c.phone}</td>
                <td>{c.email}</td>
                <td>{fmtBirthday(c.birth_month, c.birth_day)}</td>
                <td>{c.preferred_tech_id ? techName[c.preferred_tech_id] : ""}</td>
                <td>{c.marketing_consent ? <span className="badge ok">Yes</span> : <span className="muted">No</span>}</td>
                <td className="muted">{fmtDate(c.created_at)}</td>
              </tr>
            ))}
            {!clients?.length && (
              <tr><td colSpan={7} className="muted">{term ? "No clients match your search." : "No clients yet. Add one, or bring them over from the POS under Import."}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {(clients?.length ?? 0) >= 500 && <p className="muted small">Showing the first 500. Search to find others.</p>}
    </main>
  );
}

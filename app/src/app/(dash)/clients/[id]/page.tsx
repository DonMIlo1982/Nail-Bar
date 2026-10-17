import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/auth";
import { fmtDate, type Client } from "@/lib/clients";
import { ClientForm } from "../ClientForm";
import { deleteClient } from "../actions";

export default async function ClientPage({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { supabase, staff } = await requirePerm("clients");
  const { id } = await params;
  const { saved, error } = await searchParams;
  const [{ data: client }, { data: techs }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).maybeSingle<Client>(),
    supabase.from("technicians").select("id,name").eq("active", true).order("sort"),
  ]);
  if (!client) notFound();
  const canDelete = staff.role === "owner" || staff.role === "manager";

  return (
    <main className="page narrow">
      <div className="head"><h1>{client.name}</h1><Link href="/clients" className="btn ghost">Back to clients</Link></div>
      {saved && <p className="notice ok">Saved.</p>}
      {error === "delete" && <p className="notice warn">Couldn&apos;t delete this client. Only an owner or manager can delete clients.</p>}
      {client.allergies && <p className="notice warn"><b>Allergies:</b> {client.allergies}</p>}
      <ClientForm client={client} techs={techs || []} />
      <p className="muted small">Added {fmtDate(client.created_at)} · last changed {fmtDate(client.updated_at)}. Visit history and spend will show here once the till moves online.</p>
      {canDelete && (
        <form action={deleteClient} className="row" style={{ marginTop: 16 }}>
          <input type="hidden" name="id" value={client.id} />
          <details>
            <summary className="danger" style={{ cursor: "pointer" }}>Delete this client</summary>
            <p className="small">Their contact details, birthday and notes will be removed for good.</p>
            <button className="danger">Yes, delete {client.name}</button>
          </details>
        </form>
      )}
    </main>
  );
}

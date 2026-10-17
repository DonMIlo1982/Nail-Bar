"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { MONTHS, type Client } from "@/lib/clients";
import { saveClient, type SaveState } from "./actions";

export function ClientForm({ client, techs }: { client?: Client; techs: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<SaveState, FormData>(saveClient, {});
  const [consent, setConsent] = useState(!!client?.marketing_consent);
  const dups = state.dups?.length ? state.dups : null;
  // After a warning, show what was typed rather than the saved values.
  const v = state.values;
  const dv = (key: string, saved: string | number | null | undefined) => (v ? v[key] ?? "" : saved ?? "");

  return (
    <form action={action} className="panel" key={v ? JSON.stringify(v) : "saved"}>
      {client && <input type="hidden" name="id" value={client.id} />}
      {state.error && <p className="err" role="alert">{state.error}</p>}
      {dups && (
        <div className="notice warn" role="alert">
          <b>Is this client already on the system?</b>
          <ul style={{ margin: "6px 0" }}>
            {dups.map((d) => (
              <li key={d.id}>
                <Link href={`/clients/${d.id}`}>{d.name}</Link>
                {d.phone ? ` (${d.phone})` : ""}: {d.why.join(", ")}
              </li>
            ))}
          </ul>
          If it&apos;s the same person, open the existing client instead. Otherwise press Save anyway.
          <input type="hidden" name="confirm_dups" value="1" />
        </div>
      )}
      <div className="grid2">
        <label className="fld span2">Full name
          <input name="name" defaultValue={dv("name", client?.name)} required autoComplete="off" />
        </label>
        <label className="fld">Cellphone
          <input name="phone" type="tel" defaultValue={dv("phone", client?.phone)} placeholder="082 123 4567" autoComplete="off" />
        </label>
        <label className="fld">Email
          <input name="email" type="email" defaultValue={dv("email", client?.email)} autoComplete="off" />
        </label>
        <label className="fld">Birthday day
          <select name="birth_day" defaultValue={dv("birth_day", client?.birth_day)}>
            <option value="">–</option>
            {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
          </select>
        </label>
        <label className="fld">Birthday month
          <select name="birth_month" defaultValue={dv("birth_month", client?.birth_month)}>
            <option value="">–</option>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </label>
        <label className="fld span2">Usually sees
          <select name="preferred_tech_id" defaultValue={dv("preferred_tech_id", client?.preferred_tech_id)}>
            <option value="">No preference</option>
            {techs.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <label className="fld span2">Allergies or sensitivities (staff only)
          <input name="allergies" defaultValue={dv("allergies", client?.allergies)} placeholder="e.g. acrylic sensitivity" autoComplete="off" />
        </label>
        <label className="fld span2">Notes
          <textarea name="notes" defaultValue={dv("notes", client?.notes)} placeholder="Favourite colours, nail shape, preferences" />
        </label>
      </div>
      <label className="check">
        <input type="checkbox" name="marketing_consent" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        Client agreed to receive birthday treats and specials
      </label>
      <p className="muted small" style={{ marginTop: -4 }}>
        {client?.marketing_consent && client.consent_at
          ? `Agreed on ${new Date(client.consent_at).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}${client.consent_source ? ` (${client.consent_source})` : ""}. `
          : ""}
        Only tick this if the client said yes. POPIA requires their permission before you send marketing.
      </p>
      <div className="row">
        <button className="primary" disabled={pending}>{pending ? "Saving…" : dups ? "Save anyway" : "Save client"}</button>
        <Link href={client ? `/clients/${client.id}` : "/clients"} className="btn ghost">Cancel</Link>
      </div>
    </form>
  );
}

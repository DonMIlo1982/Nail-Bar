"use client";
import { useActionState, useState } from "react";
import { DAYS, WEEK_ORDER, type Settings, type Technician } from "@/lib/settings";
import { saveSettings, saveTechnician, type FormMsg } from "./actions";

function Msg({ m }: { m: FormMsg }) {
  if (!m) return null;
  return m.error ? <p className="err" role="alert">{m.error}</p> : <span className="small" style={{ color: "var(--ok)" }}>Saved</span>;
}

export function BusinessForm({ s }: { s: Settings }) {
  const [msg, action, pending] = useActionState(saveSettings, null);
  const [vat, setVat] = useState(s.vat_registered);
  return (
    <form action={action} className="panel">
      <h2 style={{ marginBottom: 12 }}>Details on receipts</h2>
      <div className="grid2">
        <label className="fld">Business name<input name="business_name" defaultValue={s.business_name} /></label>
        <label className="fld">Phone<input name="phone" defaultValue={s.phone} /></label>
        <label className="fld span2">Address<input name="address" defaultValue={s.address} /></label>
        <label className="fld">Email<input name="email" type="email" defaultValue={s.email} /></label>
        <label className="fld">VAT number<input name="vat_no" defaultValue={s.vat_no} /></label>
        <label className="check span2">
          <input type="checkbox" name="vat_registered" checked={vat} onChange={(e) => setVat(e.target.checked)} />
          VAT registered (prices include 15% VAT, receipts become tax invoices)
        </label>
        <label className="fld span2">Message at the bottom of receipts<input name="receipt_footer" defaultValue={s.receipt_footer} /></label>
        <label className="fld">Gift vouchers are valid for (months)
          <input name="voucher_months" type="number" min={36} step={1} defaultValue={s.voucher_months} />
          <span className="small">At least 36 months, as the Consumer Protection Act requires.</span>
        </label>
      </div>

      <h2 style={{ margin: "18px 0 10px" }}>Opening hours</h2>
      <div className="hours">
        {WEEK_ORDER.map((i) => {
          const h = s.opening_hours[i] || { open: "08:00", close: "19:00", closed: false };
          return (
            <div key={i} className="hours-row">
              <span>{DAYS[i]}</span>
              <input type="time" step={900} name={`open_${i}`} defaultValue={h.open} aria-label={`${DAYS[i]} opens`} />
              <input type="time" step={900} name={`close_${i}`} defaultValue={h.close} aria-label={`${DAYS[i]} closes`} />
              <label className="check" style={{ margin: 0 }}><input type="checkbox" name={`closed_${i}`} defaultChecked={h.closed} />Closed</label>
            </div>
          );
        })}
      </div>
      <div className="row" style={{ marginTop: 14 }}>
        <button className="primary" disabled={pending}>{pending ? "Saving…" : "Save settings"}</button>
        <Msg m={msg} />
      </div>
    </form>
  );
}

export function TechForm({ t, onDone }: { t?: Technician; onDone?: () => void }) {
  const [msg, action, pending] = useActionState(async (p: FormMsg, f: FormData) => {
    const r = await saveTechnician(p, f);
    if (r?.ok && !t) onDone?.();
    return r;
  }, null);
  return (
    <form action={action} className="tech-form">
      {t && <input type="hidden" name="id" value={t.id} />}
      <input type="color" name="colour" defaultValue={t?.colour || "#C2185B"} aria-label="Colour" />
      <input name="name" defaultValue={t?.name} placeholder="Name" aria-label="Name" required />
      <label className="pct">Services<input name="comm_svc" type="number" min={0} max={100} step={0.5} defaultValue={t?.comm_svc ?? 0} />%</label>
      <label className="pct">Products<input name="comm_prod" type="number" min={0} max={100} step={0.5} defaultValue={t?.comm_prod ?? 0} />%</label>
      {t ? (
        <label className="check" style={{ margin: 0 }}><input type="checkbox" name="active" defaultChecked={t.active} />Works here</label>
      ) : <input type="hidden" name="active" value="on" />}
      <button className={t ? "" : "primary"} disabled={pending}>{pending ? "Saving…" : t ? "Save" : "Add technician"}</button>
      <Msg m={msg} />
    </form>
  );
}

export function AddTech() {
  const [key, setKey] = useState(0);
  return <TechForm key={key} onDone={() => setKey((k) => k + 1)} />;
}

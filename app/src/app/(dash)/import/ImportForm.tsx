"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { importBackup, type BackupPayload, type ImportResult } from "./actions";

export function ImportForm() {
  const [payload, setPayload] = useState<BackupPayload | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, start] = useTransition();

  async function read(file: File) {
    setError(""); setResult(null); setPayload(null); setFileName(file.name);
    try {
      const d = JSON.parse(await file.text());
      if (!Array.isArray(d.techs) || !Array.isArray(d.items)) throw new Error();
      // Send only what this stage uses, keeping the upload small.
      setPayload({
        techs: d.techs.map((t: any) => ({ id: t.id, name: t.name, color: t.color, commSvc: t.commSvc, commProd: t.commProd })),
        items: d.items.map((i: any) => ({ id: i.id, type: i.type, name: i.name, category: i.category, code: i.code, duration: i.duration, cost: i.cost, price: i.price, qty: i.qty, low: i.low })),
        clients: (d.clients || []).map((c: any) => ({
          id: c.id, name: c.name, phone: c.phone, email: c.email, birthday: c.birthday, preferredTech: c.preferredTech,
          allergies: c.allergies, notes: c.notes, consent: c.consent, consentDate: c.consentDate, consentSource: c.consentSource, created: c.created,
        })),
      });
    } catch {
      setError("That file isn't a Spoilt Brat POS backup. In the POS, use Settings → Download backup and choose that file.");
    }
  }

  return (
    <div className="panel">
      <label className="fld">Backup file
        <input type="file" accept=".json,application/json" onChange={(e) => e.target.files?.[0] && read(e.target.files[0])} />
      </label>
      {error && <p className="err" role="alert">{error}</p>}
      {payload && !result && (
        <>
          <p>In <b>{fileName}</b>: {payload.clients.length} clients, {payload.techs.length} technicians, {payload.items.length} services and products.</p>
          <button className="primary" disabled={pending} onClick={() => start(async () => {
            const r = await importBackup(payload);
            if (r.error) setError("The import stopped: " + r.error); else setResult(r);
          })}>{pending ? "Importing…" : "Import"}</button>
        </>
      )}
      {result && (
        <div className="notice ok" style={{ marginTop: 12 }}>
          Imported {result.clients} clients, {result.techs} technicians and {result.items} services and products.
          {result.skipped?.length ? ` Skipped: ${result.skipped.join(", ")}.` : ""} <Link href="/clients">Open clients</Link>
        </div>
      )}
    </div>
  );
}

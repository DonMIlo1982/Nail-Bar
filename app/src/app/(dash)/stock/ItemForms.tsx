"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { R } from "@/lib/settings";
import { changeStock, saveItem, type ItemMsg } from "./actions";

export interface Item {
  id: string; kind: "service" | "product"; name: string; category: string; code: string;
  duration_min: number | null; cost: number; price: number; qty: number; reorder_at: number; active: boolean;
}

export function ItemForm({ item, kind, categories }: { item?: Item; kind: "service" | "product"; categories: string[] }) {
  const [msg, action, pending] = useActionState<ItemMsg, FormData>(saveItem, null);
  const svc = kind === "service";
  const [cost, setCost] = useState(String(item?.cost ?? ""));
  const [price, setPrice] = useState(String(item?.price ?? ""));
  const p = parseFloat(price) || 0, c = parseFloat(cost) || 0;
  return (
    <form action={action} className="panel">
      {item && <input type="hidden" name="id" value={item.id} />}
      <input type="hidden" name="kind" value={kind} />
      {msg?.error && <p className="err" role="alert">{msg.error}</p>}
      <div className="grid2">
        <label className="fld span2">Name<input name="name" defaultValue={item?.name} required autoComplete="off" /></label>
        <label className="fld">Category
          <input name="category" defaultValue={item?.category} list="cats" autoComplete="off" placeholder={svc ? "e.g. Hands, Feet, Blow-dry" : "e.g. Nail care"} />
          <datalist id="cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
        </label>
        {svc ? (
          <label className="fld">Length (minutes)<input name="duration_min" type="number" min={5} step={5} defaultValue={item?.duration_min ?? 30} /></label>
        ) : (
          <label className="fld">Barcode or code<input name="code" defaultValue={item?.code} autoComplete="off" /></label>
        )}
        <label className="fld">{svc ? "Material cost (R)" : "Cost price (R)"}
          <input name="cost" type="number" min={0} step={0.01} value={cost} onChange={(e) => setCost(e.target.value)} />
        </label>
        <label className="fld">{svc ? "Price (R)" : "Retail price (R)"}
          <input name="price" type="number" min={0} step={0.01} value={price} onChange={(e) => setPrice(e.target.value)} required />
        </label>
        {!svc && (
          <>
            {!item && <label className="fld">Opening stock<input name="opening" type="number" min={0} step={1} defaultValue={0} /></label>}
            <label className="fld">Reorder when stock reaches<input name="reorder_at" type="number" min={0} step={1} defaultValue={item?.reorder_at ?? 2} /></label>
          </>
        )}
      </div>
      {p > 0 && <p className="muted small" style={{ marginTop: -4 }}>Profit {R(p - c)} each · margin {Math.round(((p - c) / p) * 100)}%</p>}
      {item && (
        <label className="check"><input type="checkbox" name="active" defaultChecked={item.active} />Still sold (untick to hide it from the till; past sales are kept)</label>
      )}
      <div className="row">
        <button className="primary" disabled={pending}>{pending ? "Saving…" : item ? "Save" : svc ? "Add service" : "Add product"}</button>
        <Link href="/stock" className="btn ghost">Back to stock</Link>
        {msg?.ok && <span className="small" style={{ color: "var(--ok)" }}>Saved</span>}
      </div>
    </form>
  );
}

export function StockChange({ item }: { item: Item }) {
  const [msg, action, pending] = useActionState<ItemMsg, FormData>(changeStock, null);
  const [reason, setReason] = useState("delivery");
  return (
    <form action={action} className="panel" key={msg?.ok ? item.qty : "form"}>
      <input type="hidden" name="id" value={item.id} />
      <h2 style={{ marginBottom: 6 }}>{item.qty} in stock</h2>
      {item.qty <= item.reorder_at && <p className="notice warn" style={{ margin: "6px 0 10px" }}>At or below the reorder level ({item.reorder_at}).</p>}
      {msg?.error && <p className="err" role="alert">{msg.error}</p>}
      <div className="seg-row" role="radiogroup" aria-label="What happened">
        {[["delivery", "Delivery received"], ["write_off", "Write off"], ["count", "Stock count"]].map(([k, l]) => (
          <label key={k} className={`seg-opt ${reason === k ? "on" : ""}`}>
            <input type="radio" name="reason" value={k} checked={reason === k} onChange={() => setReason(k)} />{l}
          </label>
        ))}
      </div>
      <div className="grid2" style={{ marginTop: 10 }}>
        <label className="fld">{reason === "count" ? "Number counted on the shelf" : reason === "write_off" ? "How many to write off" : "How many arrived"}
          <input name="qty" type="number" min={0} step={1} required />
        </label>
        <label className="fld">{reason === "write_off" ? "Reason" : "Note (optional)"}
          <input name="note" autoComplete="off" placeholder={reason === "write_off" ? "e.g. damaged, used in the salon" : reason === "delivery" ? "e.g. supplier invoice number" : ""} />
        </label>
      </div>
      <div className="row">
        <button className="primary" disabled={pending}>{pending ? "Saving…" : "Update stock"}</button>
        {msg?.ok && <span className="small" style={{ color: "var(--ok)" }}>Stock updated</span>}
      </div>
    </form>
  );
}

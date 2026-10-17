import Link from "next/link";
import { requirePerm } from "@/lib/auth";
import { R } from "@/lib/settings";
import type { Item } from "./ItemForms";

const margin = (i: Item) => (i.price > 0 ? Math.round(((i.price - i.cost) / i.price) * 100) + "%" : "–");

export default async function Stock({ searchParams }: { searchParams: Promise<{ added?: string; show?: string }> }) {
  const { supabase } = await requirePerm("stock");
  const { added, show } = await searchParams;
  const { data } = await supabase.rpc("items_with_cost");
  const all = (data || []) as Item[];
  const showAll = show === "all";
  const items = showAll ? all : all.filter((i) => i.active);
  const services = items.filter((i) => i.kind === "service");
  const products = items.filter((i) => i.kind === "product");
  const low = products.filter((p) => p.active && p.qty <= p.reorder_at);
  const hidden = all.length - all.filter((i) => i.active).length;

  return (
    <main className="page">
      {added && <p className="notice ok">{added} added.</p>}
      <div className="head">
        <h1>Services</h1>
        <div className="row">
          {hidden > 0 && <Link className="btn ghost" href={showAll ? "/stock" : "/stock?show=all"}>{showAll ? "Hide items no longer sold" : `Show ${hidden} no longer sold`}</Link>}
          <Link href="/stock/new?kind=service" className="btn primary">Add service</Link>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Service</th><th>Category</th><th className="n">Minutes</th><th className="n">Material cost</th><th className="n">Price</th><th className="n">Margin</th></tr></thead>
          <tbody>
            {services.map((i) => (
              <tr key={i.id} className={i.active ? "" : "muted"}>
                <td><Link href={`/stock/${i.id}`}><b>{i.name}</b></Link>{!i.active && <span className="badge off" style={{ marginLeft: 6 }}>Not sold</span>}</td>
                <td>{i.category}</td><td className="n">{i.duration_min}</td><td className="n">{R(i.cost)}</td><td className="n">{R(i.price)}</td><td className="n">{margin(i)}</td>
              </tr>
            ))}
            {!services.length && <tr><td colSpan={6} className="muted">No services yet. Add your price list with Add service.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="head">
        <h1>Retail products</h1>
        <Link href="/stock/new?kind=product" className="btn primary">Add product</Link>
      </div>
      {low.length > 0 && <p className="notice warn">Time to reorder: {low.map((p) => `${p.name} (${p.qty} left)`).join(", ")}.</p>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Product</th><th>Category</th><th>Code</th><th className="n">Cost price</th><th className="n">Retail price</th><th className="n">Margin</th><th className="n">In stock</th><th className="n">Value at cost</th></tr></thead>
          <tbody>
            {products.map((i) => (
              <tr key={i.id} className={i.active ? "" : "muted"}>
                <td><Link href={`/stock/${i.id}`}><b>{i.name}</b></Link>{!i.active && <span className="badge off" style={{ marginLeft: 6 }}>Not sold</span>}</td>
                <td>{i.category}</td><td>{i.code}</td><td className="n">{R(i.cost)}</td><td className="n">{R(i.price)}</td><td className="n">{margin(i)}</td>
                <td className="n">{i.qty}{i.active && i.qty <= i.reorder_at && <span className="badge" style={{ marginLeft: 6 }}>{i.qty <= 0 ? "Out" : "Reorder"}</span>}</td>
                <td className="n">{R(i.qty * i.cost)}</td>
              </tr>
            ))}
            {!products.length && <tr><td colSpan={8} className="muted">No products yet. Add retail items with Add product.</td></tr>}
            {products.length > 0 && (
              <tr><td colSpan={6}><b>Total stock on hand</b></td><td className="n"><b>{products.reduce((s, i) => s + i.qty, 0)}</b></td><td className="n"><b>{R(products.reduce((s, i) => s + i.qty * i.cost, 0))}</b></td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="muted small">Open a product to record deliveries, write-offs and stock counts. Sales will take stock off automatically once the till moves online.</p>
    </main>
  );
}

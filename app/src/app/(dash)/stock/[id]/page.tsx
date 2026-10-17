import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/auth";
import { ItemForm, StockChange, type Item } from "../ItemForms";

const REASON: Record<string, string> = { opening: "Opening stock", delivery: "Delivery", write_off: "Written off", count: "Stock count", sale: "Sold", refund: "Refunded" };

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requirePerm("stock");
  const { id } = await params;
  const { data } = await supabase.rpc("items_with_cost").eq("id", id).maybeSingle<Item>();
  if (!data) notFound();
  const item = data;
  const [{ data: cats }, { data: moves }] = await Promise.all([
    supabase.from("items").select("category").eq("kind", item.kind),
    item.kind === "product"
      ? supabase.from("stock_movements").select("*").eq("item_id", id).order("at", { ascending: false }).limit(50)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const categories = [...new Set((cats || []).map((d) => d.category).filter(Boolean))].sort();

  return (
    <main className="page narrow">
      <div className="head"><h1>{item.name}</h1></div>
      <ItemForm item={item} kind={item.kind} categories={categories} />
      {item.kind === "product" && (
        <>
          <div className="head"><h2>Stock</h2></div>
          <StockChange item={item} />
          <div className="head"><h2>Stock history</h2></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>When</th><th>What</th><th className="n">Change</th><th className="n">After</th><th>Note</th><th>By</th></tr></thead>
              <tbody>
                {(moves || []).map((m) => (
                  <tr key={m.id}>
                    <td>{new Date(m.at).toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                    <td>{REASON[m.reason] || m.reason}</td>
                    <td className="n" style={{ color: m.qty_change < 0 ? "var(--warn)" : "var(--ok)" }}>{m.qty_change > 0 ? "+" : ""}{m.qty_change}</td>
                    <td className="n">{m.qty_after}</td><td className="wrap">{m.note}</td><td>{m.staff_name}</td>
                  </tr>
                ))}
                {!moves?.length && <tr><td colSpan={6} className="muted">No stock changes yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}

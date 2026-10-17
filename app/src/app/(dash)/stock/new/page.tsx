import { requirePerm } from "@/lib/auth";
import { ItemForm } from "../ItemForms";

export default async function NewItem({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { supabase } = await requirePerm("stock");
  const kind = (await searchParams).kind === "product" ? "product" : "service";
  const { data } = await supabase.from("items").select("category").eq("kind", kind);
  const cats = [...new Set((data || []).map((d) => d.category).filter(Boolean))].sort();
  return (
    <main className="page narrow">
      <div className="head"><h1>{kind === "service" ? "Add a service" : "Add a product"}</h1></div>
      <ItemForm kind={kind} categories={cats} />
    </main>
  );
}

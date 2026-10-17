import Link from "next/link";
import { requirePerm } from "@/lib/auth";
import { ClientForm } from "../ClientForm";

export default async function NewClient() {
  const { supabase } = await requirePerm("clients");
  const { data: techs } = await supabase.from("technicians").select("id,name").eq("active", true).order("sort");
  return (
    <main className="page narrow">
      <div className="head"><h1>New client</h1><Link href="/clients" className="btn ghost">Back to clients</Link></div>
      <ClientForm techs={techs || []} />
    </main>
  );
}

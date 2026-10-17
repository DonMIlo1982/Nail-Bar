export default function Setup() {
  return (
    <main className="page narrow">
      <h1>Almost there</h1>
      <p>
        This dashboard isn&apos;t connected to its database yet. Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> from Supabase (Project Settings → API) to the app&apos;s settings,
        then reload this page.
      </p>
    </main>
  );
}

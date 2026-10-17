import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";

export const supabaseConfigured = () => !!SUPABASE_URL && !!SUPABASE_KEY;

/** Supabase client for server components, server actions and route handlers.
 *  It acts as the logged-in staff member, so the database security rules apply. */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    SUPABASE_URL!,
    SUPABASE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(list) {
          // Server components can't set cookies; the middleware refreshes them instead.
          try {
            list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {}
        },
      },
    },
  );
}

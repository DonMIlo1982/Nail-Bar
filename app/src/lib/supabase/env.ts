/** Supabase connection details. Newer projects call the public key "publishable";
 *  older ones call it "anon". Either works. Both are safe to expose: the database
 *  security rules decide what each login can see. */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

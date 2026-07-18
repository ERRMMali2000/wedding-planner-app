import { createBrowserClient } from "@supabase/ssr";

// Client-safe Supabase instance — used inside "use client" components.
// Reads NEXT_PUBLIC_ vars only (safe to ship to the browser).
// Accepts either NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (Supabase's newer name)
// or NEXT_PUBLIC_SUPABASE_ANON_KEY (the older/classic name) — whichever one
// you actually set in your host's env var settings will work.
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing Supabase env vars: set NEXT_PUBLIC_SUPABASE_URL and either " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return createBrowserClient(supabaseUrl, supabaseKey);
}

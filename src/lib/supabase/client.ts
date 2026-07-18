import { createBrowserClient } from "@supabase/ssr";

// Client-safe Supabase instance — used inside "use client" components.
// Reads NEXT_PUBLIC_ vars only (safe to ship to the browser).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

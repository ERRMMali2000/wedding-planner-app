import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server-side Supabase instance — used inside Server Components,
// Server Actions, and Route Handlers. Reads/writes the auth cookie.
// Accepts either NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (Supabase's newer name)
// or NEXT_PUBLIC_SUPABASE_ANON_KEY (the older/classic name).
export function createClient() {
  const cookieStore = cookies();
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

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // called from a Server Component with no writable cookie store;
          // safe to ignore since middleware refreshes the session anyway.
        }
      },
    },
  });
}

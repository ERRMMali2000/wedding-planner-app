"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;
        setError("Check your email to confirm your account, then sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/");
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald to-emerald-light p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <h1 className="font-serif text-2xl font-semibold text-emerald mb-1">Roshan &amp; Priyanka</h1>
        <p className="text-sm text-neutral-500 mb-6">Wedding planner sign in</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="text-xs uppercase tracking-wide text-neutral-500">Full name</label>
              <input
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 mt-1 text-sm"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          )}
          <div>
            <label className="text-xs uppercase tracking-wide text-neutral-500">Email</label>
            <input
              type="email"
              className="w-full border border-neutral-200 rounded-lg px-3 py-2 mt-1 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-neutral-500">Password</label>
            <input
              type="password"
              className="w-full border border-neutral-200 rounded-lg px-3 py-2 mt-1 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-emerald-light transition disabled:opacity-60"
          >
            {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        <button
          className="text-xs text-neutral-500 mt-4 underline"
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
        >
          {mode === "signup" ? "Already have an account? Sign in" : "New family member? Create an account"}
        </button>

        <p className="text-[11px] text-neutral-400 mt-4">
          New accounts default to the "Family" role. To grant Admin access, run the
          update statement at the bottom of <code>supabase/migrations/0002_seed.sql</code>{" "}
          from the Supabase SQL editor.
        </p>
      </div>
    </div>
  );
}

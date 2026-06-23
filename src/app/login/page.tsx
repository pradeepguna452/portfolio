"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center bg-slate-50 px-4 py-10 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
            Loading…
          </div>
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const search = useSearchParams();
  const next = useMemo(() => search.get("next") ?? "/daily-tracker", [search]);

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace(next);
    });
  }, [router, next]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }

      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4 py-10 flex items-center justify-center dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-indigo-100 bg-white/80 backdrop-blur-xl p-8 shadow-2xl shadow-indigo-500/10 dark:border-slate-800 dark:bg-slate-900/80">
        <div className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
          Life Dashboard
        </div>
        <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Sign in to your personal admin panel.
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <label className="block space-y-2">
            <div className="text-xs font-semibold tracking-wide text-slate-700 dark:text-slate-300">Email</div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 w-full rounded-xl border border-slate-200 bg-white/50 px-4 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-500"
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="block space-y-2">
            <div className="text-xs font-semibold tracking-wide text-slate-700 dark:text-slate-300">Password</div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 w-full rounded-xl border border-slate-200 bg-white/50 px-4 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-500"
              placeholder="••••••••"
              required
              minLength={8}
            />
          </label>

          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-600 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-400">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="h-12 w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-violet-500 hover:to-indigo-500 hover:shadow-indigo-500/40 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
          >
            {busy
              ? "Please wait…"
              : mode === "signup"
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
          {mode === "signin" ? (
            <>
              New here?{" "}
              <button
                className="font-semibold text-indigo-600 transition-colors hover:text-indigo-500 dark:text-indigo-400"
                onClick={() => setMode("signup")}
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                className="font-semibold text-indigo-600 transition-colors hover:text-indigo-500 dark:text-indigo-400"
                onClick={() => setMode("signin")}
              >
                Sign in
              </button>
            </>
          )}
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-xs leading-relaxed text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
          You’ll host the database free on Supabase. This app only uses your own
          account’s data.
        </div>
      </div>
    </div>
  );
}


"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionShell } from "@/components/SectionShell";
import { supabase } from "@/lib/supabase/client";

type BirthdayRow = {
  id: string;
  name: string;
  birthday: string;
  email: string | null;
  note: string | null;
};

export default function BirthdaysPage() {
  const [name, setName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<BirthdayRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => a.birthday.localeCompare(b.birthday));
  }, [rows]);

  async function load() {
    setError(null);
    setLoading(true);
    const { data, error: e } = await supabase
      .from("birthdays")
      .select("id,name,birthday,email,note")
      .order("birthday", { ascending: true });
    if (e) setError(e.message);
    setRows((data ?? []) as BirthdayRow[]);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setError(null);
      setLoading(true);
      const { data, error: e } = await supabase
        .from("birthdays")
        .select("id,name,birthday,email,note")
        .order("birthday", { ascending: true });
      if (cancelled) return;
      if (e) setError(e.message);
      setRows((data ?? []) as BirthdayRow[]);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not signed in");

      const { error: insertErr } = await supabase.from("birthdays").insert({
        user_id: userId,
        name,
        birthday,
        email: email.trim() ? email.trim() : null,
        note: note.trim() ? note.trim() : null,
      });
      if (insertErr) throw insertErr;

      setName("");
      setBirthday("");
      setEmail("");
      setNote("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add birthday");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setError(null);
    try {
      const { error: e } = await supabase.from("birthdays").delete().eq("id", id);
      if (e) throw e;
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SectionShell
      title="Birthdays"
      description="Store birthdays now; email alerts can be added later."
    >
      <form onSubmit={add} className="grid gap-3 sm:grid-cols-4 sm:items-end">
        <label className="block space-y-1 sm:col-span-1">
          <div className="text-xs font-medium text-slate-700 dark:text-slate-300">Name</div>
          <input
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-800"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John"
            required
          />
        </label>

        <label className="block space-y-1 sm:col-span-1">
          <div className="text-xs font-medium text-slate-700 dark:text-slate-300">Birthday</div>
          <input
            type="date"
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-800"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            required
          />
        </label>

        <label className="block space-y-1 sm:col-span-1">
          <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Email (optional)
          </div>
          <input
            type="email"
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-800"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="john@example.com"
          />
        </label>

        <div className="flex gap-2 sm:col-span-1">
          <button
            type="submit"
            disabled={busy}
            className="h-11 flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 text-sm font-bold text-white shadow-md shadow-indigo-500/20 transition-all hover:from-violet-500 hover:to-indigo-500 hover:shadow-lg hover:shadow-indigo-500/30 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
          >
            Add
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => load()}
            className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Refresh
          </button>
        </div>

        <label className="block space-y-1 sm:col-span-4">
          <div className="text-xs font-medium text-slate-700 dark:text-slate-300">Note (optional)</div>
          <input
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-800"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Gift ideas, etc."
          />
        </label>
      </form>

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-600 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-400">
          {error}
        </div>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-12 bg-slate-50/50 px-4 py-3 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:bg-slate-800/50 dark:text-slate-400">
          <div className="col-span-4">Name</div>
          <div className="col-span-3">Birthday</div>
          <div className="col-span-3">Email</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {loading ? (
          <div className="px-3 py-3 text-sm text-slate-500 dark:text-slate-400">Loading…</div>
        ) : sorted.length === 0 ? (
          <div className="px-3 py-3 text-sm text-slate-500 dark:text-slate-400">
            No birthdays yet.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {sorted.map((r) => (
              <li key={r.id} className="grid grid-cols-12 items-center gap-2 px-4 py-3 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                <div className="col-span-4 min-w-0">
                  <div className="truncate text-sm text-slate-900 dark:text-white">{r.name}</div>
                  {r.note ? (
                    <div className="truncate text-xs text-slate-500 dark:text-slate-400">{r.note}</div>
                  ) : null}
                </div>
                <div className="col-span-3 text-sm text-slate-700 dark:text-slate-300">{r.birthday}</div>
                <div className="col-span-3 truncate text-sm text-slate-700 dark:text-slate-300">
                  {r.email ?? "—"}
                </div>
                <div className="col-span-2 flex justify-end">
                  <button
                    onClick={() => remove(r.id)}
                    disabled={busy}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SectionShell>
  );
}


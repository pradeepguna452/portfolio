"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionShell } from "@/components/SectionShell";
import { supabase } from "@/lib/supabase/client";

type DailyEntryRow = {
  id: string;
  entry_date: string;
  mood: number | null;
  note: string | null;
};

export default function DailyTrackerPage() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [date, setDate] = useState(today);
  const [mood, setMood] = useState<string>("");
  const [note, setNote] = useState("");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<DailyEntryRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    setLoading(true);
    const { data, error: e } = await supabase
      .from("daily_entries")
      .select("id,entry_date,mood,note")
      .order("entry_date", { ascending: false })
      .limit(30);
    if (e) setError(e.message);
    setRows((data ?? []) as DailyEntryRow[]);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setError(null);
      setLoading(true);
      const { data, error: e } = await supabase
        .from("daily_entries")
        .select("id,entry_date,mood,note")
        .order("entry_date", { ascending: false })
        .limit(30);
      if (cancelled) return;
      if (e) setError(e.message);
      setRows((data ?? []) as DailyEntryRow[]);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not signed in");

      const moodValue =
        mood.trim() === "" ? null : Math.max(1, Math.min(10, Number(mood)));

      const { error: upsertErr } = await supabase.from("daily_entries").upsert(
        {
          user_id: userId,
          entry_date: date,
          mood: Number.isFinite(moodValue as number) ? moodValue : null,
          note: note.trim() ? note.trim() : null,
        },
        { onConflict: "user_id,entry_date" },
      );
      if (upsertErr) throw upsertErr;

      setMood("");
      setNote("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save entry");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SectionShell
      title="Daily tracker"
      description="Save a daily note (last 30 days shown)."
    >
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-6 sm:items-end">
        <label className="block space-y-1.5 sm:col-span-2">
          <div className="text-xs font-semibold tracking-wide text-slate-700 dark:text-slate-300">Date</div>
          <input
            type="date"
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-800"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </label>

        <label className="block space-y-1.5 sm:col-span-1">
          <div className="text-xs font-semibold tracking-wide text-slate-700 dark:text-slate-300">Mood (1–10)</div>
          <input
            inputMode="numeric"
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-800"
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            placeholder="7"
          />
        </label>

        <div className="flex gap-3 sm:col-span-3">
          <button
            type="submit"
            disabled={busy}
            className="h-11 flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 text-sm font-bold text-white shadow-md shadow-indigo-500/20 transition-all hover:from-violet-500 hover:to-indigo-500 hover:shadow-lg hover:shadow-indigo-500/30 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
          >
            Save
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

        <label className="block space-y-1.5 sm:col-span-6">
          <div className="text-xs font-semibold tracking-wide text-slate-700 dark:text-slate-300">Note</div>
          <textarea
            className="min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-800"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What happened today?"
          />
        </label>
      </form>

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-600 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-400">
          {error}
        </div>
      ) : null}

      <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-12 bg-slate-50/50 px-4 py-3 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:bg-slate-800/50 dark:text-slate-400">
          <div className="col-span-2">Date</div>
          <div className="col-span-1">Mood</div>
          <div className="col-span-9">Note</div>
        </div>

        {loading ? (
          <div className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">
            No entries yet.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {rows.map((r) => (
              <li key={r.id} className="grid grid-cols-12 gap-2 px-4 py-3 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                <div className="col-span-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  {r.entry_date}
                </div>
                <div className="col-span-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                  {r.mood ?? "—"}
                </div>
                <div className="col-span-9 text-sm text-slate-600 dark:text-slate-400">
                  {r.note ?? ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SectionShell>
  );
}


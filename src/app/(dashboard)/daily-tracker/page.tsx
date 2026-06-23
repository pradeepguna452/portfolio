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
      <form onSubmit={save} className="grid gap-3 sm:grid-cols-6 sm:items-end">
        <label className="block space-y-1 sm:col-span-2">
          <div className="text-xs font-medium text-zinc-700">Date</div>
          <input
            type="date"
            className="h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-400"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </label>

        <label className="block space-y-1 sm:col-span-1">
          <div className="text-xs font-medium text-zinc-700">Mood (1–10)</div>
          <input
            inputMode="numeric"
            className="h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-400"
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            placeholder="7"
          />
        </label>

        <div className="flex gap-2 sm:col-span-3">
          <button
            type="submit"
            disabled={busy}
            className="h-10 flex-1 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            Save
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => load()}
            className="h-10 rounded-lg border border-zinc-200 bg-white px-4 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
          >
            Refresh
          </button>
        </div>

        <label className="block space-y-1 sm:col-span-6">
          <div className="text-xs font-medium text-zinc-700">Note</div>
          <textarea
            className="min-h-24 w-full resize-y rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What happened today?"
          />
        </label>
      </form>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200">
        <div className="grid grid-cols-12 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-600">
          <div className="col-span-2">Date</div>
          <div className="col-span-1">Mood</div>
          <div className="col-span-9">Note</div>
        </div>

        {loading ? (
          <div className="px-3 py-3 text-sm text-zinc-600">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="px-3 py-3 text-sm text-zinc-600">
            No entries yet.
          </div>
        ) : (
          <ul className="divide-y divide-zinc-200">
            {rows.map((r) => (
              <li key={r.id} className="grid grid-cols-12 gap-2 px-3 py-2">
                <div className="col-span-2 text-sm text-zinc-700">
                  {r.entry_date}
                </div>
                <div className="col-span-1 text-sm text-zinc-700">
                  {r.mood ?? "—"}
                </div>
                <div className="col-span-9 text-sm text-zinc-900">
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


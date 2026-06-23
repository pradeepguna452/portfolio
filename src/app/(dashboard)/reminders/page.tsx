"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionShell } from "@/components/SectionShell";
import { supabase } from "@/lib/supabase/client";

type ReminderRow = {
  id: string;
  title: string;
  remind_at: string;
  done: boolean;
  note: string | null;
};

export default function RemindersPage() {
  const [title, setTitle] = useState("");
  const [remindAt, setRemindAt] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<ReminderRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => a.remind_at.localeCompare(b.remind_at));
  }, [rows]);

  async function load() {
    setError(null);
    setLoading(true);
    const { data, error: e } = await supabase
      .from("reminders")
      .select("id,title,remind_at,done,note")
      .order("remind_at", { ascending: true });
    if (e) setError(e.message);
    setRows((data ?? []) as ReminderRow[]);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setError(null);
      setLoading(true);
      const { data, error: e } = await supabase
        .from("reminders")
        .select("id,title,remind_at,done,note")
        .order("remind_at", { ascending: true });
      if (cancelled) return;
      if (e) setError(e.message);
      setRows((data ?? []) as ReminderRow[]);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function addReminder(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not signed in");

      const { error: insertErr } = await supabase.from("reminders").insert({
        user_id: userId,
        title,
        remind_at: new Date(remindAt).toISOString(),
        note: note.trim() ? note.trim() : null,
      });
      if (insertErr) throw insertErr;

      setTitle("");
      setRemindAt("");
      setNote("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add reminder");
    } finally {
      setBusy(false);
    }
  }

  async function toggleDone(id: string, done: boolean) {
    setBusy(true);
    setError(null);
    try {
      const { error: e } = await supabase
        .from("reminders")
        .update({ done })
        .eq("id", id);
      if (e) throw e;
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, done } : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setError(null);
    try {
      const { error: e } = await supabase.from("reminders").delete().eq("id", id);
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
      title="Reminders"
      description="Add important events and mark them done."
    >
      <form
        onSubmit={addReminder}
        className="grid gap-3 sm:grid-cols-3 sm:items-end"
      >
        <label className="block space-y-1 sm:col-span-1">
          <div className="text-xs font-medium text-zinc-700">Title</div>
          <input
            className="h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-400"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Pay rent"
            required
          />
        </label>

        <label className="block space-y-1 sm:col-span-1">
          <div className="text-xs font-medium text-zinc-700">Remind at</div>
          <input
            type="datetime-local"
            className="h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-400"
            value={remindAt}
            onChange={(e) => setRemindAt(e.target.value)}
            required
          />
        </label>

        <div className="flex gap-2 sm:col-span-1">
          <button
            type="submit"
            disabled={busy}
            className="h-10 flex-1 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            Add
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

        <label className="block space-y-1 sm:col-span-3">
          <div className="text-xs font-medium text-zinc-700">Note (optional)</div>
          <input
            className="h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-400"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Any details…"
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
          <div className="col-span-1">Done</div>
          <div className="col-span-5">Title</div>
          <div className="col-span-4">Time</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {loading ? (
          <div className="px-3 py-3 text-sm text-zinc-600">Loading…</div>
        ) : sorted.length === 0 ? (
          <div className="px-3 py-3 text-sm text-zinc-600">
            No reminders yet.
          </div>
        ) : (
          <ul className="divide-y divide-zinc-200">
            {sorted.map((r) => (
              <li key={r.id} className="grid grid-cols-12 items-center px-3 py-2">
                <div className="col-span-1">
                  <input
                    type="checkbox"
                    checked={r.done}
                    onChange={(e) => toggleDone(r.id, e.target.checked)}
                    disabled={busy}
                  />
                </div>
                <div className="col-span-5 min-w-0">
                  <div className="truncate text-sm text-zinc-900">{r.title}</div>
                  {r.note ? (
                    <div className="truncate text-xs text-zinc-500">{r.note}</div>
                  ) : null}
                </div>
                <div className="col-span-4 text-sm text-zinc-700">
                  {new Date(r.remind_at).toLocaleString()}
                </div>
                <div className="col-span-2 flex justify-end">
                  <button
                    onClick={() => remove(r.id)}
                    disabled={busy}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
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


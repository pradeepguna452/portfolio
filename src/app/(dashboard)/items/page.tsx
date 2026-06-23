"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionShell } from "@/components/SectionShell";
import { supabase } from "@/lib/supabase/client";

type ItemRow = {
  id: string;
  name: string;
  bought_on: string | null;
  expires_on: string | null;
  used_until: string | null;
  note: string | null;
};

function daysUntil(dateStr: string | null) {
  if (!dateStr) return null;
  const t0 = new Date();
  const t1 = new Date(dateStr + "T00:00:00");
  const ms = t1.getTime() - new Date(t0.toISOString().slice(0, 10)).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export default function ItemsPage() {
  const [name, setName] = useState("");
  const [boughtOn, setBoughtOn] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [usedUntil, setUsedUntil] = useState("");
  const [note, setNote] = useState("");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<ItemRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => (a.expires_on ?? "").localeCompare(b.expires_on ?? ""));
  }, [rows]);

  async function load() {
    setError(null);
    setLoading(true);
    const { data, error: e } = await supabase
      .from("items")
      .select("id,name,bought_on,expires_on,used_until,note")
      .order("expires_on", { ascending: true });
    if (e) setError(e.message);
    setRows((data ?? []) as ItemRow[]);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setError(null);
      setLoading(true);
      const { data, error: e } = await supabase
        .from("items")
        .select("id,name,bought_on,expires_on,used_until,note")
        .order("expires_on", { ascending: true });
      if (cancelled) return;
      if (e) setError(e.message);
      setRows((data ?? []) as ItemRow[]);
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

      const { error: insertErr } = await supabase.from("items").insert({
        user_id: userId,
        name,
        bought_on: boughtOn || null,
        expires_on: expiresOn || null,
        used_until: usedUntil || null,
        note: note.trim() ? note.trim() : null,
      });
      if (insertErr) throw insertErr;

      setName("");
      setBoughtOn("");
      setExpiresOn("");
      setUsedUntil("");
      setNote("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add item");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setError(null);
    try {
      const { error: e } = await supabase.from("items").delete().eq("id", id);
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
      title="Things bought / expiry"
      description="Track purchases and expiry. Items expiring soon are highlighted."
    >
      <form onSubmit={add} className="grid gap-3 sm:grid-cols-6 sm:items-end">
        <label className="block space-y-1 sm:col-span-2">
          <div className="text-xs font-medium text-slate-700 dark:text-slate-300">Name</div>
          <input
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-800"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Protein powder"
            required
          />
        </label>

        <label className="block space-y-1 sm:col-span-1">
          <div className="text-xs font-medium text-slate-700 dark:text-slate-300">Bought</div>
          <input
            type="date"
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-800"
            value={boughtOn}
            onChange={(e) => setBoughtOn(e.target.value)}
          />
        </label>

        <label className="block space-y-1 sm:col-span-1">
          <div className="text-xs font-medium text-slate-700 dark:text-slate-300">Expires</div>
          <input
            type="date"
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-800"
            value={expiresOn}
            onChange={(e) => setExpiresOn(e.target.value)}
          />
        </label>

        <label className="block space-y-1 sm:col-span-1">
          <div className="text-xs font-medium text-slate-700 dark:text-slate-300">Used until</div>
          <input
            type="date"
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-800"
            value={usedUntil}
            onChange={(e) => setUsedUntil(e.target.value)}
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
        </div>

        <label className="block space-y-1 sm:col-span-6">
          <div className="text-xs font-medium text-slate-700 dark:text-slate-300">Note (optional)</div>
          <input
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-800"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Any details…"
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
          <div className="col-span-4">Item</div>
          <div className="col-span-2">Bought</div>
          <div className="col-span-2">Expires</div>
          <div className="col-span-2">Days</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {loading ? (
          <div className="px-3 py-3 text-sm text-slate-500 dark:text-slate-400">Loading…</div>
        ) : sorted.length === 0 ? (
          <div className="px-3 py-3 text-sm text-slate-500 dark:text-slate-400">No items yet.</div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {sorted.map((r) => {
              const d = daysUntil(r.expires_on);
              const warn = d !== null && d <= 7;
              return (
                <li
                  key={r.id}
                  className={[
                    "grid grid-cols-12 items-center gap-2 px-4 py-3 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/20",
                    warn ? "bg-amber-50 dark:bg-amber-900/20" : "bg-white",
                  ].join(" ")}
                >
                  <div className="col-span-4 min-w-0">
                    <div className="truncate text-sm text-slate-900 dark:text-white">{r.name}</div>
                    {r.note ? (
                      <div className="truncate text-xs text-slate-500 dark:text-slate-400">{r.note}</div>
                    ) : null}
                  </div>
                  <div className="col-span-2 text-sm text-slate-700 dark:text-slate-300">
                    {r.bought_on ?? "—"}
                  </div>
                  <div className="col-span-2 text-sm text-slate-700 dark:text-slate-300">
                    {r.expires_on ?? "—"}
                  </div>
                  <div className="col-span-2 text-sm text-slate-700 dark:text-slate-300">
                    {d === null ? "—" : d}
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
              );
            })}
          </ul>
        )}
      </div>
    </SectionShell>
  );
}


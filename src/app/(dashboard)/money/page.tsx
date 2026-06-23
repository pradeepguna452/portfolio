"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionShell } from "@/components/SectionShell";
import { supabase } from "@/lib/supabase/client";

type TxRow = {
  id: string;
  tx_date: string;
  kind: "income" | "expense";
  category: string | null;
  amount: number;
  note: string | null;
};

export default function MoneyPage() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [txDate, setTxDate] = useState(today);
  const [kind, setKind] = useState<TxRow["kind"]>("expense");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<TxRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const monthKey = useMemo(() => txDate.slice(0, 7), [txDate]);
  const monthTotals = useMemo(() => {
    const income = rows
      .filter((r) => r.kind === "income" && r.tx_date.startsWith(monthKey))
      .reduce((s, r) => s + Number(r.amount), 0);
    const expense = rows
      .filter((r) => r.kind === "expense" && r.tx_date.startsWith(monthKey))
      .reduce((s, r) => s + Number(r.amount), 0);
    return { income, expense, net: income - expense };
  }, [rows, monthKey]);

  async function load() {
    setError(null);
    setLoading(true);
    const { data, error: e } = await supabase
      .from("money_transactions")
      .select("id,tx_date,kind,category,amount,note")
      .order("tx_date", { ascending: false })
      .limit(200);
    if (e) setError(e.message);
    setRows((data ?? []) as TxRow[]);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setError(null);
      setLoading(true);
      const { data, error: e } = await supabase
        .from("money_transactions")
        .select("id,tx_date,kind,category,amount,note")
        .order("tx_date", { ascending: false })
        .limit(200);
      if (cancelled) return;
      if (e) setError(e.message);
      setRows((data ?? []) as TxRow[]);
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

      const amt = Number(amount);
      if (!Number.isFinite(amt) || amt <= 0) {
        throw new Error("Amount must be a positive number");
      }

      const { error: insertErr } = await supabase
        .from("money_transactions")
        .insert({
          user_id: userId,
          tx_date: txDate,
          kind,
          category: category.trim() ? category.trim() : null,
          amount: amt,
          note: note.trim() ? note.trim() : null,
        });
      if (insertErr) throw insertErr;

      setCategory("");
      setAmount("");
      setNote("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add transaction");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setError(null);
    try {
      const { error: e } = await supabase
        .from("money_transactions")
        .delete()
        .eq("id", id);
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
      title="Money management"
      description="Track income/expense and see a simple monthly net."
    >
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/50 p-3">
          <div className="text-xs text-slate-500 dark:text-slate-400">Month</div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white">{monthKey}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/50 p-3">
          <div className="text-xs text-slate-500 dark:text-slate-400">Income</div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            {monthTotals.income.toFixed(2)}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/50 p-3">
          <div className="text-xs text-slate-500 dark:text-slate-400">Net</div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            {monthTotals.net.toFixed(2)}
          </div>
        </div>
      </div>

      <form onSubmit={add} className="grid gap-3 sm:grid-cols-6 sm:items-end">
        <label className="block space-y-1 sm:col-span-2">
          <div className="text-xs font-medium text-slate-700 dark:text-slate-300">Date</div>
          <input
            type="date"
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-800"
            value={txDate}
            onChange={(e) => setTxDate(e.target.value)}
            required
          />
        </label>

        <label className="block space-y-1 sm:col-span-1">
          <div className="text-xs font-medium text-slate-700 dark:text-slate-300">Type</div>
          <select
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-800"
            value={kind}
            onChange={(e) => setKind(e.target.value as TxRow["kind"])}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </label>

        <label className="block space-y-1 sm:col-span-1">
          <div className="text-xs font-medium text-slate-700 dark:text-slate-300">Amount</div>
          <input
            inputMode="decimal"
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-800"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="100.00"
            required
          />
        </label>

        <label className="block space-y-1 sm:col-span-2">
          <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Category (optional)
          </div>
          <input
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-800"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Food"
          />
        </label>

        <label className="block space-y-1 sm:col-span-4">
          <div className="text-xs font-medium text-slate-700 dark:text-slate-300">Note (optional)</div>
          <input
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-800"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Any details…"
          />
        </label>

        <div className="flex gap-2 sm:col-span-2">
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
      </form>

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-600 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-400">
          {error}
        </div>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-12 bg-slate-50/50 px-4 py-3 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:bg-slate-800/50 dark:text-slate-400">
          <div className="col-span-2">Date</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-2">Amount</div>
          <div className="col-span-4">Category / Note</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {loading ? (
          <div className="px-3 py-3 text-sm text-slate-500 dark:text-slate-400">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="px-3 py-3 text-sm text-slate-500 dark:text-slate-400">
            No transactions yet.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {rows.map((r) => (
              <li key={r.id} className="grid grid-cols-12 items-center gap-2 px-4 py-3 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                <div className="col-span-2 text-sm text-slate-700 dark:text-slate-300">{r.tx_date}</div>
                <div className="col-span-2 text-sm text-slate-700 dark:text-slate-300">{r.kind}</div>
                <div className="col-span-2 text-sm font-medium text-slate-900 dark:text-white">
                  {Number(r.amount).toFixed(2)}
                </div>
                <div className="col-span-4 min-w-0">
                  <div className="truncate text-sm text-slate-900 dark:text-white">
                    {r.category ?? "—"}
                  </div>
                  {r.note ? (
                    <div className="truncate text-xs text-slate-500 dark:text-slate-400">{r.note}</div>
                  ) : null}
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


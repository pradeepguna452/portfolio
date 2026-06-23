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
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <div className="text-xs text-zinc-600">Month</div>
          <div className="text-sm font-semibold text-zinc-900">{monthKey}</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <div className="text-xs text-zinc-600">Income</div>
          <div className="text-sm font-semibold text-zinc-900">
            {monthTotals.income.toFixed(2)}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <div className="text-xs text-zinc-600">Net</div>
          <div className="text-sm font-semibold text-zinc-900">
            {monthTotals.net.toFixed(2)}
          </div>
        </div>
      </div>

      <form onSubmit={add} className="grid gap-3 sm:grid-cols-6 sm:items-end">
        <label className="block space-y-1 sm:col-span-2">
          <div className="text-xs font-medium text-zinc-700">Date</div>
          <input
            type="date"
            className="h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-400"
            value={txDate}
            onChange={(e) => setTxDate(e.target.value)}
            required
          />
        </label>

        <label className="block space-y-1 sm:col-span-1">
          <div className="text-xs font-medium text-zinc-700">Type</div>
          <select
            className="h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-400"
            value={kind}
            onChange={(e) => setKind(e.target.value as TxRow["kind"])}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </label>

        <label className="block space-y-1 sm:col-span-1">
          <div className="text-xs font-medium text-zinc-700">Amount</div>
          <input
            inputMode="decimal"
            className="h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-400"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="100.00"
            required
          />
        </label>

        <label className="block space-y-1 sm:col-span-2">
          <div className="text-xs font-medium text-zinc-700">
            Category (optional)
          </div>
          <input
            className="h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-400"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Food"
          />
        </label>

        <label className="block space-y-1 sm:col-span-4">
          <div className="text-xs font-medium text-zinc-700">Note (optional)</div>
          <input
            className="h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-400"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Any details…"
          />
        </label>

        <div className="flex gap-2 sm:col-span-2">
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
      </form>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200">
        <div className="grid grid-cols-12 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-600">
          <div className="col-span-2">Date</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-2">Amount</div>
          <div className="col-span-4">Category / Note</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {loading ? (
          <div className="px-3 py-3 text-sm text-zinc-600">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="px-3 py-3 text-sm text-zinc-600">
            No transactions yet.
          </div>
        ) : (
          <ul className="divide-y divide-zinc-200">
            {rows.map((r) => (
              <li key={r.id} className="grid grid-cols-12 items-center px-3 py-2">
                <div className="col-span-2 text-sm text-zinc-700">{r.tx_date}</div>
                <div className="col-span-2 text-sm text-zinc-700">{r.kind}</div>
                <div className="col-span-2 text-sm font-medium text-zinc-900">
                  {Number(r.amount).toFixed(2)}
                </div>
                <div className="col-span-4 min-w-0">
                  <div className="truncate text-sm text-zinc-900">
                    {r.category ?? "—"}
                  </div>
                  {r.note ? (
                    <div className="truncate text-xs text-zinc-500">{r.note}</div>
                  ) : null}
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


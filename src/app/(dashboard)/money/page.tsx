"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { TrendingUp, TrendingDown, Wallet, Plus, ArrowDownRight, Tag } from "lucide-react";

type TxRow = {
  id: string;
  tx_date: string;
  kind: "income" | "expense";
  category: string | null;
  amount: number;
  note: string | null;
};

// Colors for expense distribution segments
const CATEGORY_COLORS = [
  "bg-violet-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-fuchsia-500",
  "bg-indigo-500",
];

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
  
  // Selected month for filtering view (YYYY-MM format)
  const [viewMonth, setViewMonth] = useState(() => today.slice(0, 7));

  // Options for the month dropdown
  const monthOptions = useMemo(() => {
    // Generate last 12 months for selector
    const opts = [];
    const curr = new Date();
    // Start from current month
    for(let i = 0; i < 12; i++) {
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, '0');
      const label = curr.toLocaleDateString("en-US", { month: 'long', year: 'numeric' });
      opts.push({ value: `${y}-${m}`, label });
      curr.setMonth(curr.getMonth() - 1);
    }
    return opts;
  }, []);

  async function load() {
    setError(null);
    setLoading(true);
    const { data, error: e } = await supabase
      .from("money_transactions")
      .select("id,tx_date,kind,category,amount,note")
      .order("tx_date", { ascending: false })
      .limit(500);
    if (e) setError(e.message);
    setRows((data ?? []) as TxRow[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  // Filter rows by selected month
  const monthRows = useMemo(() => {
    return rows.filter((r) => r.tx_date.startsWith(viewMonth));
  }, [rows, viewMonth]);

  const monthTotals = useMemo(() => {
    const income = monthRows
      .filter((r) => r.kind === "income")
      .reduce((s, r) => s + Number(r.amount), 0);
    const expense = monthRows
      .filter((r) => r.kind === "expense")
      .reduce((s, r) => s + Number(r.amount), 0);
    return { income, expense, net: income - expense };
  }, [monthRows]);

  // Calculate expense distribution
  const expenseDistribution = useMemo(() => {
    const expenses = monthRows.filter(r => r.kind === "expense");
    const totalExpense = expenses.reduce((s, r) => s + Number(r.amount), 0);
    
    if (totalExpense === 0) return [];

    const grouped = expenses.reduce((acc, curr) => {
      const cat = curr.category || "Uncategorized";
      acc[cat] = (acc[cat] || 0) + Number(curr.amount);
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .map(([cat, amt]) => ({
        category: cat,
        amount: amt,
        percentage: (amt / totalExpense) * 100
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [monthRows]);

  const recentLedger = monthRows.slice(0, 5);

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
      // Add the new item to the local state so we don't have to reload everything immediately,
      // but reloading is safer for ensuring we get the correct sorted order and ID.
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add transaction");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* HEADER GRID */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Capital Flow
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Monitor your monthly financial margins.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <select
            value={viewMonth}
            onChange={(e) => setViewMonth(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold shadow-sm outline-none transition-all hover:bg-slate-50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
          >
            {monthOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Inflow Card */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Inflow</div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              +${monthTotals.income.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Outflow Card */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Outflow</div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-zinc-600 dark:text-zinc-400">
              -${monthTotals.expense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Net Margin Card */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-900 p-6 shadow-sm dark:border-slate-800 dark:bg-black">
          <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
            <Wallet className="h-24 w-24 text-white" />
          </div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="text-sm font-medium text-slate-300">Net Margin</div>
            {monthTotals.net >= 0 ? (
              <div className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-500/30 backdrop-blur-sm">
                Healthy
              </div>
            ) : (
              <div className="rounded-full bg-rose-500/20 px-2.5 py-0.5 text-xs font-semibold text-rose-300 border border-rose-500/30 backdrop-blur-sm">
                Deficit
              </div>
            )}
          </div>
          <div className="relative z-10 mt-4 flex items-baseline gap-2">
            <span className={`text-3xl font-bold tracking-tight ${monthTotals.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {monthTotals.net >= 0 ? '+' : '-'}${Math.abs(monthTotals.net).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* VISUAL SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Expense Distribution */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col h-full">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Expense Distribution</h2>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
              Outflow Breakdown
            </span>
          </div>
          
          {expenseDistribution.length > 0 ? (
            <div className="space-y-8 flex-1">
              {/* Horizontal Segmented Bar */}
              <div className="flex h-6 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 ring-1 ring-inset ring-slate-200/50 dark:ring-slate-700/50">
                {expenseDistribution.map((item, idx) => (
                  <div
                    key={item.category}
                    style={{ width: `${item.percentage}%` }}
                    className={`h-full ${CATEGORY_COLORS[idx % CATEGORY_COLORS.length]} transition-all duration-500 hover:opacity-80`}
                    title={`${item.category}: $${item.amount} (${item.percentage.toFixed(1)}%)`}
                  />
                ))}
              </div>

              {/* Legend List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
                {expenseDistribution.map((item, idx) => (
                  <div key={item.category} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className={`h-3 w-3 rounded-full ${CATEGORY_COLORS[idx % CATEGORY_COLORS.length]} ring-2 ring-white dark:ring-slate-900`} />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate max-w-[120px] group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                        {item.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {item.percentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 min-h-[160px]">
              <span className="text-sm font-medium text-slate-500">No expenses this month.</span>
            </div>
          )}
        </div>

        {/* Right Column: Recent Ledger */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col h-full">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Recent Ledger</h2>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
              Latest {recentLedger.length} items
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 -mr-2">
            {loading ? (
               <div className="flex h-32 items-center justify-center">
                 <span className="text-sm font-medium text-slate-500 animate-pulse">Loading...</span>
               </div>
            ) : recentLedger.length > 0 ? (
              <ul className="space-y-4">
                {recentLedger.map((r) => (
                  <li key={r.id} className="flex items-center justify-between group rounded-2xl p-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 -mx-2 px-4">
                    <div className="flex items-center gap-4 min-w-0">
                      {/* Icon Container */}
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                        r.kind === 'income' 
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {r.kind === 'income' ? <ArrowDownRight className="h-5 w-5" /> : <Tag className="h-5 w-5" />}
                      </div>
                      
                      {/* Meta */}
                      <div className="flex flex-col min-w-0">
                        <span className="truncate text-sm font-bold text-slate-900 dark:text-white">
                          {r.category || (r.kind === 'income' ? 'Income' : 'Expense')}
                        </span>
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                          <span>{new Date(r.tx_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                          {r.note && (
                            <>
                              <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                              <span className="truncate max-w-[140px]">{r.note}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className={`text-sm font-bold whitespace-nowrap ml-4 ${
                      r.kind === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'
                    }`}>
                      {r.kind === 'income' ? '+' : '-'}${Number(r.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 min-h-[160px]">
                <span className="text-sm font-medium text-slate-500">No transactions yet.</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* NEW TRANSACTION FORM (Compact View) */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-6 text-lg font-bold text-slate-900 dark:text-white">Add Transaction</h2>
        
        <form onSubmit={add} className="grid gap-4 sm:grid-cols-6 sm:items-end">
          <label className="block space-y-1.5 sm:col-span-2">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</div>
            <input
              type="date"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800"
              value={txDate}
              onChange={(e) => setTxDate(e.target.value)}
              required
            />
          </label>

          <label className="block space-y-1.5 sm:col-span-1">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Type</div>
            <select
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800"
              value={kind}
              onChange={(e) => setKind(e.target.value as TxRow["kind"])}
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </label>

          <label className="block space-y-1.5 sm:col-span-1">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Amount</div>
            <input
              inputMode="decimal"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="100.00"
              required
            />
          </label>

          <label className="block space-y-1.5 sm:col-span-2">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Category
            </div>
            <input
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Groceries"
            />
          </label>

          <label className="block space-y-1.5 sm:col-span-4">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Note (Optional)</div>
            <input
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Any details…"
            />
          </label>

          <div className="flex sm:col-span-2">
            <button
              type="submit"
              disabled={busy}
              className="h-11 w-full rounded-xl bg-slate-900 px-4 text-sm font-bold text-white shadow-md shadow-slate-900/10 transition-all hover:bg-slate-800 hover:shadow-lg active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 dark:shadow-white/10 flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Transaction
            </button>
          </div>
        </form>

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-600 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-400">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}

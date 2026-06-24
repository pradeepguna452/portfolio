"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Package, Clock, ShieldAlert, Plus, Mail } from "lucide-react";

type ItemRow = {
  id: string;
  name: string;
  bought_on: string | null;
  expires_on: string | null;
  used_until: string | null;
  note: string | null;
  value: number;
  usage: string | null;
  notify_email: string | null;
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
  const [value, setValue] = useState("");
  const [usage, setUsage] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<ItemRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => (a.expires_on ?? "").localeCompare(b.expires_on ?? ""));
  }, [rows]);

  // Summaries
  const totalValue = useMemo(() => rows.reduce((s, r) => s + Number(r.value || 0), 0), [rows]);
  const expiringSoonCount = useMemo(() => rows.filter(r => {
    const d = daysUntil(r.expires_on);
    return d !== null && d >= 0 && d <= 7;
  }).length, [rows]);

  async function load() {
    setError(null);
    setLoading(true);
    const { data, error: e } = await supabase
      .from("items")
      // Handle the fact that new columns might not exist if user hasn't run migration yet.
      // But we will select them assuming they did. If it fails, we show the error.
      .select("id,name,bought_on,expires_on,used_until,note,value,usage,notify_email")
      .order("expires_on", { ascending: true });
    
    if (e) {
      setError(e.message + " (Did you run the SQL migration?)");
      setLoading(false);
      return;
    }
    setRows((data ?? []) as ItemRow[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not signed in");

      const itemValue = Number(value) || 0;

      const { error: insertErr } = await supabase.from("items").insert({
        user_id: userId,
        name,
        bought_on: boughtOn || null,
        expires_on: expiresOn || null,
        used_until: usedUntil || null,
        note: note.trim() ? note.trim() : null,
        value: itemValue,
        usage: usage.trim() ? usage.trim() : null,
        notify_email: notifyEmail.trim() ? notifyEmail.trim() : null,
      });
      if (insertErr) throw insertErr;

      // Send email notification if specified
      if (notifyEmail.trim()) {
        try {
          await fetch("/api/notify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: notifyEmail.trim(),
              itemName: name,
              expiresOn: expiresOn || "No expiry set",
              value: itemValue
            })
          });
        } catch (emailErr) {
          console.error("Failed to send email notification", emailErr);
          // We don't block the UI if email fails, but we could log it.
        }
      }

      setName("");
      setBoughtOn("");
      setExpiresOn("");
      setUsedUntil("");
      setNote("");
      setValue("");
      setUsage("");
      setNotifyEmail("");
      
      setSuccessMsg("Item added successfully!");
      setTimeout(() => setSuccessMsg(null), 3000);
      
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
    <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Asset & Inventory
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Track what you bought, its value, usage, and dead dates.
          </p>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Value */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Asset Value</div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Expiring Soon */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Expiring ≤ 7 Days</div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className={`text-3xl font-bold tracking-tight ${expiringSoonCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
              {expiringSoonCount}
            </span>
            <span className="text-sm text-slate-500">items</span>
          </div>
        </div>

        {/* Total Items */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Tracked Items</div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {rows.length}
            </span>
            <span className="text-sm text-slate-500">total</span>
          </div>
        </div>
      </div>

      {/* VISUAL SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Form (5 columns wide) */}
        <div className="lg:col-span-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900 h-fit">
          <h2 className="mb-6 text-lg font-bold text-slate-900 dark:text-white">Register New Asset</h2>
          
          <form onSubmit={add} className="space-y-4">
            
            <label className="block space-y-1.5">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">What they bought</div>
              <input
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="MacBook Pro"
                required
              />
            </label>

            <div className="grid grid-cols-2 gap-4">
              <label className="block space-y-1.5">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">When they bought</div>
                <input
                  type="date"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800"
                  value={boughtOn}
                  onChange={(e) => setBoughtOn(e.target.value)}
                />
              </label>

              <label className="block space-y-1.5">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Dead Date</div>
                <input
                  type="date"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800"
                  value={expiresOn}
                  onChange={(e) => setExpiresOn(e.target.value)}
                />
              </label>
            </div>

            <label className="block space-y-1.5">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Value of Product ($)</div>
              <input
                inputMode="decimal"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="2499.00"
              />
            </label>

            <label className="block space-y-1.5">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">How it can be used</div>
              <input
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800"
                value={usage}
                onChange={(e) => setUsage(e.target.value)}
                placeholder="Work and rendering"
              />
            </label>

            <label className="block space-y-1.5">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="h-3 w-3" /> Notify Email
              </div>
              <input
                type="email"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800"
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
                placeholder="admin@example.com"
              />
            </label>

            <button
              type="submit"
              disabled={busy}
              className="mt-2 h-11 w-full rounded-xl bg-slate-900 px-4 text-sm font-bold text-white shadow-md shadow-slate-900/10 transition-all hover:bg-slate-800 hover:shadow-lg active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 dark:shadow-white/10 flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Product
            </button>
          </form>

          {error && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-600 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-400">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-600 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400">
              {successMsg}
            </div>
          )}
        </div>

        {/* Right Column: Ledger (7 columns wide) */}
        <div className="lg:col-span-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col h-[700px]">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Asset Ledger</h2>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
              {rows.length} Tracking
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 -mr-2">
            {loading ? (
               <div className="flex h-32 items-center justify-center">
                 <span className="text-sm font-medium text-slate-500 animate-pulse">Loading...</span>
               </div>
            ) : sorted.length > 0 ? (
              <ul className="space-y-4">
                {sorted.map((r) => {
                  const d = daysUntil(r.expires_on);
                  const isExpired = d !== null && d < 0;
                  const isWarning = d !== null && d >= 0 && d <= 7;
                  
                  return (
                    <li key={r.id} className="group rounded-2xl border border-slate-100 bg-white p-4 transition-all hover:border-slate-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="truncate text-base font-bold text-slate-900 dark:text-white">
                              {r.name}
                            </span>
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                              ${Number(r.value || 0).toLocaleString()}
                            </span>
                          </div>
                          
                          {/* Dead Date Badge */}
                          <div className="mt-2 flex items-center gap-2">
                            {r.expires_on ? (
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold border ${
                                isExpired ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800' :
                                isWarning ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' :
                                'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                              }`}>
                                {isExpired ? `Expired ${Math.abs(d!)}d ago` :
                                 isWarning ? `Dead in ${d} days` :
                                 `Safe (${d} days left)`}
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                                No Dead Date
                              </span>
                            )}

                            {r.notify_email && (
                              <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                <Mail className="h-3 w-3" /> {r.notify_email}
                              </span>
                            )}
                          </div>

                          {/* Usage & Meta */}
                          <div className="mt-3 flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
                            {r.usage && (
                              <div><strong className="font-medium text-slate-600 dark:text-slate-300">Usage:</strong> {r.usage}</div>
                            )}
                            <div><strong className="font-medium text-slate-600 dark:text-slate-300">Bought:</strong> {r.bought_on || 'Unknown'}</div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="shrink-0 flex items-center gap-2">
                          <button
                            onClick={() => remove(r.id)}
                            disabled={busy}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-600 shadow-sm transition-all hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-rose-400 dark:hover:bg-rose-900/30 dark:hover:border-rose-800"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 min-h-[160px] h-full">
                <span className="text-sm font-medium text-slate-500">No items tracked yet.</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

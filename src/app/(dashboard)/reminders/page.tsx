"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Bell, AlertCircle, CheckCircle, Plus, CalendarClock, Trash2, Mail } from "lucide-react";

type ReminderRow = {
  id: string;
  title: string;
  remind_at: string;
  done: boolean;
  note: string | null;
  notify_email: string | null;
};

export default function RemindersPage() {
  const [title, setTitle] = useState("");
  const [remindAt, setRemindAt] = useState("");
  const [note, setNote] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<ReminderRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => a.remind_at.localeCompare(b.remind_at));
  }, [rows]);

  // Derived Statistics
  const now = new Date();
  const completed = useMemo(() => rows.filter(r => r.done), [rows]);
  const overdue = useMemo(() => rows.filter(r => !r.done && new Date(r.remind_at) < now), [rows, now]);
  const upcoming = useMemo(() => rows.filter(r => !r.done && new Date(r.remind_at) >= now), [rows, now]);

  async function load() {
    setError(null);
    setLoading(true);
    const { data, error: e } = await supabase
      .from("reminders")
      .select("id,title,remind_at,done,note,notify_email")
      .order("remind_at", { ascending: true });
    if (e) setError(e.message);
    setRows((data ?? []) as ReminderRow[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        notify_email: notifyEmail.trim() ? notifyEmail.trim() : null,
      });
      if (insertErr) throw insertErr;

      setTitle("");
      setRemindAt("");
      setNote("");
      setNotifyEmail("");
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
      // Optimistic update
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, done } : r)));
      
      const { error: e } = await supabase
        .from("reminders")
        .update({ done })
        .eq("id", id);
        
      if (e) throw e;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
      // Revert on failure
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setError(null);
    try {
      // Optimistic update
      setRows((prev) => prev.filter((r) => r.id !== id));
      
      const { error: e } = await supabase.from("reminders").delete().eq("id", id);
      if (e) throw e;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
      await load();
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
            Reminders
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Keep track of important tasks and deadlines.
          </p>
        </div>
        <button
            type="button"
            disabled={busy}
            onClick={() => load()}
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold shadow-sm transition-all hover:bg-slate-50 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
          >
            Refresh Data
        </button>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Overdue Card */}
        <div className="relative overflow-hidden rounded-3xl border border-rose-200 bg-rose-50/50 p-6 shadow-sm dark:border-rose-900/50 dark:bg-rose-950/20">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-rose-600 dark:text-rose-400">Overdue</div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
              {overdue.length}
            </span>
            <span className="text-sm text-rose-500">tasks</span>
          </div>
        </div>

        {/* Upcoming Card */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Upcoming</div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
              <Bell className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {upcoming.length}
            </span>
            <span className="text-sm text-slate-500">tasks</span>
          </div>
        </div>

        {/* Completed Card */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-900 p-6 shadow-sm dark:border-slate-800 dark:bg-black">
          <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
            <CheckCircle className="h-24 w-24 text-white" />
          </div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="text-sm font-medium text-slate-300">Completed</div>
            <div className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-500/30 backdrop-blur-sm">
              Done
            </div>
          </div>
          <div className="relative z-10 mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-emerald-400">
              {completed.length}
            </span>
            <span className="text-sm text-slate-400">tasks</span>
          </div>
        </div>
      </div>

      {/* VISUAL SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Form (4 columns wide) */}
        <div className="lg:col-span-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900 h-fit">
          <h2 className="mb-6 text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Plus className="h-5 w-5 text-indigo-500" />
            Create Task
          </h2>
          
          <form onSubmit={addReminder} className="space-y-4">
            <label className="block space-y-1.5">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Title</div>
              <input
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Pay electricity bill"
                required
              />
            </label>

            <label className="block space-y-1.5">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Remind At</div>
              <input
                type="datetime-local"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800"
                value={remindAt}
                onChange={(e) => setRemindAt(e.target.value)}
                required
              />
            </label>

            <label className="block space-y-1.5">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Note (optional)</div>
              <textarea
                rows={3}
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-medium outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Any additional details..."
              />
            </label>

            <label className="block space-y-1.5">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="h-3 w-3" /> Notify Email (1 Day Before)
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
              Add Reminder
            </button>
          </form>

          {error && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-600 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-400">
              {error}
            </div>
          )}
        </div>

        {/* Right Column: Interactive Timeline (8 columns wide) */}
        <div className="lg:col-span-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col h-[700px]">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-indigo-500" />
              Timeline
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-4">
            {loading ? (
               <div className="flex h-32 items-center justify-center">
                 <span className="text-sm font-medium text-slate-500 animate-pulse">Loading reminders...</span>
               </div>
            ) : sorted.length > 0 ? (
              <ul className="space-y-3">
                {sorted.map((r) => {
                  const rDate = new Date(r.remind_at);
                  const isOverdue = !r.done && rDate < now;
                  
                  return (
                    <li 
                      key={r.id} 
                      className={`group relative flex items-start gap-4 rounded-2xl border p-4 transition-all duration-300 ${
                        r.done 
                          ? 'border-slate-100 bg-slate-50/50 opacity-60 dark:border-slate-800 dark:bg-slate-900/50' 
                          : isOverdue
                            ? 'border-rose-200 bg-rose-50/30 dark:border-rose-900/30 dark:bg-rose-950/20 hover:shadow-md'
                            : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700'
                      }`}
                    >
                      {/* Checkbox Toggle */}
                      <button 
                        onClick={() => toggleDone(r.id, !r.done)}
                        disabled={busy}
                        className={`mt-1 shrink-0 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                          r.done 
                            ? 'border-emerald-500 bg-emerald-500 text-white' 
                            : isOverdue
                              ? 'border-rose-400 bg-transparent hover:bg-rose-100 dark:border-rose-600 dark:hover:bg-rose-900/50'
                              : 'border-slate-300 bg-transparent hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700'
                        }`}
                      >
                        {r.done && <CheckCircle className="h-4 w-4" />}
                      </button>

                      {/* Content */}
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className={`truncate text-base font-bold transition-all ${
                            r.done 
                              ? 'text-slate-500 line-through dark:text-slate-500' 
                              : isOverdue
                                ? 'text-rose-700 dark:text-rose-400'
                                : 'text-slate-900 dark:text-white'
                          }`}>
                            {r.title}
                          </span>
                          
                          <div className={`shrink-0 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                            r.done 
                              ? 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                              : isOverdue 
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400'
                                : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400'
                          }`}>
                            {rDate.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                          </div>
                        </div>

                        {r.notify_email && (
                          <div className="mt-1 flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                            <Mail className="h-3 w-3" /> Will notify: {r.notify_email}
                          </div>
                        )}

                        {r.note && (
                          <div className={`mt-2 text-sm ${r.done ? 'text-slate-400' : 'text-slate-600 dark:text-slate-400'}`}>
                            {r.note}
                          </div>
                        )}
                      </div>

                      {/* Delete Action (visible on hover or always on mobile) */}
                      <button
                        onClick={() => remove(r.id)}
                        disabled={busy}
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0 p-2 text-slate-400 hover:text-rose-600 transition-all dark:text-slate-500 dark:hover:text-rose-400"
                        title="Delete reminder"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 min-h-[160px] h-full">
                <span className="text-sm font-medium text-slate-500">No reminders created yet.</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

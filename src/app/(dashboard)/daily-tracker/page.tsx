"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionShell } from "@/components/SectionShell";
import { supabase } from "@/lib/supabase/client";
import { Droplets, Monitor, Cookie, Activity, Footprints, Moon, Plus, BarChart3, CheckSquare } from "lucide-react";

type GoalType = 'build' | 'quit';
type Frequency = 'daily' | 'weekly';

type Habit = {
  id: string;
  title: string;
  target: number;
  unit: string;
  goal_type: GoalType;
  frequency: Frequency;
  icon: string;
  color: string;
};

type HabitLog = {
  id: string;
  habit_id: string;
  log_date: string;
  progress_count: number;
};

type HabitWithProgress = Habit & {
  currentProgress: number;
  logId: string | null;
};

const ICONS: Record<string, React.FC<any>> = {
  water: Droplets,
  screen: Monitor,
  sweets: Cookie,
  activity: Activity,
  steps: Footprints,
  sleep: Moon,
};

const COLORS: Record<string, { ring: string; iconBg: string; iconText: string; stroke: string }> = {
  indigo: { ring: "stroke-indigo-500", iconBg: "bg-indigo-50 dark:bg-indigo-500/10", iconText: "text-indigo-500", stroke: "#6366f1" },
  blue: { ring: "stroke-blue-500", iconBg: "bg-blue-50 dark:bg-blue-500/10", iconText: "text-blue-500", stroke: "#3b82f6" },
  emerald: { ring: "stroke-emerald-500", iconBg: "bg-emerald-50 dark:bg-emerald-500/10", iconText: "text-emerald-500", stroke: "#10b981" },
  purple: { ring: "stroke-purple-500", iconBg: "bg-purple-50 dark:bg-purple-500/10", iconText: "text-purple-500", stroke: "#a855f7" },
  cyan: { ring: "stroke-cyan-500", iconBg: "bg-cyan-50 dark:bg-cyan-500/10", iconText: "text-cyan-500", stroke: "#06b6d4" },
  rose: { ring: "stroke-rose-500", iconBg: "bg-rose-50 dark:bg-rose-500/10", iconText: "text-rose-500", stroke: "#f43f5e" },
};

export default function HabitTrackerPage() {
  const [activeTab, setActiveTab] = useState<'tracker' | 'reports'>('tracker');

  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  
  // New habit form
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTarget, setNewTarget] = useState(1);
  const [newUnit, setNewUnit] = useState("times");
  const [newGoalType, setNewGoalType] = useState<GoalType>("build");
  const [newFrequency, setNewFrequency] = useState<Frequency>("daily");
  const [newIcon, setNewIcon] = useState("activity");
  const [newColor, setNewColor] = useState("indigo");
  
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const thisWeekStr = useMemo(() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - d.getUTCDay());
    return d.toISOString().slice(0, 10);
  }, []);

  const thirtyDaysAgoStr = useMemo(() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 30);
    return d.toISOString().slice(0, 10);
  }, []);

  const getLogDate = (freq: Frequency) => (freq === 'daily' ? todayStr : thisWeekStr);

  async function load() {
    setError(null);
    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not signed in");

      const [habRes, logRes] = await Promise.all([
        supabase.from("habits").select("*").order("created_at", { ascending: true }),
        supabase.from("habit_logs").select("*").gte("log_date", thirtyDaysAgoStr) // Fetch last 30 days
      ]);

      if (habRes.error) throw habRes.error;
      if (logRes.error) throw logRes.error;

      setHabits(habRes.data as Habit[]);
      setLogs(logRes.data as HabitLog[]);
    } catch (err: any) {
      if (err.message?.includes("relation")) {
        setError("Database tables missing. Please run the SQL script in Supabase.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => { if (!cancelled) await load(); })();
    return () => { cancelled = true; };
  }, []);

  async function createHabit(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user?.id) throw new Error("Not signed in");

      const { error: insertErr } = await supabase.from("habits").insert({
        user_id: userData.user.id,
        title: newTitle.trim(),
        target: newTarget,
        unit: newUnit,
        goal_type: newGoalType,
        frequency: newFrequency,
        icon: newIcon,
        color: newColor
      });
      if (insertErr) throw insertErr;

      setNewTitle("");
      setIsAdding(false);
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function incrementHabit(habit: HabitWithProgress) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user?.id) throw new Error("Not signed in");

      const log_date = getLogDate(habit.frequency);
      const newProgress = Math.min(habit.currentProgress + 1, habit.target);
      
      const finalProgress = habit.currentProgress >= habit.target ? 0 : newProgress;

      if (habit.logId) {
        if (finalProgress === 0) {
          await supabase.from("habit_logs").delete().eq("id", habit.logId);
        } else {
          await supabase.from("habit_logs").update({ progress_count: finalProgress }).eq("id", habit.logId);
        }
      } else {
        if (finalProgress > 0) {
          await supabase.from("habit_logs").insert({
            user_id: userData.user.id,
            habit_id: habit.id,
            log_date: log_date,
            progress_count: finalProgress
          });
        }
      }
      
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteHabit(id: string) {
    if (!confirm("Are you sure you want to delete this habit completely?")) return;
    setBusy(true);
    try {
      await supabase.from("habits").delete().eq("id", id);
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // Generate data for current tracker
  const habitData: HabitWithProgress[] = habits.map(h => {
    const logDate = getLogDate(h.frequency);
    const log = logs.find(l => l.habit_id === h.id && l.log_date === logDate);
    return {
      ...h,
      currentProgress: log ? log.progress_count : 0,
      logId: log ? log.id : null
    };
  });

  const daily = habitData.filter(h => h.frequency === 'daily');
  const weekly = habitData.filter(h => h.frequency === 'weekly');

  // Calculate overall daily progress percentage
  const totalDailyTarget = daily.reduce((sum, h) => sum + h.target, 0);
  const totalDailyProgress = daily.reduce((sum, h) => sum + Math.min(h.currentProgress, h.target), 0);
  const progressPercentage = totalDailyTarget === 0 ? 0 : Math.round((totalDailyProgress / totalDailyTarget) * 100);

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  return (
    <SectionShell
      title="Habit Tracker"
      description="Track daily habits, weekly goals, and view your historical reports."
    >
      <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl w-full max-w-sm mb-8">
        <button 
          onClick={() => setActiveTab('tracker')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 text-sm font-bold rounded-lg transition-all ${activeTab === 'tracker' ? 'bg-white text-slate-900 shadow dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
        >
          <CheckSquare className="w-4 h-4" /> Tracker
        </button>
        <button 
          onClick={() => setActiveTab('reports')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 text-sm font-bold rounded-lg transition-all ${activeTab === 'reports' ? 'bg-white text-slate-900 shadow dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
        >
          <BarChart3 className="w-4 h-4" /> Reports
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-600 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-400 mb-6">
          {error}
        </div>
      )}

      {loading && <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">Loading data...</div>}

      {!loading && activeTab === 'tracker' && (
        <div className="space-y-8 max-w-2xl pb-20">
          
          {/* Hero Circular Progress */}
          <div className="flex flex-col items-center justify-center pt-4 pb-4">
            <div className="relative flex items-center justify-center">
              <svg className="w-48 h-48 transform -rotate-90">
                <circle className="text-slate-100 dark:text-slate-800" strokeWidth="16" stroke="currentColor" fill="transparent" r={radius} cx="96" cy="96" />
                <circle 
                  className="text-purple-600 transition-all duration-1000 ease-out" 
                  strokeWidth="16" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} 
                  strokeLinecap="round" stroke="currentColor" fill="transparent" r={radius} cx="96" cy="96" 
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <div className="text-5xl font-black text-slate-900 dark:text-white">
                  {progressPercentage}<span className="text-2xl text-slate-500">%</span>
                </div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Today</div>
              </div>
            </div>
          </div>

          <HabitGroup title="Today" habits={daily} onIncrement={incrementHabit} onDelete={deleteHabit} busy={busy} />
          <HabitGroup title="Weekly goals" habits={weekly} onIncrement={incrementHabit} onDelete={deleteHabit} busy={busy} />

          {!isAdding && (
            <button 
              onClick={() => setIsAdding(true)}
              className="w-full py-4 mt-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
            >
              <Plus className="w-5 h-5" /> Add New Habit
            </button>
          )}

          {isAdding && (
            <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4">New Habit</h3>
              <form onSubmit={createHabit} className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5 sm:col-span-2">
                  <div className="text-xs font-semibold tracking-wide text-slate-700 dark:text-slate-300">Habit Name</div>
                  <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-indigo-500 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white" required placeholder="Drink water" />
                </label>
                
                <label className="block space-y-1.5">
                  <div className="text-xs font-semibold tracking-wide text-slate-700 dark:text-slate-300">Target Amount</div>
                  <input type="number" min="1" value={newTarget} onChange={e => setNewTarget(Number(e.target.value))} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-indigo-500 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white" required />
                </label>
                
                <label className="block space-y-1.5">
                  <div className="text-xs font-semibold tracking-wide text-slate-700 dark:text-slate-300">Unit</div>
                  <input type="text" value={newUnit} onChange={e => setNewUnit(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-indigo-500 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white" required placeholder="glasses" />
                </label>

                <label className="block space-y-1.5">
                  <div className="text-xs font-semibold tracking-wide text-slate-700 dark:text-slate-300">Goal Type</div>
                  <select value={newGoalType} onChange={e => setNewGoalType(e.target.value as GoalType)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-indigo-500 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                    <option value="build">Build (Positive Goal)</option>
                    <option value="quit">Quit (Maximum Limit)</option>
                  </select>
                </label>

                <label className="block space-y-1.5">
                  <div className="text-xs font-semibold tracking-wide text-slate-700 dark:text-slate-300">Frequency</div>
                  <select value={newFrequency} onChange={e => setNewFrequency(e.target.value as Frequency)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-indigo-500 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </label>

                <label className="block space-y-1.5">
                  <div className="text-xs font-semibold tracking-wide text-slate-700 dark:text-slate-300">Icon</div>
                  <select value={newIcon} onChange={e => setNewIcon(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-indigo-500 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                    <option value="water">Water Drop</option>
                    <option value="screen">Screen / Media</option>
                    <option value="sweets">Sweets / Food</option>
                    <option value="activity">Activity</option>
                    <option value="steps">Steps</option>
                    <option value="sleep">Sleep</option>
                  </select>
                </label>

                <label className="block space-y-1.5">
                  <div className="text-xs font-semibold tracking-wide text-slate-700 dark:text-slate-300">Color</div>
                  <select value={newColor} onChange={e => setNewColor(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-indigo-500 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                    <option value="blue">Blue</option>
                    <option value="indigo">Indigo</option>
                    <option value="emerald">Emerald</option>
                    <option value="purple">Purple</option>
                    <option value="cyan">Cyan</option>
                    <option value="rose">Rose</option>
                  </select>
                </label>

                <div className="sm:col-span-2 flex gap-3 mt-4">
                  <button type="submit" disabled={busy} className="h-11 flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 font-bold text-white shadow-md active:scale-[0.98]">Create Habit</button>
                  <button type="button" onClick={() => setIsAdding(false)} className="h-11 px-6 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">Cancel</button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {!loading && activeTab === 'reports' && (
        <div className="space-y-10 max-w-3xl">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">Last 30 Days</h2>
            {habits.length === 0 && (
              <div className="text-sm text-slate-500">No habits created yet.</div>
            )}
            
            <div className="space-y-6">
              {habits.filter(h => h.frequency === 'daily').map(habit => (
                <ActivityReport key={habit.id} habit={habit} logs={logs.filter(l => l.habit_id === habit.id)} />
              ))}
            </div>

            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mt-12 mb-6">Weekly Goals Overview</h2>
            <div className="space-y-4">
              {habits.filter(h => h.frequency === 'weekly').map(habit => {
                const habitLogs = logs.filter(l => l.habit_id === habit.id);
                const totalCompletions = habitLogs.reduce((sum, l) => sum + l.progress_count, 0);
                const colorTheme = COLORS[habit.color] || COLORS.indigo;

                return (
                  <div key={habit.id} className="p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 dark:text-white">{habit.title}</span>
                      <span className="text-xs text-slate-500">Target: {habit.target} {habit.unit} / week</span>
                    </div>
                    <div className={`text-xl font-black ${colorTheme.iconText}`}>
                      {totalCompletions} <span className="text-sm font-medium text-slate-400">logged in 30 days</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </SectionShell>
  );
}

function HabitGroup({ title, habits, onIncrement, onDelete, busy }: { title: string, habits: HabitWithProgress[], onIncrement: (h: HabitWithProgress) => void, onDelete: (id: string) => void, busy: boolean }) {
  if (habits.length === 0) return null;

  return (
    <div className="space-y-4 mt-8">
      {title && <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">{title}</h2>}
      <div className="space-y-4">
        {habits.map(habit => {
          const IconComponent = ICONS[habit.icon] || Activity;
          const colorTheme = COLORS[habit.color] || COLORS.indigo;
          
          const r = 20;
          const circ = 2 * Math.PI * r;
          const pct = Math.min(habit.currentProgress / habit.target, 1);
          const offset = circ - pct * circ;

          return (
            <div key={habit.id} className="group flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
              
              <div className="flex items-center gap-5">
                <div className={`w-12 h-12 flex items-center justify-center rounded-2xl ${colorTheme.iconBg} ${colorTheme.iconText}`}>
                  <IconComponent className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">{habit.title}</h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                    {habit.goal_type === 'build' ? 'Goal' : 'Maximum'}: {habit.target} {habit.unit}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={() => onDelete(habit.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-slate-300 hover:text-rose-500"
                  title="Delete habit"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <button 
                  onClick={() => onIncrement(habit)}
                  disabled={busy}
                  className="relative w-14 h-14 flex items-center justify-center active:scale-95 transition-transform disabled:opacity-70"
                >
                  <svg className="w-full h-full transform -rotate-90 absolute inset-0">
                    <circle className="text-slate-100 dark:text-slate-800" strokeWidth="4" stroke="currentColor" fill="transparent" r={r} cx="28" cy="28" />
                    <circle 
                      className="transition-all duration-500 ease-out"
                      strokeWidth="4" 
                      strokeDasharray={circ} 
                      strokeDashoffset={offset} 
                      strokeLinecap="round" 
                      stroke={colorTheme.stroke} 
                      fill="transparent" 
                      r={r} cx="28" cy="28" 
                    />
                  </svg>
                  <span className={`text-sm font-black z-10 ${habit.currentProgress >= habit.target ? colorTheme.iconText : 'text-slate-900 dark:text-white'}`}>
                    {habit.currentProgress}
                  </span>
                </button>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActivityReport({ habit, logs }: { habit: Habit, logs: HabitLog[] }) {
  const IconComponent = ICONS[habit.icon] || Activity;
  const colorTheme = COLORS[habit.color] || COLORS.indigo;

  // Generate last 21 days for the visual chart
  const days = [];
  for (let i = 20; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  // Calculate success rate over these 21 days
  let hits = 0;
  days.forEach(d => {
    const log = logs.find(l => l.log_date === d);
    if (log && log.progress_count >= habit.target) hits++;
  });
  const rate = Math.round((hits / 21) * 100);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 flex items-center justify-center rounded-xl ${colorTheme.iconBg} ${colorTheme.iconText}`}>
            <IconComponent className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">{habit.title}</h3>
            <div className="text-xs text-slate-500 dark:text-slate-400">Target: {habit.target} {habit.unit}/day</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-slate-900 dark:text-white">{rate}%</div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">3-Week Score</div>
        </div>
      </div>
      
      <div className="flex gap-1.5 sm:gap-2">
        {days.map(d => {
          const log = logs.find(l => l.log_date === d);
          const progress = log ? log.progress_count : 0;
          let intensity = "bg-slate-100 dark:bg-slate-800"; // Empty
          if (progress > 0) {
            const pct = progress / habit.target;
            if (pct >= 1) intensity = `bg-${habit.color}-500`; // Full
            else if (pct >= 0.5) intensity = `bg-${habit.color}-400 opacity-80`; // Half
            else intensity = `bg-${habit.color}-300 opacity-60`; // Little
          }
          return (
            <div 
              key={d} 
              title={`${d}: ${progress}/${habit.target}`}
              className={`flex-1 aspect-square rounded-sm sm:rounded-md ${intensity} transition-colors hover:ring-2 hover:ring-slate-300 dark:hover:ring-slate-600`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-2 px-1">
        <span>3 Wks Ago</span>
        <span>Today</span>
      </div>
    </div>
  );
}

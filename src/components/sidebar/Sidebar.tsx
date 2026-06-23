"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "./nav";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white/50 p-4 backdrop-blur-xl sm:block dark:border-slate-800 dark:bg-slate-900/50">
      <div className="flex items-center justify-between px-2">
        <div className="text-lg font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent dark:from-violet-400 dark:to-indigo-400">
          Life Dashboard
        </div>
        <div className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
          PERSONAL
        </div>
      </div>

      <nav className="mt-8 space-y-1">
        {navItems.map((item) => {
          const active =
            pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-indigo-500/20"
                  : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400",
              ].join(" ")}
            >
              <Icon size={18} className={active ? "text-white" : "opacity-80"} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-4 shadow-sm dark:border-slate-800 dark:from-slate-800/50 dark:to-slate-900">
        <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
          Built for growth
        </div>
        <div className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
          Add or edit modules anytime — this admin panel is designed to scale with your life.
        </div>
      </div>
    </aside>
  );
}


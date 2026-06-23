"use client";

import { usePathname } from "next/navigation";
import { navItems } from "@/components/sidebar/nav";

function titleFromPath(pathname: string | null) {
  const match = navItems.find((i) => i.href === pathname);
  if (match) return match.label;
  const starts = navItems.find((i) => pathname?.startsWith(`${i.href}/`));
  return starts?.label ?? "Dashboard";
}

export function Topbar() {
  const pathname = usePathname();
  const title = titleFromPath(pathname);

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/70 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/70">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="min-w-0">
          <div className="truncate text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            {title}
          </div>
          <div className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
            Your personal admin panel
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold tracking-wide text-emerald-700 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-500/10 dark:text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            SUPABASE READY
          </div>
        </div>
      </div>
    </header>
  );
}


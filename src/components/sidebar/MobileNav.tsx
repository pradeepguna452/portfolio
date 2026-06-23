"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "./nav";

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center overflow-x-auto no-scrollbar border-t border-slate-200 bg-white/90 pt-2 px-2 backdrop-blur-xl sm:hidden dark:border-slate-800 dark:bg-slate-950/90"
      style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
    >
      <div className="flex w-full items-center justify-between gap-1">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const Icon = item.icon;
          // Extract first word for compact mobile label
          const shortLabel = item.label.split(" ")[0].replace("/", "").trim();
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-[64px] flex-col items-center gap-1 p-2 transition-all active:scale-95 ${
                active ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400"
              }`}
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-2xl transition-colors ${active ? "bg-indigo-100 dark:bg-indigo-500/20" : "bg-transparent"}`}>
                <Icon size={22} className={active ? "stroke-[2.5px]" : "stroke-[2px] opacity-80"} />
              </div>
              <span className={`text-[10px] font-bold tracking-wide truncate max-w-full ${active ? "opacity-100" : "opacity-0 h-0 overflow-hidden"}`}>
                {shortLabel}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

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
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-zinc-900">
            {title}
          </div>
          <div className="truncate text-xs text-zinc-500">
            Your personal admin panel
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-600">
            Supabase-ready
          </div>
        </div>
      </div>
    </header>
  );
}


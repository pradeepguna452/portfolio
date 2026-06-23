import type { ReactNode } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { MobileNav } from "@/components/sidebar/MobileNav";
import { Topbar } from "@/components/topbar/Topbar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <div className="min-h-dvh bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50 pb-20 sm:pb-0">
        <div className="mx-auto flex min-h-dvh w-full max-w-7xl">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar />
            <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
          </div>
        </div>
        <MobileNav />
      </div>
    </RequireAuth>
  );
}


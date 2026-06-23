import type { ReactNode } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Topbar } from "@/components/topbar/Topbar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <div className="min-h-dvh bg-zinc-50 text-zinc-950">
        <div className="mx-auto flex min-h-dvh w-full max-w-7xl">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar />
            <main className="flex-1 p-4 sm:p-6">{children}</main>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}


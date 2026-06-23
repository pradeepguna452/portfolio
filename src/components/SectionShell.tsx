import type { ReactNode } from "react";

export function SectionShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        ) : null}
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8 dark:border-slate-800 dark:bg-slate-900">
        {children}
      </div>
    </section>
  );
}


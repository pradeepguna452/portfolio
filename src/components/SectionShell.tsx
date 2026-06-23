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
    <section className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-zinc-600">{description}</p>
        ) : null}
      </div>
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6">
        {children}
      </div>
    </section>
  );
}


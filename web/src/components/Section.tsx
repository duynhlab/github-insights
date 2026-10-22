import type { ReactNode } from "react";

export function Section({
  id,
  title,
  description,
  right,
  children,
}: {
  id: string;
  title: string;
  description?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="section-anchor space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-mono text-xl font-semibold leading-tight tracking-tight">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

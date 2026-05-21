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
    <section id={id} className="section-anchor space-y-3">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-mono text-lg font-semibold tracking-tight">{title}</h2>
          {description && (
            <p className="mt-0.5 text-sm text-muted-fg">{description}</p>
          )}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

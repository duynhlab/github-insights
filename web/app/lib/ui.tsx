import type { ReactNode } from "react";

export function GhLink({ href, children }: { href?: string | null; children: ReactNode }) {
  if (!href) return <>{children}</>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-6 items-center text-primary underline-offset-2 transition-colors hover:underline focus-visible:underline"
    >
      {children}
    </a>
  );
}

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function pctColor(pct: number | null): "rose" | "amber" | "emerald" | "slate" {
  if (pct == null) return "slate";
  if (pct < 0.7) return "rose";
  if (pct < 0.9) return "amber";
  return "emerald";
}

export function staleSeverity(days: number): "amber" | "rose" {
  return days > 30 ? "rose" : "amber";
}

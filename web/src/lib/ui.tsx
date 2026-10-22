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

// Badge tones map onto the variants added to components/ui/badge.tsx.
export type Tone = "danger" | "warning" | "success" | "neutral";

export function toneVariant(tone: Tone): "destructive" | "warning" | "success" | "secondary" {
  return tone === "danger" ? "destructive" : tone === "neutral" ? "secondary" : tone;
}

export function pctTone(pct: number | null): Tone {
  if (pct == null) return "neutral";
  if (pct < 0.7) return "danger";
  if (pct < 0.9) return "warning";
  return "success";
}

export function staleTone(days: number): Tone {
  return days > 30 ? "danger" : "warning";
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

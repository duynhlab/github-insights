import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const TONE_BADGE = {
  warn: { variant: "warning", label: "watch" },
  danger: { variant: "destructive", label: "high" },
  good: { variant: "success", label: "ok" },
} as const;

export function Kpi({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "warn" | "danger" | "good";
}) {
  return (
    <Card size="sm">
      <CardContent>
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          {tone !== "default" && (
            <Badge variant={TONE_BADGE[tone].variant}>{TONE_BADGE[tone].label}</Badge>
          )}
        </div>
        <p className="tnum mt-1 font-mono text-2xl font-semibold leading-none tracking-tight">
          {value}
        </p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

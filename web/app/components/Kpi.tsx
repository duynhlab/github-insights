import { Card, Text, Metric, Flex, Badge } from "@tremor/react";
import type { ReactNode } from "react";

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
  const toneColor =
    tone === "warn"
      ? "amber"
      : tone === "danger"
        ? "rose"
        : tone === "good"
          ? "emerald"
          : "slate";
  return (
    <Card className="relative p-4">
      <Flex alignItems="start" justifyContent="between">
        <Text className="text-xs font-medium uppercase tracking-wider text-muted-fg">{label}</Text>
        {tone !== "default" && (
          <Badge size="xs" color={toneColor}>
            {tone === "warn" ? "watch" : tone === "danger" ? "high" : "ok"}
          </Badge>
        )}
      </Flex>
      <Metric className="tnum mt-1 font-mono text-2xl leading-none tracking-tight">{value}</Metric>
      {hint && <Text className="mt-1 text-xs text-muted-fg">{hint}</Text>}
    </Card>
  );
}

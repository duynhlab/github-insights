import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { UserWeekRow } from "@/lib/data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { AuthorMultiSelect } from "@/components/AuthorMultiSelect";

type Metric = "created" | "merged";

const SERIES_COLORS = Array.from({ length: 8 }, (_, i) => `var(--chart-${i + 1})`);

export default function UserActivityChart({ data }: { data: UserWeekRow[] }) {
  const authors = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const r of data) m.set(r.author, r.is_bot);
    return [...m.entries()]
      .sort(([a, abot], [b, bbot]) => Number(abot) - Number(bbot) || a.localeCompare(b))
      .map(([author, is_bot]) => ({ author, is_bot }));
  }, [data]);

  const defaultPick = useMemo(() => {
    const totals = new Map<string, number>();
    for (const r of data) totals.set(r.author, (totals.get(r.author) ?? 0) + r.merged + r.created);
    return [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([a]) => a);
  }, [data]);

  const [selected, setSelected] = useState<string[]>([]);
  const [metric, setMetric] = useState<Metric>("merged");
  const [includeBots, setIncludeBots] = useState(true);

  const isBot = (a: string) => authors.find((x) => x.author === a)?.is_bot ?? false;
  const visible = selected.length ? selected : defaultPick;
  const categories = visible.filter((a) => includeBots || !isBot(a));

  const chartData = useMemo(() => {
    const weeks = [...new Set(data.map((r) => r.week))].sort();
    return weeks.map((wk) => {
      const row: Record<string, string | number> = { week: wk };
      for (const a of categories) row[a] = 0;
      for (const r of data) {
        if (r.week !== wk || !categories.includes(r.author)) continue;
        row[r.author] = (row[r.author] as number) + r[metric];
      }
      return row;
    });
  }, [data, categories, metric]);

  const config = Object.fromEntries(
    categories.map((a, i) => [a, { label: a, color: SERIES_COLORS[i % SERIES_COLORS.length] }]),
  ) satisfies ChartConfig;

  const summary = `Weekly PRs ${metric} per author for ${categories.length} selected author${
    categories.length === 1 ? "" : "s"
  } across ${chartData.length} ISO week${chartData.length === 1 ? "" : "s"}.`;

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-base font-medium">Weekly PR activity (by user)</p>
            <p className="text-sm text-muted-foreground">
              PRs {metric === "merged" ? "merged" : "created"} per ISO week, per author. Bots
              tagged as <Badge variant="warning">bot</Badge> in the picker.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <span>Bots</span>
              <Switch checked={includeBots} onCheckedChange={setIncludeBots} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span>Metric</span>
              <Select value={metric} onValueChange={(v) => setMetric(v as Metric)}>
                <SelectTrigger className="w-28" aria-label="Metric">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="merged">Merged</SelectItem>
                  <SelectItem value="created">Created</SelectItem>
                </SelectContent>
              </Select>
            </label>
          </div>
        </div>

        <AuthorMultiSelect
          options={authors}
          value={selected}
          onChange={setSelected}
          placeholder={`Showing top ${defaultPick.length} by default — pick authors…`}
        />

        <figure role="img" aria-label={summary}>
          <ChartContainer config={config} className="aspect-auto h-72 w-full">
            <AreaChart data={chartData} accessibilityLayer margin={{ left: 0, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={36} />
              <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
              <ChartLegend content={<ChartLegendContent />} />
              {categories.map((a) => (
                <Area
                  key={a}
                  dataKey={a}
                  type="monotone"
                  stroke={`var(--color-${a})`}
                  fill={`var(--color-${a})`}
                  fillOpacity={0.12}
                  isAnimationActive={false}
                />
              ))}
            </AreaChart>
          </ChartContainer>
          <figcaption className="sr-only">{summary}</figcaption>
        </figure>
      </CardContent>
    </Card>
  );
}

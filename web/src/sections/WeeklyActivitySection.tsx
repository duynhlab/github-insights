import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { WeekTotal } from "@/lib/metrics";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Section } from "@/components/Section";

const config = {
  commits: { label: "Commits", color: "var(--chart-1)" },
} satisfies ChartConfig;

export default function WeeklyActivitySection({ weeks }: { weeks: WeekTotal[] }) {
  const peak = weeks.reduce((m, w) => Math.max(m, w.commits), 0);
  const latest = weeks.length ? weeks[weeks.length - 1].commits : 0;
  const summary = weeks.length
    ? `Weekly commits over ${weeks.length} ISO weeks. Peak ${peak}, latest week ${latest}.`
    : "No commit activity in window.";

  return (
    <Section
      id="activity"
      title="Weekly commit activity (all authors)"
      description={
        <>
          Anonymous aggregate from GitHub{" "}
          <code className="font-mono text-xs">participation</code> API — can&rsquo;t be split per
          user.
        </>
      }
    >
      <Card>
        <CardContent>
          {weeks.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{summary}</p>
          ) : (
            <figure role="img" aria-label={summary}>
              <ChartContainer config={config} className="aspect-auto h-64 w-full">
                <AreaChart data={weeks} accessibilityLayer margin={{ left: 0, right: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={36} />
                  <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                  <Area
                    dataKey="commits"
                    type="monotone"
                    stroke="var(--color-commits)"
                    fill="var(--color-commits)"
                    fillOpacity={0.15}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ChartContainer>
              <figcaption className="sr-only">{summary}</figcaption>
            </figure>
          )}
        </CardContent>
      </Card>
    </Section>
  );
}

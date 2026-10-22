import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { SizeRow } from "@/lib/metrics";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Section } from "@/components/Section";

const BUCKETS = ["XS", "S", "M", "L", "XL"] as const;

const config = {
  XS: { label: "XS", color: "var(--muted-foreground)" },
  S: { label: "S", color: "var(--chart-5)" },
  M: { label: "M", color: "var(--chart-1)" },
  L: { label: "L", color: "var(--chart-3)" },
  XL: { label: "XL", color: "var(--chart-4)" },
} satisfies ChartConfig;

export default function PrSizeSection({ prSize }: { prSize: { by_repo: SizeRow[] } }) {
  const xlCount = prSize.by_repo.reduce((a, r) => a + (r.XL ?? 0), 0);
  const data = prSize.by_repo.filter((r) => r.total > 0);
  const totalPrs = data.reduce((a, r) => a + r.total, 0);
  const summary = data.length
    ? `PR size mix across ${data.length} repos: ${totalPrs} PRs total, ${xlCount} XL (≥1000 LOC).`
    : "No PRs in window.";

  return (
    <Section
      id="size"
      title="PR size distribution"
      description={
        <>
          Buckets by lines changed: XS &lt;10, S 10–49, M 50–249, L 250–999, XL ≥1000. Large PRs
          slow review and hide bugs.
        </>
      }
      right={
        xlCount > 0 ? (
          <Badge variant="destructive">
            {xlCount} XL PR{xlCount > 1 ? "s" : ""}
          </Badge>
        ) : (
          <Badge variant="success">no XL</Badge>
        )
      }
    >
      <Card>
        <CardContent>
          {data.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{summary}</p>
          ) : (
            <figure role="img" aria-label={summary}>
              <ChartContainer config={config} className="aspect-auto h-72 w-full">
                <BarChart data={data} accessibilityLayer margin={{ left: 0, right: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="repo" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={36} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  {BUCKETS.map((b, i) => (
                    <Bar
                      key={b}
                      dataKey={b}
                      stackId="size"
                      fill={`var(--color-${b})`}
                      radius={i === BUCKETS.length - 1 ? [4, 4, 0, 0] : 0}
                      isAnimationActive={false}
                    />
                  ))}
                </BarChart>
              </ChartContainer>
              <figcaption className="sr-only">{summary}</figcaption>
            </figure>
          )}
        </CardContent>
      </Card>
    </Section>
  );
}

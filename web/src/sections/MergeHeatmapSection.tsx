import type { Heatmap } from "@/lib/metrics";
import { Card, CardContent } from "@/components/ui/card";
import { Section } from "@/components/Section";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const HOURS = Array.from({ length: 24 }, (_, h) => h);

export default function MergeHeatmapSection({ heatmap }: { heatmap: Heatmap }) {
  const { matrix, max, total, peakDay, peakHour } = heatmap;
  const summary =
    total > 0
      ? `Merge heatmap across ${total} PRs: peak ${DAY_LABELS[peakDay]} ${String(peakHour).padStart(2, "0")}:00 UTC with ${max} merges.`
      : "No merged PRs in window.";

  return (
    <Section
      id="merge-heatmap"
      title="Merge heatmap (UTC)"
      description="When human PRs land, bucketed by hour-of-day and day-of-week. Darker = more merges."
    >
      <Card>
        <CardContent>
          <figure role="img" aria-label={summary}>
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                <div
                  className="grid gap-1 text-[10px] text-muted-foreground"
                  style={{ gridTemplateColumns: "32px repeat(24, minmax(0, 1fr))" }}
                >
                  <div />
                  {HOURS.map((h) => (
                    <div key={h} className="text-center tabular-nums">
                      {h % 3 === 0 ? h : ""}
                    </div>
                  ))}
                  {DAY_LABELS.map((label, d) => (
                    <DayRow key={label} label={label} counts={matrix[d]} max={max} />
                  ))}
                </div>
              </div>
            </div>
            <figcaption className="sr-only">{summary}</figcaption>
          </figure>
          <div className="mt-3 flex items-center justify-end gap-2 text-xs text-muted-foreground">
            <span>0</span>
            <div className="flex gap-px">
              {[0.1, 0.25, 0.5, 0.75, 1].map((op) => (
                <span
                  key={op}
                  aria-hidden
                  className="inline-block h-3 w-4 rounded-sm"
                  style={{ backgroundColor: `rgb(var(--primary-rgb) / ${op})` }}
                />
              ))}
            </div>
            <span className="tabular-nums">{max}</span>
          </div>
        </CardContent>
      </Card>
    </Section>
  );
}

function DayRow({ label, counts, max }: { label: string; counts: number[]; max: number }) {
  return (
    <>
      <div className="flex items-center font-mono text-xs text-muted-foreground">{label}</div>
      {counts.map((c, h) => {
        const opacity = max > 0 && c > 0 ? Math.max(0.1, c / max) : 0;
        return (
          <div
            key={h}
            title={`${label} ${String(h).padStart(2, "0")}:00 UTC — ${c} merge${c === 1 ? "" : "s"}`}
            className={"aspect-square rounded-sm " + (opacity === 0 ? "bg-muted opacity-30" : "")}
            style={opacity > 0 ? { backgroundColor: `rgb(var(--primary-rgb) / ${opacity})` } : undefined}
          />
        );
      })}
    </>
  );
}

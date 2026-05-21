import { Card } from "@tremor/react";
import { readJson, type PrRow } from "../lib/data";
import { Section } from "../components/Section";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const HOURS = Array.from({ length: 24 }, (_, h) => h);

export default async function MergeHeatmapSection() {
  const pulls = await readJson<PrRow[]>("pulls_human.json", []);

  const matrix: number[][] = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => 0),
  );
  let total = 0;
  for (const p of pulls) {
    if (!p.merged_at) continue;
    const d = new Date(p.merged_at);
    if (Number.isNaN(d.getTime())) continue;
    const day = d.getUTCDay();
    const hour = d.getUTCHours();
    matrix[day][hour] += 1;
    total += 1;
  }

  let max = 0;
  let peakDay = 0;
  let peakHour = 0;
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      if (matrix[d][h] > max) {
        max = matrix[d][h];
        peakDay = d;
        peakHour = h;
      }
    }
  }

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
        <figure role="img" aria-label={summary}>
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <div
                className="grid gap-1 text-[10px] text-muted-fg"
                style={{ gridTemplateColumns: "32px repeat(24, minmax(0, 1fr))" }}
              >
                <div />
                {HOURS.map((h) => (
                  <div key={h} className="text-center tabular-nums">
                    {h % 3 === 0 ? h : ""}
                  </div>
                ))}
                {DAY_LABELS.map((label, d) => (
                  <DayRow
                    key={label}
                    label={label}
                    counts={matrix[d]}
                    max={max}
                  />
                ))}
              </div>
            </div>
          </div>
          <figcaption className="sr-only">{summary}</figcaption>
        </figure>
        <div className="mt-3 flex items-center justify-end gap-2 text-xs text-muted-fg">
          <span>0</span>
          <div className="flex gap-px">
            {[0.1, 0.25, 0.5, 0.75, 1].map((op) => (
              <span
                key={op}
                aria-hidden
                className="inline-block h-3 w-4 rounded-sm"
                style={{ backgroundColor: `rgb(var(--color-primary-rgb) / ${op})` }}
              />
            ))}
          </div>
          <span className="tabular-nums">{max}</span>
        </div>
      </Card>
    </Section>
  );
}

function DayRow({
  label,
  counts,
  max,
}: {
  label: string;
  counts: number[];
  max: number;
}) {
  return (
    <>
      <div className="flex items-center font-mono text-xs text-muted-fg">
        {label}
      </div>
      {counts.map((c, h) => {
        const opacity = max > 0 && c > 0 ? Math.max(0.1, c / max) : 0;
        const bg =
          opacity > 0
            ? `rgb(var(--color-primary-rgb) / ${opacity})`
            : undefined;
        return (
          <div
            key={h}
            title={`${label} ${String(h).padStart(2, "0")}:00 UTC — ${c} merge${c === 1 ? "" : "s"}`}
            className={
              "aspect-square rounded-sm " +
              (opacity === 0 ? "bg-muted opacity-30" : "")
            }
            style={bg ? { backgroundColor: bg } : undefined}
          />
        );
      })}
    </>
  );
}

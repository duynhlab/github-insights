import { Card, AreaChart } from "@tremor/react";
import { readJson, type WeekRow } from "../lib/data";
import { Section } from "../components/Section";

export default async function WeeklyActivitySection() {
  const weeks = await readJson<WeekRow[]>("activity_weekly.json", []);
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
        <figure role="img" aria-label={summary}>
          <AreaChart
            className="h-64"
            data={weeks}
            index="week"
            categories={["commits"]}
            colors={["indigo"]}
            showAnimation={false}
            noDataText="No commit activity in window"
          />
          <figcaption className="sr-only">{summary}</figcaption>
        </figure>
      </Card>
    </Section>
  );
}

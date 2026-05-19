import { Card, AreaChart } from "@tremor/react";
import { readJson, type WeekRow } from "../lib/data";
import { Section } from "../components/Section";

export default async function WeeklyActivitySection() {
  const weeks = await readJson<WeekRow[]>("activity_weekly.json", []);
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
        <AreaChart
          className="h-64"
          data={weeks}
          index="week"
          categories={["commits"]}
          colors={["indigo"]}
          showAnimation={false}
          noDataText="No commit activity in window"
        />
      </Card>
    </Section>
  );
}

import { Card, BarChart, Badge } from "@tremor/react";
import { readJson, type PrSize } from "../lib/data";
import { Section } from "../components/Section";

export default async function PrSizeSection() {
  const prSize = await readJson<PrSize>("pr_size.json", {
    by_repo: [],
    by_author: [],
    buckets: ["XS", "S", "M", "L", "XL"],
    thresholds: {},
  });
  const xlCount = prSize.by_repo.reduce((a, r) => a + (r.XL ?? 0), 0);
  const data = prSize.by_repo.filter((r) => r.total > 0);

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
          <Badge color="rose" size="sm">
            {xlCount} XL PR{xlCount > 1 ? "s" : ""}
          </Badge>
        ) : (
          <Badge color="emerald" size="sm">no XL</Badge>
        )
      }
    >
      <Card>
        <BarChart
          className="h-72"
          data={data}
          index="repo"
          categories={["XS", "S", "M", "L", "XL"]}
          colors={["slate", "cyan", "indigo", "amber", "rose"]}
          stack
          showAnimation={false}
          noDataText="No PRs in window"
        />
      </Card>
    </Section>
  );
}

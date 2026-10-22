import type { DepRow } from "@/lib/data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Section } from "@/components/Section";
import { DataTable, columnHelper } from "@/components/DataTable";

const h = columnHelper<DepRow>();
const right = { meta: { align: "right" as const } };

const columns = h.columns([
  h.accessor("name", { header: "Repo", sortDescFirst: false }),
  h.accessor("bot_open_pr", {
    header: "Open bot PR",
    ...right,
    cell: (c) => (c.getValue() > 0 ? <Badge variant="warning">{c.getValue()}</Badge> : "0"),
  }),
  h.accessor("bot_merged_pr", { header: "Merged bot PR", ...right }),
  h.accessor((r) => r.bot_lead_time_median_h ?? undefined, {
    id: "bot_lead_time_median_h",
    header: "Median merge time (h)",
    sortUndefined: "last",
    ...right,
    cell: (c) => c.getValue() ?? "—",
  }),
]);

export default function DepsSection({ deps }: { deps: DepRow[] }) {
  return (
    <Section
      id="deps"
      title="Dependency Pulse"
      description="Bot PRs (dependabot, renovate, …). Tracked separately so they don't skew human metrics."
    >
      <Card>
        <CardContent>
          <div className="scroll-fade overflow-x-auto">
            <DataTable
              columns={columns}
              data={deps}
              rowKey={(d) => d.name}
              initialSort={[{ id: "bot_merged_pr", desc: true }]}
              caption="Bot PR open/merged counts and median merge time per repo. Sortable columns."
            />
          </div>
        </CardContent>
      </Card>
    </Section>
  );
}

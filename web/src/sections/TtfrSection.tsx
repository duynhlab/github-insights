import { Card, CardContent } from "@/components/ui/card";
import { Section } from "@/components/Section";
import { DataTable, columnHelper } from "@/components/DataTable";

type TtfrRow = { repo: string; sample: number; median_h: number | null; p90_h: number | null };
type Ttfr = { by_repo: TtfrRow[] };

const h = columnHelper<TtfrRow>();
const right = { meta: { align: "right" as const } };

const columns = h.columns([
  h.accessor((r) => r.repo ?? "", { id: "repo", header: "Repo", sortDescFirst: false }),
  h.accessor("sample", { header: "Sample", ...right }),
  h.accessor((r) => r.median_h ?? undefined, {
    id: "median_h",
    header: "Median (h)",
    sortUndefined: "last",
    ...right,
    cell: (c) => c.getValue() ?? "—",
  }),
  h.accessor((r) => r.p90_h ?? undefined, {
    id: "p90_h",
    header: "p90 (h)",
    sortUndefined: "last",
    ...right,
    cell: (c) => c.getValue() ?? "—",
  }),
]);

export default function TtfrSection({ ttfr }: { ttfr: Ttfr }) {
  const empty = ttfr.by_repo.every((r) => !r.sample);

  return (
    <Section
      id="ttfr"
      title="Review speed (time-to-first-review)"
      description="Hours from PR creation until the first review by someone other than the author. Bots excluded."
    >
      <Card>
        <CardContent>
          {empty ? (
            <p className="text-sm text-muted-foreground">No reviews in window.</p>
          ) : (
            <div className="scroll-fade overflow-x-auto">
              <DataTable
                columns={columns}
                data={ttfr.by_repo}
                rowKey={(r) => r.repo ?? ""}
                initialSort={[{ id: "sample", desc: true }]}
                caption="Time-to-first-review per repo: sample size, median and p90 hours."
              />
            </div>
          )}
        </CardContent>
      </Card>
    </Section>
  );
}

import type { RepoRow } from "@/lib/data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Section } from "@/components/Section";
import { DataTable, columnHelper } from "@/components/DataTable";
import { GhLink, pctTone, toneVariant } from "@/lib/ui";

const h = columnHelper<RepoRow>();
const right = { meta: { align: "right" as const } };

const columns = h.columns([
  h.accessor("name", {
    header: "Repo",
    meta: { className: "font-medium" },
    sortDescFirst: false,
    cell: ({ row }) => <GhLink href={row.original.url}>{row.original.name}</GhLink>,
  }),
  h.accessor((r) => r.lang ?? "", { id: "lang", header: "Lang", sortDescFirst: false, cell: (c) => c.getValue() || "—" }),
  h.accessor("human_open_pr", { header: "Open", ...right }),
  h.accessor("human_stale_pr", {
    header: "Stale",
    ...right,
    cell: (c) => (c.getValue() > 0 ? <Badge variant="warning">{c.getValue()}</Badge> : "0"),
  }),
  h.accessor("human_merged_pr", { header: "Merged", ...right }),
  h.accessor("commits_window", { header: "Commits", ...right }),
  h.accessor((r) => r.lead_time_median_h ?? undefined, {
    id: "lead_time_median_h",
    header: "Lead time med (h)",
    sortUndefined: "last",
    ...right,
    cell: (c) => c.getValue() ?? "—",
  }),
  h.accessor((r) => r.ttfr_median_h ?? undefined, {
    id: "ttfr_median_h",
    header: "TTFR med (h)",
    sortUndefined: "last",
    ...right,
    cell: ({ row, getValue }) =>
      getValue() != null ? (
        <span title={`p90 ${row.original.ttfr_p90_h ?? "—"}h · n=${row.original.ttfr_sample}`}>
          {getValue()}
        </span>
      ) : (
        "—"
      ),
  }),
  h.accessor((r) => r.ci_success_rate ?? undefined, {
    id: "ci_success_rate",
    header: "CI success",
    sortUndefined: "last",
    ...right,
    cell: ({ row, getValue }) => {
      const v = getValue();
      return v != null ? (
        <Badge variant={toneVariant(pctTone(v))}>
          {(v * 100).toFixed(0)}% · {row.original.ci_runs}
        </Badge>
      ) : (
        "—"
      );
    },
  }),
]);

export default function RepoHealthSection({ repos }: { repos: RepoRow[] }) {
  return (
    <Section
      id="health"
      title="Repo Health"
      description="Per-repo PR flow, review speed and CI signal within the window."
    >
      <Card>
        <CardContent>
          <div className="scroll-fade overflow-x-auto">
            <DataTable
              columns={columns}
              data={repos}
              rowKey={(r) => r.name}
              initialSort={[{ id: "commits_window", desc: true }]}
              caption="Per-repo PR flow, review speed and CI signal within the window. Sortable columns."
            />
          </div>
        </CardContent>
      </Card>
    </Section>
  );
}

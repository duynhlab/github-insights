import { Card, Badge } from "@tremor/react";
import { readJson, type RepoRow } from "../lib/data";
import { Section } from "../components/Section";
import {
  SortableTable,
  type Column,
  type SortableRow,
} from "../components/SortableTable";
import { GhLink, pctColor } from "../lib/ui";

const columns: Column[] = [
  { key: "name", header: "Repo", sortable: true, className: "font-medium" },
  { key: "lang", header: "Lang", sortable: true },
  { key: "human_open_pr", header: "Open", align: "right", sortable: true },
  { key: "human_stale_pr", header: "Stale", align: "right", sortable: true },
  { key: "human_merged_pr", header: "Merged", align: "right", sortable: true },
  { key: "commits_window", header: "Commits", align: "right", sortable: true },
  { key: "lead_time_median_h", header: "Lead time med (h)", align: "right", sortable: true },
  { key: "ttfr_median_h", header: "TTFR med (h)", align: "right", sortable: true },
  { key: "ci_success_rate", header: "CI success", align: "right", sortable: true },
];

export default async function RepoHealthSection() {
  const repos = await readJson<RepoRow[]>("repos.json", []);

  const rows: SortableRow[] = repos.map((r) => ({
    id: r.name,
    className: "hover:bg-muted/40",
    sortValues: {
      name: r.name,
      lang: r.lang ?? "",
      human_open_pr: r.human_open_pr,
      human_stale_pr: r.human_stale_pr,
      human_merged_pr: r.human_merged_pr,
      commits_window: r.commits_window,
      lead_time_median_h: r.lead_time_median_h,
      ttfr_median_h: r.ttfr_median_h,
      ci_success_rate: r.ci_success_rate,
    },
    cells: [
      <GhLink key="name" href={r.url}>{r.name}</GhLink>,
      r.lang ?? "—",
      r.human_open_pr,
      r.human_stale_pr > 0 ? <Badge key="stale" color="amber">{r.human_stale_pr}</Badge> : "0",
      r.human_merged_pr,
      r.commits_window,
      r.lead_time_median_h ?? "—",
      r.ttfr_median_h != null ? (
        <span key="ttfr" title={`p90 ${r.ttfr_p90_h ?? "—"}h · n=${r.ttfr_sample}`}>
          {r.ttfr_median_h}
        </span>
      ) : (
        "—"
      ),
      r.ci_success_rate != null ? (
        <Badge key="ci" color={pctColor(r.ci_success_rate)}>
          {(r.ci_success_rate * 100).toFixed(0)}% · {r.ci_runs}
        </Badge>
      ) : (
        "—"
      ),
    ],
  }));

  return (
    <Section
      id="health"
      title="Repo Health"
      description="Per-repo PR flow, review speed and CI signal within the window."
    >
      <Card>
        <div className="overflow-x-auto scroll-fade">
          <SortableTable
            rows={rows}
            columns={columns}
            initialSort={{ key: "commits_window", dir: "desc" }}
            caption="Per-repo PR flow, review speed and CI signal within the window. Sortable columns."
          />
        </div>
      </Card>
    </Section>
  );
}

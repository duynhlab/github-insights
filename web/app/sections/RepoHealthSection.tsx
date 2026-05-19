import {
  Card,
  Table,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableBody,
  TableCell,
  Badge,
} from "@tremor/react";
import { readJson, type RepoRow } from "../lib/data";
import { Section } from "../components/Section";
import { GhLink, pctColor } from "../lib/ui";

export default async function RepoHealthSection() {
  const repos = await readJson<RepoRow[]>("repos.json", []);
  return (
    <Section
      id="health"
      title="Repo Health"
      description="Per-repo PR flow, review speed and CI signal within the window."
    >
      <Card>
        <div className="overflow-x-auto scroll-fade">
          <Table className="table-sticky">
            <TableHead>
              <TableRow>
                <TableHeaderCell>Repo</TableHeaderCell>
                <TableHeaderCell>Lang</TableHeaderCell>
                <TableHeaderCell className="text-right">Open</TableHeaderCell>
                <TableHeaderCell className="text-right">Stale</TableHeaderCell>
                <TableHeaderCell className="text-right">Merged</TableHeaderCell>
                <TableHeaderCell className="text-right">Commits</TableHeaderCell>
                <TableHeaderCell className="text-right">Lead time med (h)</TableHeaderCell>
                <TableHeaderCell className="text-right">TTFR med (h)</TableHeaderCell>
                <TableHeaderCell className="text-right">CI success</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {repos.map((r) => (
                <TableRow
                  key={r.name}
                  className="hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                >
                  <TableCell className="font-medium">
                    <GhLink href={r.url}>{r.name}</GhLink>
                  </TableCell>
                  <TableCell>{r.lang ?? "—"}</TableCell>
                  <TableCell className="text-right tnum">{r.human_open_pr}</TableCell>
                  <TableCell className="text-right tnum">
                    {r.human_stale_pr > 0 ? (
                      <Badge color="amber">{r.human_stale_pr}</Badge>
                    ) : (
                      "0"
                    )}
                  </TableCell>
                  <TableCell className="text-right tnum">{r.human_merged_pr}</TableCell>
                  <TableCell className="text-right tnum">{r.commits_window}</TableCell>
                  <TableCell className="text-right tnum">{r.lead_time_median_h ?? "—"}</TableCell>
                  <TableCell className="text-right tnum">
                    {r.ttfr_median_h != null ? (
                      <span title={`p90 ${r.ttfr_p90_h ?? "—"}h · n=${r.ttfr_sample}`}>
                        {r.ttfr_median_h}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right tnum">
                    {r.ci_success_rate != null ? (
                      <Badge color={pctColor(r.ci_success_rate)}>
                        {(r.ci_success_rate * 100).toFixed(0)}% · {r.ci_runs}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </Section>
  );
}

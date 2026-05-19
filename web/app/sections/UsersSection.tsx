import {
  Card,
  Table,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableBody,
  TableCell,
} from "@tremor/react";
import { readJson, type PrRow } from "../lib/data";
import { Section } from "../components/Section";
import { GhLink, median } from "../lib/ui";

type UserAgg = {
  author: string;
  open_pr: number;
  merged_pr: number;
  additions: number;
  deletions: number;
  changed_files: number;
  lead_time_median_h: number | null;
  repos: number;
};

function aggregateByUser(prs: PrRow[]): UserAgg[] {
  const by = new Map<
    string,
    {
      open: number;
      merged: number;
      add: number;
      del: number;
      files: number;
      leads: number[];
      repos: Set<string>;
    }
  >();
  for (const p of prs) {
    const a = p.author ?? "(unknown)";
    const r =
      by.get(a) ??
      {
        open: 0,
        merged: 0,
        add: 0,
        del: 0,
        files: 0,
        leads: [] as number[],
        repos: new Set<string>(),
      };
    if (p.state === "OPEN") r.open += 1;
    if (p.merged_at) {
      r.merged += 1;
      r.add += p.additions;
      r.del += p.deletions;
      r.files += p.changed_files;
      if (p.lead_time_h != null) r.leads.push(p.lead_time_h);
    }
    r.repos.add(p.repo);
    by.set(a, r);
  }
  return [...by.entries()]
    .map(([author, r]) => {
      const m = median(r.leads);
      return {
        author,
        open_pr: r.open,
        merged_pr: r.merged,
        additions: r.add,
        deletions: r.del,
        changed_files: r.files,
        lead_time_median_h: m == null ? null : Math.round(m * 100) / 100,
        repos: r.repos.size,
      };
    })
    .sort((a, b) => b.merged_pr - a.merged_pr || b.open_pr - a.open_pr);
}

export default async function UsersSection() {
  const [pullsHuman, pullsBot] = await Promise.all([
    readJson<PrRow[]>("pulls_human.json", []),
    readJson<PrRow[]>("pulls_bot.json", []),
  ]);
  const users = aggregateByUser(pullsHuman);
  const bots = aggregateByUser(pullsBot);

  return (
    <Section
      id="users"
      title="By User"
      description="Per-author PR throughput. Commit counts per user are not available (participation API is anonymous)."
    >
      <Card>
        <div className="overflow-x-auto scroll-fade">
          <Table className="table-sticky">
            <TableHead>
              <TableRow>
                <TableHeaderCell>User</TableHeaderCell>
                <TableHeaderCell className="text-right">Open</TableHeaderCell>
                <TableHeaderCell className="text-right">Merged</TableHeaderCell>
                <TableHeaderCell className="text-right">Repos</TableHeaderCell>
                <TableHeaderCell className="text-right">+/−</TableHeaderCell>
                <TableHeaderCell className="text-right">Files</TableHeaderCell>
                <TableHeaderCell className="text-right">Lead med (h)</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow
                  key={u.author}
                  className="hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                >
                  <TableCell className="font-medium">
                    <GhLink href={`https://github.com/${u.author}`}>{u.author}</GhLink>
                  </TableCell>
                  <TableCell className="text-right tnum">{u.open_pr}</TableCell>
                  <TableCell className="text-right tnum">{u.merged_pr}</TableCell>
                  <TableCell className="text-right tnum">{u.repos}</TableCell>
                  <TableCell className="text-right tnum">
                    <span className="text-emerald-700 dark:text-emerald-300">
                      +{u.additions.toLocaleString()}
                    </span>{" "}
                    <span className="text-rose-700 dark:text-rose-300">
                      −{u.deletions.toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tnum">{u.changed_files}</TableCell>
                  <TableCell className="text-right tnum">
                    {u.lead_time_median_h ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {bots.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200">
              Show bot accounts ({bots.length})
            </summary>
            <div className="overflow-x-auto scroll-fade mt-2">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Bot</TableHeaderCell>
                    <TableHeaderCell className="text-right">Open</TableHeaderCell>
                    <TableHeaderCell className="text-right">Merged</TableHeaderCell>
                    <TableHeaderCell className="text-right">Repos</TableHeaderCell>
                    <TableHeaderCell className="text-right">Lead med (h)</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {bots.map((u) => (
                    <TableRow key={u.author}>
                      <TableCell>{u.author}</TableCell>
                      <TableCell className="text-right tnum">{u.open_pr}</TableCell>
                      <TableCell className="text-right tnum">{u.merged_pr}</TableCell>
                      <TableCell className="text-right tnum">{u.repos}</TableCell>
                      <TableCell className="text-right tnum">
                        {u.lead_time_median_h ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </details>
        )}
      </Card>
    </Section>
  );
}

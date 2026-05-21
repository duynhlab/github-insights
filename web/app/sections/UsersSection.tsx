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
import {
  SortableTable,
  type Column,
  type SortableRow,
} from "../components/SortableTable";
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
  return [...by.entries()].map(([author, r]) => {
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
  });
}

const columns: Column[] = [
  { key: "author", header: "User", sortable: true, className: "font-medium" },
  { key: "open_pr", header: "Open", align: "right", sortable: true },
  { key: "merged_pr", header: "Merged", align: "right", sortable: true },
  { key: "repos", header: "Repos", align: "right", sortable: true },
  { key: "diff", header: "+/−", align: "right", sortable: true },
  { key: "changed_files", header: "Files", align: "right", sortable: true },
  { key: "lead_time_median_h", header: "Lead med (h)", align: "right", sortable: true },
];

export default async function UsersSection() {
  const [pullsHuman, pullsBot] = await Promise.all([
    readJson<PrRow[]>("pulls_human.json", []),
    readJson<PrRow[]>("pulls_bot.json", []),
  ]);
  const users = aggregateByUser(pullsHuman);
  const bots = aggregateByUser(pullsBot);

  const rows: SortableRow[] = users.map((u) => ({
    id: u.author,
    className: "hover:bg-muted/40",
    sortValues: {
      author: u.author,
      open_pr: u.open_pr,
      merged_pr: u.merged_pr,
      repos: u.repos,
      diff: u.additions + u.deletions,
      changed_files: u.changed_files,
      lead_time_median_h: u.lead_time_median_h,
    },
    cells: [
      <GhLink key="a" href={`https://github.com/${u.author}`}>{u.author}</GhLink>,
      u.open_pr,
      u.merged_pr,
      u.repos,
      <span key="d">
        <span className="text-success">+{u.additions.toLocaleString()}</span>{" "}
        <span className="text-danger">−{u.deletions.toLocaleString()}</span>
      </span>,
      u.changed_files,
      u.lead_time_median_h ?? "—",
    ],
  }));

  return (
    <Section
      id="users"
      title="By User"
      description="Per-author PR throughput. Commit counts per user are not available (participation API is anonymous)."
    >
      <Card>
        <div className="overflow-x-auto scroll-fade">
          <SortableTable
            rows={rows}
            columns={columns}
            initialSort={{ key: "merged_pr", dir: "desc" }}
            caption="Per-author PR throughput. Sortable columns."
          />
        </div>
        {bots.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-muted-fg hover:text-fg">
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

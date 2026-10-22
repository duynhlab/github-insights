import type { PrRow } from "@/lib/data";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Section } from "@/components/Section";
import { DataTable, columnHelper } from "@/components/DataTable";
import { GhLink, median } from "@/lib/ui";

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
    const r = by.get(a) ?? {
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

const h = columnHelper<UserAgg>();
const right = { meta: { align: "right" as const } };

const columns = h.columns([
  h.accessor("author", {
    header: "User",
    sortDescFirst: false,
    meta: { className: "font-medium" },
    cell: (c) => <GhLink href={`https://github.com/${c.getValue()}`}>{c.getValue()}</GhLink>,
  }),
  h.accessor("open_pr", { header: "Open", ...right }),
  h.accessor("merged_pr", { header: "Merged", ...right }),
  h.accessor("repos", { header: "Repos", ...right }),
  h.accessor((r) => r.additions + r.deletions, {
    id: "diff",
    header: "+/−",
    ...right,
    cell: ({ row }) => (
      <span>
        <span className="text-success">+{row.original.additions.toLocaleString()}</span>{" "}
        <span className="text-destructive">−{row.original.deletions.toLocaleString()}</span>
      </span>
    ),
  }),
  h.accessor("changed_files", { header: "Files", ...right }),
  h.accessor((r) => r.lead_time_median_h ?? undefined, {
    id: "lead_time_median_h",
    header: "Lead med (h)",
    sortUndefined: "last",
    ...right,
    cell: (c) => c.getValue() ?? "—",
  }),
]);

export default function UsersSection({
  pullsHuman,
  pullsBot,
}: {
  pullsHuman: PrRow[];
  pullsBot: PrRow[];
}) {
  const users = aggregateByUser(pullsHuman);
  const bots = aggregateByUser(pullsBot);

  return (
    <Section
      id="users"
      title="By User"
      description="Per-author PR throughput. Commit counts per user are not available (participation API is anonymous)."
    >
      <Card>
        <CardContent>
          <div className="scroll-fade overflow-x-auto">
            <DataTable
              columns={columns}
              data={users}
              rowKey={(u) => u.author}
              initialSort={[{ id: "merged_pr", desc: true }]}
              caption="Per-author PR throughput. Sortable columns."
            />
          </div>
          {bots.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                Show bot accounts ({bots.length})
              </summary>
              <div className="scroll-fade mt-2 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bot</TableHead>
                      <TableHead className="text-right">Open</TableHead>
                      <TableHead className="text-right">Merged</TableHead>
                      <TableHead className="text-right">Repos</TableHead>
                      <TableHead className="text-right">Lead med (h)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bots.map((u) => (
                      <TableRow key={u.author}>
                        <TableCell className="font-mono text-xs">{u.author}</TableCell>
                        <TableCell className="tnum text-right font-mono text-xs">{u.open_pr}</TableCell>
                        <TableCell className="tnum text-right font-mono text-xs">{u.merged_pr}</TableCell>
                        <TableCell className="tnum text-right font-mono text-xs">{u.repos}</TableCell>
                        <TableCell className="tnum text-right font-mono text-xs">
                          {u.lead_time_median_h ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </details>
          )}
        </CardContent>
      </Card>
    </Section>
  );
}

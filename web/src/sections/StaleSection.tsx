import type { StalePr } from "@/lib/metrics";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Section } from "@/components/Section";
import { EmptyState } from "@/components/EmptyState";
import { DataTable, columnHelper } from "@/components/DataTable";
import { GhLink, staleTone, toneVariant } from "@/lib/ui";

const h = columnHelper<StalePr>();
const right = { meta: { align: "right" as const } };

const columns = h.columns([
  h.accessor("repo", { header: "Repo", sortDescFirst: false }),
  h.accessor("number", {
    header: "PR",
    meta: { className: "max-w-md" },
    cell: ({ row }) => (
      <GhLink href={row.original.url}>
        #{row.original.number} — <span className="text-muted-foreground">{row.original.title}</span>
      </GhLink>
    ),
  }),
  h.accessor((r) => r.author ?? "", {
    id: "author",
    header: "Author",
    sortDescFirst: false,
    cell: (c) => c.getValue() || "—",
  }),
  h.accessor("days_idle", {
    header: "Days idle",
    ...right,
    cell: (c) => (
      <Badge variant={toneVariant(staleTone(c.getValue()))}>
        {c.getValue()}d
      </Badge>
    ),
  }),
  h.accessor("loc", { header: "LOC", ...right }),
  h.accessor((r) => (r.is_draft ? "draft" : "open"), {
    id: "state",
    header: "State",
    sortDescFirst: false,
    cell: (c) => (c.getValue() === "draft" ? <Badge variant="secondary">draft</Badge> : "open"),
  }),
]);

export default function StaleSection({ stalePrs }: { stalePrs: StalePr[] }) {
  return (
    <Section
      id="stale"
      title="Stale PRs"
      description="Open PRs untouched longer than the configured threshold. Sorted by age."
      right={
        stalePrs.length === 0 ? (
          <Badge variant="success">clean</Badge>
        ) : (
          <Badge variant="warning">{stalePrs.length} open</Badge>
        )
      }
    >
      <Card>
        <CardContent>
          {stalePrs.length === 0 ? (
            <EmptyState>No stale PRs. Nice.</EmptyState>
          ) : (
            <div className="scroll-fade overflow-x-auto">
              <DataTable
                columns={columns}
                data={stalePrs}
                rowKey={(s) => `${s.repo}-${s.number}`}
                initialSort={[{ id: "days_idle", desc: true }]}
                caption="Open PRs untouched beyond threshold. Sortable columns."
              />
            </div>
          )}
        </CardContent>
      </Card>
    </Section>
  );
}

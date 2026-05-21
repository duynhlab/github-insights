import { Card, Text, Flex, Badge } from "@tremor/react";
import { readJson, type StalePr } from "../lib/data";
import { Section } from "../components/Section";
import { Check } from "../components/Icon";
import {
  SortableTable,
  type Column,
  type SortableRow,
} from "../components/SortableTable";
import { GhLink, staleSeverity } from "../lib/ui";

const columns: Column[] = [
  { key: "repo", header: "Repo", sortable: true },
  { key: "pr", header: "PR", sortable: true, className: "max-w-md" },
  { key: "author", header: "Author", sortable: true },
  { key: "days_idle", header: "Days idle", align: "right", sortable: true },
  { key: "loc", header: "LOC", align: "right", sortable: true },
  { key: "state", header: "State", sortable: true },
];

export default async function StaleSection() {
  const stalePrs = await readJson<StalePr[]>("stale_prs.json", []);

  const rows: SortableRow[] = stalePrs.map((s) => ({
    id: `${s.repo}-${s.number}`,
    className: "hover:bg-muted/40",
    sortValues: {
      repo: s.repo,
      pr: s.number,
      author: s.author ?? "",
      days_idle: s.days_idle,
      loc: s.loc,
      state: s.is_draft ? "draft" : "open",
    },
    cells: [
      s.repo,
      <GhLink key="pr" href={s.url}>
        #{s.number} — <span className="text-muted-fg">{s.title}</span>
      </GhLink>,
      s.author ?? "—",
      <Badge key="d" color={staleSeverity(s.days_idle)}>{s.days_idle}d</Badge>,
      s.loc,
      s.is_draft ? <Badge key="st" color="slate">draft</Badge> : "open",
    ],
  }));

  return (
    <Section
      id="stale"
      title="Stale PRs"
      description="Open PRs untouched longer than the configured threshold. Sorted by age."
      right={
        stalePrs.length === 0 ? (
          <Badge color="emerald" size="sm">clean</Badge>
        ) : (
          <Badge color="amber" size="sm">{stalePrs.length} open</Badge>
        )
      }
    >
      <Card>
        {stalePrs.length === 0 ? (
          <Flex justifyContent="center" className="flex-col gap-3 py-8">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
              <Check size={24} />
            </div>
            <Text className="text-muted-fg">No stale PRs. Nice.</Text>
          </Flex>
        ) : (
          <div className="overflow-x-auto scroll-fade">
            <SortableTable
              rows={rows}
              columns={columns}
              initialSort={{ key: "days_idle", dir: "desc" }}
              caption="Open PRs untouched beyond threshold. Sortable columns."
            />
          </div>
        )}
      </Card>
    </Section>
  );
}

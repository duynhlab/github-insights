import { Card, Text, Badge } from "@tremor/react";
import { readJson, type Reviewer } from "../lib/data";
import { Section } from "../components/Section";
import {
  SortableTable,
  type Column,
  type SortableRow,
} from "../components/SortableTable";
import { GhLink } from "../lib/ui";

const columns: Column[] = [
  { key: "login", header: "Reviewer", sortable: true, className: "font-medium" },
  { key: "total", header: "Total", align: "right", sortable: true },
  { key: "approved", header: "Approved", align: "right", sortable: true },
  { key: "commented", header: "Commented", align: "right", sortable: true },
  { key: "changes_requested", header: "Changes req.", align: "right", sortable: true },
  { key: "repos", header: "Repos", align: "right", sortable: true },
];

export default async function ReviewersSection() {
  const reviewers = await readJson<Reviewer[]>("reviewers.json", []);
  const totalReviews = reviewers.reduce((a, r) => a + r.total, 0);

  const rows: SortableRow[] = reviewers.map((r) => ({
    id: r.login,
    className: "hover:bg-muted/40",
    sortValues: {
      login: r.login,
      total: r.total,
      approved: r.approved,
      commented: r.commented,
      changes_requested: r.changes_requested,
      repos: r.repos,
    },
    cells: [
      <GhLink key="l" href={`https://github.com/${r.login}`}>{r.login}</GhLink>,
      <span key="t" className="font-semibold">{r.total}</span>,
      r.approved > 0 ? (
        <Badge key="a" color="emerald" size="xs">{r.approved}</Badge>
      ) : (
        "0"
      ),
      r.commented,
      r.changes_requested > 0 ? (
        <Badge key="cr" color="amber" size="xs">{r.changes_requested}</Badge>
      ) : (
        "0"
      ),
      r.repos,
    ],
  }));

  return (
    <Section
      id="reviewers"
      title="Review load by user"
      description="Who reviews PRs across the org. Self-reviews and bots excluded."
      right={
        reviewers.length > 0 ? (
          <Badge color="indigo" size="sm">
            {totalReviews} review{totalReviews === 1 ? "" : "s"} · {reviewers.length} reviewer
            {reviewers.length === 1 ? "" : "s"}
          </Badge>
        ) : null
      }
    >
      <Card>
        {reviewers.length === 0 ? (
          <Text className="text-muted-fg">No reviews recorded in window.</Text>
        ) : (
          <div className="overflow-x-auto scroll-fade">
            <SortableTable
              rows={rows}
              columns={columns}
              initialSort={{ key: "total", dir: "desc" }}
              caption="Reviewers by total reviews and breakdown. Sortable columns."
            />
          </div>
        )}
      </Card>
    </Section>
  );
}

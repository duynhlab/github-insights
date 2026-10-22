import type { Reviewer } from "@/lib/metrics";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Section } from "@/components/Section";
import { DataTable, columnHelper } from "@/components/DataTable";
import { GhLink } from "@/lib/ui";

const h = columnHelper<Reviewer>();
const right = { meta: { align: "right" as const } };

const columns = h.columns([
  h.accessor("login", {
    header: "Reviewer",
    sortDescFirst: false,
    meta: { className: "font-medium" },
    cell: (c) => <GhLink href={`https://github.com/${c.getValue()}`}>{c.getValue()}</GhLink>,
  }),
  h.accessor("total", {
    header: "Total",
    ...right,
    cell: (c) => <span className="font-semibold">{c.getValue()}</span>,
  }),
  h.accessor("approved", {
    header: "Approved",
    ...right,
    cell: (c) => (c.getValue() > 0 ? <Badge variant="success">{c.getValue()}</Badge> : "0"),
  }),
  h.accessor("commented", { header: "Commented", ...right }),
  h.accessor("changes_requested", {
    header: "Changes req.",
    ...right,
    cell: (c) => (c.getValue() > 0 ? <Badge variant="warning">{c.getValue()}</Badge> : "0"),
  }),
  h.accessor("repos", { header: "Repos", ...right }),
]);

export default function ReviewersSection({ reviewers }: { reviewers: Reviewer[] }) {
  const totalReviews = reviewers.reduce((a, r) => a + r.total, 0);

  return (
    <Section
      id="reviewers"
      title="Review load by user"
      description="Who reviews PRs across the org. Self-reviews and bots excluded."
      right={
        reviewers.length > 0 ? (
          <Badge variant="secondary">
            {totalReviews} review{totalReviews === 1 ? "" : "s"} · {reviewers.length} reviewer
            {reviewers.length === 1 ? "" : "s"}
          </Badge>
        ) : null
      }
    >
      <Card>
        <CardContent>
          {reviewers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reviews recorded in window.</p>
          ) : (
            <div className="scroll-fade overflow-x-auto">
              <DataTable
                columns={columns}
                data={reviewers}
                rowKey={(r) => r.login}
                initialSort={[{ id: "total", desc: true }]}
                caption="Reviewers by total reviews and breakdown. Sortable columns."
              />
            </div>
          )}
        </CardContent>
      </Card>
    </Section>
  );
}

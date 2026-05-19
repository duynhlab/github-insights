import {
  Card,
  Text,
  Table,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableBody,
  TableCell,
  Badge,
} from "@tremor/react";
import { readJson, type Reviewer } from "../lib/data";
import { Section } from "../components/Section";
import { GhLink } from "../lib/ui";

export default async function ReviewersSection() {
  const reviewers = await readJson<Reviewer[]>("reviewers.json", []);
  const totalReviews = reviewers.reduce((a, r) => a + r.total, 0);

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
          <Text className="text-slate-500 dark:text-slate-400">No reviews recorded in window.</Text>
        ) : (
          <div className="overflow-x-auto scroll-fade">
            <Table className="table-sticky">
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Reviewer</TableHeaderCell>
                  <TableHeaderCell className="text-right">Total</TableHeaderCell>
                  <TableHeaderCell className="text-right">Approved</TableHeaderCell>
                  <TableHeaderCell className="text-right">Commented</TableHeaderCell>
                  <TableHeaderCell className="text-right">Changes req.</TableHeaderCell>
                  <TableHeaderCell className="text-right">Repos</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reviewers.map((r) => (
                  <TableRow
                    key={r.login}
                    className="hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                  >
                    <TableCell className="font-medium">
                      <GhLink href={`https://github.com/${r.login}`}>{r.login}</GhLink>
                    </TableCell>
                    <TableCell className="text-right tnum font-semibold">{r.total}</TableCell>
                    <TableCell className="text-right tnum">
                      {r.approved > 0 ? (
                        <Badge color="emerald" size="xs">
                          {r.approved}
                        </Badge>
                      ) : (
                        "0"
                      )}
                    </TableCell>
                    <TableCell className="text-right tnum">{r.commented}</TableCell>
                    <TableCell className="text-right tnum">
                      {r.changes_requested > 0 ? (
                        <Badge color="amber" size="xs">
                          {r.changes_requested}
                        </Badge>
                      ) : (
                        "0"
                      )}
                    </TableCell>
                    <TableCell className="text-right tnum">{r.repos}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </Section>
  );
}

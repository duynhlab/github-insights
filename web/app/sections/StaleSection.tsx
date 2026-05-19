import {
  Card,
  Text,
  Flex,
  Table,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableBody,
  TableCell,
  Badge,
} from "@tremor/react";
import { readJson, type StalePr } from "../lib/data";
import { Section } from "../components/Section";
import { GhLink, staleSeverity } from "../lib/ui";

export default async function StaleSection() {
  const stalePrs = await readJson<StalePr[]>("stale_prs.json", []);

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
          <Flex justifyContent="center" className="flex-col gap-2 py-8">
            <div className="text-3xl">✓</div>
            <Text className="text-slate-500 dark:text-slate-400">No stale PRs. Nice.</Text>
          </Flex>
        ) : (
          <div className="overflow-x-auto scroll-fade">
            <Table className="table-sticky">
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Repo</TableHeaderCell>
                  <TableHeaderCell>PR</TableHeaderCell>
                  <TableHeaderCell>Author</TableHeaderCell>
                  <TableHeaderCell className="text-right">Days idle</TableHeaderCell>
                  <TableHeaderCell className="text-right">LOC</TableHeaderCell>
                  <TableHeaderCell>State</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stalePrs.map((s) => (
                  <TableRow
                    key={`${s.repo}-${s.number}`}
                    className="hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                  >
                    <TableCell>{s.repo}</TableCell>
                    <TableCell className="max-w-md">
                      <GhLink href={s.url}>
                        #{s.number} —{" "}
                        <span className="text-slate-700 dark:text-slate-300">{s.title}</span>
                      </GhLink>
                    </TableCell>
                    <TableCell>{s.author ?? "—"}</TableCell>
                    <TableCell className="text-right tnum">
                      <Badge color={staleSeverity(s.days_idle)}>{s.days_idle}d</Badge>
                    </TableCell>
                    <TableCell className="text-right tnum">{s.loc}</TableCell>
                    <TableCell>
                      {s.is_draft ? <Badge color="slate">draft</Badge> : "open"}
                    </TableCell>
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

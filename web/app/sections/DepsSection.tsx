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
import { readJson, type DepRow } from "../lib/data";
import { Section } from "../components/Section";

export default async function DepsSection() {
  const deps = await readJson<DepRow[]>("dependencies.json", []);
  return (
    <Section
      id="deps"
      title="Dependency Pulse"
      description="Bot PRs (dependabot, renovate, …). Tracked separately so they don't skew human metrics."
    >
      <Card>
        <div className="overflow-x-auto scroll-fade">
          <Table className="table-sticky">
            <TableHead>
              <TableRow>
                <TableHeaderCell>Repo</TableHeaderCell>
                <TableHeaderCell className="text-right">Open bot PR</TableHeaderCell>
                <TableHeaderCell className="text-right">Merged bot PR</TableHeaderCell>
                <TableHeaderCell className="text-right">Median merge time (h)</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {deps.map((d) => (
                <TableRow key={d.name}>
                  <TableCell>{d.name}</TableCell>
                  <TableCell className="text-right tnum">
                    {d.bot_open_pr > 0 ? (
                      <Badge color="amber">{d.bot_open_pr}</Badge>
                    ) : (
                      "0"
                    )}
                  </TableCell>
                  <TableCell className="text-right tnum">{d.bot_merged_pr}</TableCell>
                  <TableCell className="text-right tnum">
                    {d.bot_lead_time_median_h ?? "—"}
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

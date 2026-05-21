import {
  Card,
  Text,
  Table,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableBody,
  TableCell,
} from "@tremor/react";
import { readJson, type Ttfr } from "../lib/data";
import { Section } from "../components/Section";

export default async function TtfrSection() {
  const ttfr = await readJson<Ttfr>("ttfr.json", { by_repo: [], by_author: [] });
  const empty = ttfr.by_repo.every((r) => !r.sample);

  return (
    <Section
      id="ttfr"
      title="Review speed (time-to-first-review)"
      description="Hours from PR creation until the first review by someone other than the author. Bots excluded."
    >
      <Card>
        {empty ? (
          <Text className="text-muted-fg">No reviews in window.</Text>
        ) : (
          <div className="overflow-x-auto scroll-fade">
            <Table className="table-sticky">
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Repo</TableHeaderCell>
                  <TableHeaderCell className="text-right">Sample</TableHeaderCell>
                  <TableHeaderCell className="text-right">Median (h)</TableHeaderCell>
                  <TableHeaderCell className="text-right">p90 (h)</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ttfr.by_repo.map((r) => (
                  <TableRow key={r.repo}>
                    <TableCell>{r.repo}</TableCell>
                    <TableCell className="text-right tnum">{r.sample}</TableCell>
                    <TableCell className="text-right tnum">{r.median_h ?? "—"}</TableCell>
                    <TableCell className="text-right tnum">{r.p90_h ?? "—"}</TableCell>
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

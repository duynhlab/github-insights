import type { CiFailRepo } from "@/lib/metrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Section } from "@/components/Section";
import { EmptyState } from "@/components/EmptyState";
import { GhLink, fmtDate } from "@/lib/ui";

export default function CiSection({ ciFailures }: { ciFailures: CiFailRepo[] }) {
  const ciTotalFails = ciFailures.reduce(
    (a, r) => a + r.workflows.reduce((b, w) => b + w.fail, 0),
    0,
  );

  return (
    <Section
      id="ci"
      title="CI failures by workflow"
      description="Top failing workflow runs per repo within the window."
      right={
        ciTotalFails > 0 ? (
          <Badge variant="destructive">{ciTotalFails} fails</Badge>
        ) : (
          <Badge variant="success">green</Badge>
        )
      }
    >
      {ciFailures.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState>No CI failures recorded.</EmptyState>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {ciFailures.map((repo) => (
            <Card key={repo.repo}>
              <CardHeader>
                <CardTitle>{repo.repo}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="scroll-fade overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Workflow</TableHead>
                        <TableHead className="text-right">Fail / total</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead>Last fail</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {repo.workflows.map((w) => (
                        <TableRow key={w.name}>
                          <TableCell className="font-mono text-xs font-medium">{w.name}</TableCell>
                          <TableCell className="tnum text-right font-mono text-xs">
                            {w.fail}/{w.total}
                          </TableCell>
                          <TableCell className="tnum text-right font-mono text-xs">
                            <Badge variant={w.fail_rate >= 0.5 ? "destructive" : "warning"}>
                              {(w.fail_rate * 100).toFixed(0)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {w.last_fail_url ? (
                              <GhLink href={w.last_fail_url}>
                                {w.last_fail_at ? fmtDate(w.last_fail_at) : "open"}
                              </GhLink>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </Section>
  );
}

import {
  Card,
  Title,
  Text,
  Flex,
  Grid,
  Table,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableBody,
  TableCell,
  Badge,
} from "@tremor/react";
import { readJson, type CiFailRepo } from "../lib/data";
import { Section } from "../components/Section";
import { Check } from "../components/Icon";
import { GhLink } from "../lib/ui";

export default async function CiSection() {
  const ciFailures = await readJson<CiFailRepo[]>("ci_failures.json", []);
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
          <Badge color="rose" size="sm">{ciTotalFails} fails</Badge>
        ) : (
          <Badge color="emerald" size="sm">green</Badge>
        )
      }
    >
      {ciFailures.length === 0 ? (
        <Card>
          <Flex justifyContent="center" className="flex-col gap-3 py-8">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
              <Check size={24} />
            </div>
            <Text className="text-muted-fg">No CI failures recorded.</Text>
          </Flex>
        </Card>
      ) : (
        <Grid numItemsMd={2} className="gap-4">
          {ciFailures.map((repo) => (
            <Card key={repo.repo}>
              <Title className="text-base">{repo.repo}</Title>
              <div className="overflow-x-auto scroll-fade mt-2">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Workflow</TableHeaderCell>
                      <TableHeaderCell className="text-right">Fail / total</TableHeaderCell>
                      <TableHeaderCell className="text-right">Rate</TableHeaderCell>
                      <TableHeaderCell>Last fail</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {repo.workflows.map((w) => (
                      <TableRow key={w.name}>
                        <TableCell className="font-medium">{w.name}</TableCell>
                        <TableCell className="text-right tnum">
                          {w.fail}/{w.total}
                        </TableCell>
                        <TableCell className="text-right tnum">
                          <Badge color={w.fail_rate >= 0.5 ? "rose" : "amber"}>
                            {(w.fail_rate * 100).toFixed(0)}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {w.last_fail_url ? (
                            <GhLink href={w.last_fail_url}>
                              {w.last_fail_at
                                ? new Date(w.last_fail_at).toLocaleDateString()
                                : "open"}
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
            </Card>
          ))}
        </Grid>
      )}
    </Section>
  );
}

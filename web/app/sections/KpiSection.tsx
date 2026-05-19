import { Card, Text, Grid } from "@tremor/react";
import { readJson, type Overview, type RepoRow, type DepRow } from "../lib/data";
import { Section } from "../components/Section";
import { Kpi } from "../components/Kpi";

export default async function KpiSection() {
  const [overview, repos, deps] = await Promise.all([
    readJson<Overview>("overview.json"),
    readJson<RepoRow[]>("repos.json", []),
    readJson<DepRow[]>("dependencies.json", []),
  ]);

  const totals = repos.reduce(
    (a, r) => ({
      openPr: a.openPr + r.human_open_pr,
      stalePr: a.stalePr + r.human_stale_pr,
      merged: a.merged + r.human_merged_pr,
      commits: a.commits + r.commits_window,
    }),
    { openPr: 0, stalePr: 0, merged: 0, commits: 0 },
  );

  const botOpen = deps.reduce((a, d) => a + d.bot_open_pr, 0);

  return (
    <Grid numItemsSm={2} numItemsMd={5} className="gap-4">
      <Kpi label="Open PRs (human)" value={totals.openPr} hint="Currently in flight" />
      <Kpi
        label="Open PRs (bot)"
        value={botOpen}
        hint="Dependabot / Renovate"
        tone={botOpen > 0 ? "warn" : "default"}
      />
      <Kpi
        label="Stale PRs"
        value={totals.stalePr}
        hint=">idle threshold"
        tone={totals.stalePr > 0 ? "warn" : "default"}
      />
      <Kpi label="Merged (window)" value={totals.merged} hint={`${overview.window_days}d throughput`} />
      <Kpi label="Commits (window, all)" value={totals.commits} hint="Anonymous, all authors" />
    </Grid>
  );
}

export async function GlossarySection() {
  const overview = await readJson<Overview>("overview.json");
  return (
    <Section id="glossary" title="Metrics glossary">
      <Card>
        <Text className="mb-3">
          All metrics use a rolling {overview.window_days}-day window over public repos of{" "}
          <b>{overview.org}</b>. Bots are detected via GraphQL <code>__typename = Bot</code> +
          configured login list and routed to Dependency Pulse so they don&rsquo;t skew human
          numbers.
        </Text>
        <ul className="list-disc space-y-2 pl-5 text-sm">
          <li>
            <b>Open / Stale / Merged / Commits</b> — work in flight, idle PRs over threshold,
            merged throughput, anonymous commit volume from <code>participation</code> API.
          </li>
          <li>
            <b>Lead time (median, h)</b> — hours from PR createdAt → mergedAt. Lower &amp; stable = healthy.
          </li>
          <li>
            <b>TTFR (time-to-first-review)</b> — hours until the first non-author, non-bot review.
            Pure review-responsiveness, isolated from merge waiting.
          </li>
          <li>
            <b>Reviewers</b> — counts of approve / comment / changes_requested per reviewer. Excludes
            self-reviews and bots.
          </li>
          <li>
            <b>PR size buckets</b> — XS &lt;10, S 10–49, M 50–249, L 250–999, XL ≥1000 lines
            (add+del). XL PRs are a quality smell.
          </li>
          <li>
            <b>Stale PRs</b> — actionable list (repo, number, author, days idle). Sorted oldest first; rose ≥ 30d.
          </li>
          <li>
            <b>CI success / failures</b> — workflow_run conclusion stats. Small-sample rates are noisy (n in parens).
          </li>
          <li>
            <b>Weekly PR activity (by user)</b> — created or merged PRs per ISO week per author, bots toggleable.
          </li>
          <li>
            <b>Dependency Pulse</b> — bot merge velocity per repo; rising median merge time = upgrade debt.
          </li>
        </ul>
        <Text className="mt-4 text-xs text-slate-500 dark:text-slate-400">
          Public repos only. Long-term time-series, full DORA, and AI summaries are deferred.
        </Text>
      </Card>
    </Section>
  );
}

// Pure metric functions over the processed rows in ./data.ts. Everything takes
// an explicit Window so the UI can re-slice 30/60/90 days without a rebuild.
import type { Dashboard, IssueRow, PullRow, RepoMeta, RunRow, WeekRow } from "./data";

export type Window = { days: number; now: Date };

export const SIZE_ORDER = ["XS", "S", "M", "L", "XL"] as const;
export type SizeBucket = (typeof SIZE_ORDER)[number];
export const SIZE_THRESHOLDS: Record<SizeBucket, string> = {
  XS: "<10",
  S: "10-49",
  M: "50-249",
  L: "250-999",
  XL: ">=1000",
};

/** Minimum merged-with-review PRs before a TTFR figure is shown. */
export const TTFR_MIN_SAMPLE = 5;

// ---------------------------------------------------------------- helpers

export function windowStart(w: Window, offsetDays = 0): string {
  return new Date(w.now.getTime() - (w.days + offsetDays) * 86_400_000).toISOString();
}

/** ISO timestamps compare lexicographically when they share the Z/offset form. */
export function inWindow(iso: string | null | undefined, w: Window): boolean {
  return !!iso && iso >= windowStart(w) && iso <= w.now.toISOString();
}

export function hoursBetween(a: string, b: string): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / 3_600_000;
}

export function daysSince(iso: string, w: Window): number {
  return Math.floor((w.now.getTime() - new Date(iso).getTime()) / 86_400_000);
}

export function quantile(xs: number[], q: number): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(s.length - 1, Math.round((s.length - 1) * q)));
  return s[idx];
}

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const r2 = (x: number | null) => (x == null ? null : Math.round(x * 100) / 100);

export function sizeBucket(loc: number): SizeBucket {
  if (loc < 10) return "XS";
  if (loc < 50) return "S";
  if (loc < 250) return "M";
  if (loc < 1000) return "L";
  return "XL";
}

export function isoWeek(iso: string): string {
  const d = new Date(iso);
  // ISO week: Thursday of the same week decides the year.
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(t.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((t.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

// ------------------------------------------------------------ PR slices

export const humanPulls = (pulls: PullRow[]) => pulls.filter((p) => !p.author_is_bot);
export const botPulls = (pulls: PullRow[]) => pulls.filter((p) => p.author_is_bot);
export const mergedIn = (pulls: PullRow[], w: Window) =>
  pulls.filter((p) => inWindow(p.merged_at, w));
export const createdIn = <T extends { created_at: string }>(rows: T[], w: Window) =>
  rows.filter((p) => inWindow(p.created_at, w));
export const openNow = <T extends { state: string }>(rows: T[]) =>
  rows.filter((r) => r.state === "OPEN");

/** Open PRs untouched for longer than `staleDays`. */
export function stalePulls(pulls: PullRow[], w: Window, staleDays: number): StalePr[] {
  return openNow(humanPulls(pulls))
    .filter((p) => daysSince(p.updated_at, w) >= staleDays)
    .map((p) => ({
      repo: p.repo,
      number: p.number,
      title: p.title,
      author: p.author,
      url: p.url,
      created_at: p.created_at,
      updated_at: p.updated_at,
      days_idle: daysSince(p.updated_at, w),
      loc: p.additions + p.deletions,
      is_draft: p.draft,
    }))
    .sort((a, b) => b.days_idle - a.days_idle);
}

export type StalePr = {
  repo: string;
  number: number;
  title: string;
  author: string | null;
  url: string;
  created_at: string;
  updated_at: string;
  days_idle: number;
  loc: number;
  is_draft: boolean;
};

export type Spread = { median_h: number | null; p90_h: number | null; sample: number };

function spread(hours: number[]): Spread {
  return { median_h: r2(median(hours)), p90_h: r2(quantile(hours, 0.9)), sample: hours.length };
}

/** Hours from PR creation to merge, over human PRs merged inside the window. */
export function leadTime(pulls: PullRow[], w: Window): Spread {
  return spread(mergedIn(humanPulls(pulls), w).map((p) => hoursBetween(p.created_at, p.merged_at!)));
}

/**
 * Hours to the first *human* review on human PRs created in the window.
 * Returns null below TTFR_MIN_SAMPLE so a solo maintainer isn't shown noise.
 */
export function ttfr(pulls: PullRow[], w: Window): Spread | null {
  const hours = createdIn(humanPulls(pulls), w)
    .filter((p) => p.first_human_review_at)
    .map((p) => hoursBetween(p.created_at, p.first_human_review_at!))
    .filter((h) => h >= 0);
  return hours.length >= TTFR_MIN_SAMPLE ? spread(hours) : null;
}

/** Share of human PRs merged in the window by their own author with no human review. */
export function selfMergeRate(pulls: PullRow[], w: Window): { rate: number | null; sample: number } {
  const merged = mergedIn(humanPulls(pulls), w);
  const self = merged.filter((p) => p.self_merged).length;
  return { rate: merged.length ? self / merged.length : null, sample: merged.length };
}

export type SizeRow = { repo?: string; author?: string } & Record<SizeBucket, number> & {
  total: number;
};

function emptySize(): Record<SizeBucket, number> {
  return { XS: 0, S: 0, M: 0, L: 0, XL: 0 };
}

/** Size buckets of human PRs created in the window, grouped by repo and by author. */
export function prSize(pulls: PullRow[], w: Window): { by_repo: SizeRow[]; by_author: SizeRow[] } {
  const byRepo = new Map<string, Record<SizeBucket, number>>();
  const byAuthor = new Map<string, Record<SizeBucket, number>>();
  for (const p of createdIn(humanPulls(pulls), w)) {
    const b = sizeBucket(p.additions + p.deletions);
    (byRepo.get(p.repo) ?? byRepo.set(p.repo, emptySize()).get(p.repo)!)[b] += 1;
    const a = p.author ?? "(unknown)";
    (byAuthor.get(a) ?? byAuthor.set(a, emptySize()).get(a)!)[b] += 1;
  }
  const total = (c: Record<SizeBucket, number>) => SIZE_ORDER.reduce((s, k) => s + c[k], 0);
  return {
    by_repo: [...byRepo].map(([repo, c]) => ({ repo, ...c, total: total(c) })),
    by_author: [...byAuthor]
      .map(([author, c]) => ({ author, ...c, total: total(c) }))
      .sort((a, b) => b.total - a.total),
  };
}

export type Heatmap = { matrix: number[][]; max: number; total: number; peakDay: number; peakHour: number };

/** 7×24 UTC grid of human PR merges in the window. */
export function mergeHeatmap(pulls: PullRow[], w: Window): Heatmap {
  const matrix = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  let total = 0;
  for (const p of mergedIn(humanPulls(pulls), w)) {
    const d = new Date(p.merged_at!);
    matrix[d.getUTCDay()][d.getUTCHours()] += 1;
    total += 1;
  }
  let max = 0;
  let peakDay = 0;
  let peakHour = 0;
  matrix.forEach((row, d) =>
    row.forEach((c, h) => {
      if (c > max) {
        max = c;
        peakDay = d;
        peakHour = h;
      }
    }),
  );
  return { matrix, max, total, peakDay, peakHour };
}

export type UserWeekRow = { week: string; author: string; is_bot: boolean; created: number; merged: number };

/** PRs created and merged per ISO week per author (bots included, flagged). */
export function weeklyByAuthor(pulls: PullRow[], w: Window): UserWeekRow[] {
  const acc = new Map<string, UserWeekRow>();
  const bump = (week: string, p: PullRow, key: "created" | "merged") => {
    const author = p.author ?? "(unknown)";
    const id = `${week}|${author}`;
    const row = acc.get(id) ?? { week, author, is_bot: p.author_is_bot, created: 0, merged: 0 };
    row[key] += 1;
    acc.set(id, row);
  };
  for (const p of pulls) {
    if (inWindow(p.created_at, w)) bump(isoWeek(p.created_at), p, "created");
    if (inWindow(p.merged_at, w)) bump(isoWeek(p.merged_at!), p, "merged");
  }
  return [...acc.values()].sort((a, b) => a.week.localeCompare(b.week) || a.author.localeCompare(b.author));
}

export type Reviewer = {
  login: string;
  bot: boolean;
  approved: number;
  commented: number;
  changes_requested: number;
  dismissed: number;
  total: number;
  repos: number;
};

/** Review counts per reviewer on human PRs, from reviews submitted in the window. Self-reviews are already excluded by the processor. */
export function reviewLoad(pulls: PullRow[], w: Window): { human: Reviewer[]; ai: Reviewer[] } {
  const acc = new Map<string, Reviewer & { repoSet: Set<string> }>();
  for (const p of humanPulls(pulls)) {
    for (const rv of p.reviews ?? []) {
      if (!inWindow(rv.at, w)) continue;
      const r =
        acc.get(rv.login) ??
        {
          login: rv.login,
          bot: rv.bot,
          approved: 0,
          commented: 0,
          changes_requested: 0,
          dismissed: 0,
          total: 0,
          repos: 0,
          repoSet: new Set<string>(),
        };
      const state = (rv.state ?? "").toLowerCase();
      if (state === "approved") r.approved += 1;
      else if (state === "commented") r.commented += 1;
      else if (state === "changes_requested") r.changes_requested += 1;
      else if (state === "dismissed") r.dismissed += 1;
      r.total += 1;
      r.repoSet.add(p.repo);
      acc.set(rv.login, r);
    }
  }
  const rows = [...acc.values()]
    .map(({ repoSet, ...r }) => ({ ...r, repos: repoSet.size }))
    .sort((a, b) => b.total - a.total);
  return { human: rows.filter((r) => !r.bot), ai: rows.filter((r) => r.bot) };
}

export type UserAgg = {
  author: string;
  open_pr: number;
  merged_pr: number;
  additions: number;
  deletions: number;
  changed_files: number;
  lead_time_median_h: number | null;
  repos: number;
};

/** Per-author throughput: open now, merged in window, LOC of merged PRs. */
export function userStats(pulls: PullRow[], w: Window): UserAgg[] {
  const acc = new Map<
    string,
    { open: number; merged: number; add: number; del: number; files: number; leads: number[]; repos: Set<string> }
  >();
  for (const p of pulls) {
    const merged = inWindow(p.merged_at, w);
    if (p.state !== "OPEN" && !merged) continue;
    const a = p.author ?? "(unknown)";
    const r = acc.get(a) ?? { open: 0, merged: 0, add: 0, del: 0, files: 0, leads: [], repos: new Set<string>() };
    if (p.state === "OPEN") r.open += 1;
    if (merged) {
      r.merged += 1;
      r.add += p.additions;
      r.del += p.deletions;
      r.files += p.changed_files;
      r.leads.push(hoursBetween(p.created_at, p.merged_at!));
    }
    r.repos.add(p.repo);
    acc.set(a, r);
  }
  return [...acc]
    .map(([author, r]) => ({
      author,
      open_pr: r.open,
      merged_pr: r.merged,
      additions: r.add,
      deletions: r.del,
      changed_files: r.files,
      lead_time_median_h: r2(median(r.leads)),
      repos: r.repos.size,
    }))
    .sort((a, b) => b.merged_pr - a.merged_pr);
}

// ------------------------------------------------------------ dependencies

export type DepRow = {
  name: string;
  bot_open_pr: number;
  bot_merged_pr: number;
  bot_lead_time_median_h: number | null;
  oldest_open_days: number | null;
};

/** Bot PR pulse per repo: open now, merged in window, median merge time. */
export function depPulse(pulls: PullRow[], w: Window, repos: RepoMeta[]): DepRow[] {
  const bots = botPulls(pulls);
  return repos.map((repo) => {
    const mine = bots.filter((p) => p.repo === repo.name);
    const open = openNow(mine);
    const merged = mergedIn(mine, w);
    return {
      name: repo.name,
      bot_open_pr: open.length,
      bot_merged_pr: merged.length,
      bot_lead_time_median_h: r2(median(merged.map((p) => hoursBetween(p.created_at, p.merged_at!)))),
      oldest_open_days: open.length ? Math.max(...open.map((p) => daysSince(p.created_at, w))) : null,
    };
  });
}

// --------------------------------------------------------------------- CI

/** Runs whose conclusion is a real verdict; cancelled/skipped/in-progress are excluded from rates. */
export const decidedRuns = (runs: RunRow[]) =>
  runs.filter((r) => r.conclusion === "success" || r.conclusion === "failure");

export type WorkflowFail = {
  name: string;
  fail: number;
  total: number;
  fail_rate: number;
  last_fail_url: string | null;
  last_fail_at: string | null;
};
export type CiFailRepo = { repo: string; workflows: WorkflowFail[] };

export type CiOptions = { excludeEvents?: string[] };

/** Per-repo workflows with at least one failure in the window, worst first. */
export function ciFailures(runs: RunRow[], w: Window, opts: CiOptions = {}): CiFailRepo[] {
  const skip = new Set(opts.excludeEvents ?? []);
  const perRepo = new Map<string, Map<string, WorkflowFail>>();
  for (const r of decidedRuns(runs)) {
    if (!inWindow(r.created_at, w) || (r.event && skip.has(r.event))) continue;
    const wfs = perRepo.get(r.repo) ?? perRepo.set(r.repo, new Map()).get(r.repo)!;
    const s =
      wfs.get(r.workflow) ??
      wfs
        .set(r.workflow, { name: r.workflow, fail: 0, total: 0, fail_rate: 0, last_fail_url: null, last_fail_at: null })
        .get(r.workflow)!;
    s.total += 1;
    if (r.conclusion === "failure") {
      s.fail += 1;
      if (!s.last_fail_at || r.created_at > s.last_fail_at) {
        s.last_fail_at = r.created_at;
        s.last_fail_url = r.url;
      }
    }
  }
  return [...perRepo]
    .map(([repo, wfs]) => ({
      repo,
      workflows: [...wfs.values()]
        .filter((s) => s.fail > 0)
        .map((s) => ({ ...s, fail_rate: Math.round((s.fail / s.total) * 1000) / 1000 }))
        .sort((a, b) => b.fail - a.fail || b.fail_rate - a.fail_rate)
        .slice(0, 5),
    }))
    .filter((x) => x.workflows.length)
    .sort((a, b) => sum(b.workflows, "fail") - sum(a.workflows, "fail"));
}

const sum = <T,>(xs: T[], k: keyof T) => xs.reduce((a, x) => a + (x[k] as number), 0);

/** success / (success + failure) over decided runs in the window, per repo. */
export function ciPassRate(runs: RunRow[], w: Window, opts: CiOptions = {}): Map<string, { rate: number; runs: number }> {
  const skip = new Set(opts.excludeEvents ?? []);
  const acc = new Map<string, { ok: number; runs: number }>();
  for (const r of decidedRuns(runs)) {
    if (!inWindow(r.created_at, w) || (r.event && skip.has(r.event))) continue;
    const a = acc.get(r.repo) ?? { ok: 0, runs: 0 };
    a.runs += 1;
    if (r.conclusion === "success") a.ok += 1;
    acc.set(r.repo, a);
  }
  return new Map([...acc].map(([repo, a]) => [repo, { rate: a.ok / a.runs, runs: a.runs }]));
}

// ------------------------------------------------------------------ issues

export type StaleIssue = IssueRow & { days_idle: number };

export function staleIssues(issues: IssueRow[], w: Window, staleDays: number): StaleIssue[] {
  return openNow(issues)
    .map((i) => ({ ...i, days_idle: daysSince(i.updated_at, w) }))
    .filter((i) => i.days_idle >= staleDays)
    .sort((a, b) => b.days_idle - a.days_idle);
}

export type IssueStats = {
  open: number;
  unassigned_open: number;
  opened: number;
  closed: number;
  time_to_close: Spread;
  by_label: { label: string; open: number; closed: number }[];
};

export function issueStats(issues: IssueRow[], w: Window): IssueStats {
  const open = openNow(issues);
  const opened = createdIn(issues, w);
  const closed = issues.filter((i) => inWindow(i.closed_at, w));
  const labels = new Map<string, { open: number; closed: number }>();
  for (const i of [...open, ...closed]) {
    for (const l of i.labels) {
      const c = labels.get(l) ?? { open: 0, closed: 0 };
      if (i.state === "OPEN") c.open += 1;
      else c.closed += 1;
      labels.set(l, c);
    }
  }
  return {
    open: open.length,
    unassigned_open: open.filter((i) => i.assignees.length === 0).length,
    opened: opened.length,
    closed: closed.length,
    time_to_close: spread(closed.map((i) => hoursBetween(i.created_at, i.closed_at!))),
    by_label: [...labels]
      .map(([label, c]) => ({ label, ...c }))
      .sort((a, b) => b.open + b.closed - (a.open + a.closed)),
  };
}

// -------------------------------------------------------------------- repos

export type RepoRow = {
  name: string;
  url: string;
  lang: string | null;
  pushed_at: string | null;
  human_open_pr: number;
  human_stale_pr: number;
  human_merged_pr: number;
  open_issues: number;
  commits_window: number;
  lead_time_median_h: number | null;
  ttfr_median_h: number | null;
  ttfr_p90_h: number | null;
  ttfr_sample: number;
  ci_success_rate: number | null;
  ci_runs: number;
  bot_open_pr: number;
  dormant: boolean;
};

/** Everything per repo. `commits_window` comes from weekly participation stats, so it is week-granular. */
export function repoHealth(d: Dashboard, w: Window, opts: CiOptions = {}): RepoRow[] {
  const ci = ciPassRate(d.runs, w, opts);
  const stale = new Set(stalePulls(d.pulls, w, d.overview.stale_pr_days).map((p) => `${p.repo}#${p.number}`));
  return d.repos.map((repo) => {
    const pulls = d.pulls.filter((p) => p.repo === repo.name);
    const human = humanPulls(pulls);
    const open = openNow(human);
    const merged = mergedIn(human, w);
    const t = ttfr(pulls, w);
    const c = ci.get(repo.name);
    const openIssues = openNow(d.issues.filter((i) => i.repo === repo.name)).length;
    const row: RepoRow = {
      name: repo.name,
      url: repo.url,
      lang: repo.lang,
      pushed_at: repo.pushed_at,
      human_open_pr: open.length,
      human_stale_pr: open.filter((p) => stale.has(`${p.repo}#${p.number}`)).length,
      human_merged_pr: merged.length,
      open_issues: openIssues,
      commits_window: commitsIn(d.weeks, w, repo.name),
      lead_time_median_h: r2(median(merged.map((p) => hoursBetween(p.created_at, p.merged_at!)))),
      ttfr_median_h: t?.median_h ?? null,
      ttfr_p90_h: t?.p90_h ?? null,
      ttfr_sample: t?.sample ?? 0,
      ci_success_rate: c ? Math.round(c.rate * 1000) / 1000 : null,
      ci_runs: c?.runs ?? 0,
      bot_open_pr: openNow(botPulls(pulls)).length,
      dormant: false,
    };
    row.dormant =
      row.human_open_pr + row.human_merged_pr + row.open_issues + row.commits_window + (c?.runs ?? 0) === 0;
    return row;
  });
}

// ------------------------------------------------------------------- weeks

export type WeekTotal = { week: string; commits: number };

/** Org-wide commits per ISO week, limited to the weeks that overlap the window. */
export function weeksIn(weeks: WeekRow[], w: Window, repo?: string): WeekTotal[] {
  const totals = new Map<string, number>();
  for (const r of weeks) {
    if (repo && r.repo !== repo) continue;
    totals.set(r.week, (totals.get(r.week) ?? 0) + r.commits);
  }
  const n = Math.max(1, Math.ceil(w.days / 7));
  return [...totals]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-n)
    .map(([week, commits]) => ({ week, commits }));
}

export const commitsIn = (weeks: WeekRow[], w: Window, repo?: string) =>
  weeksIn(weeks, w, repo).reduce((a, x) => a + x.commits, 0);

// --------------------------------------------------------------------- KPI

export type Kpis = {
  open_pr_human: number;
  open_pr_bot: number;
  stale_pr: number;
  merged: number;
  issues_open: number;
  issues_closed: number;
  lead_time_median_h: number | null;
  ci_pass_rate: number | null;
  commits: number;
};

export function kpis(d: Dashboard, w: Window, opts: CiOptions = {}): Kpis {
  const decided = decidedRuns(d.runs).filter(
    (r) => inWindow(r.created_at, w) && !(r.event && (opts.excludeEvents ?? []).includes(r.event)),
  );
  return {
    open_pr_human: openNow(humanPulls(d.pulls)).length,
    open_pr_bot: openNow(botPulls(d.pulls)).length,
    stale_pr: stalePulls(d.pulls, w, d.overview.stale_pr_days).length,
    merged: mergedIn(humanPulls(d.pulls), w).length,
    issues_open: openNow(d.issues).length,
    issues_closed: d.issues.filter((i) => inWindow(i.closed_at, w)).length,
    lead_time_median_h: leadTime(d.pulls, w).median_h,
    ci_pass_rate: decided.length ? decided.filter((r) => r.conclusion === "success").length / decided.length : null,
    commits: commitsIn(d.weeks, w),
  };
}

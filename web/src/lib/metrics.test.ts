import { describe, expect, it } from "vitest";
import type { Dashboard, IssueRow, PullRow, RunRow } from "./data";
import {
  ciFailures,
  ciPassRate,
  isoWeek,
  kpis,
  leadTime,
  mergeHeatmap,
  prSize,
  quantile,
  repoHealth,
  reviewLoad,
  selfMergeRate,
  sizeBucket,
  staleIssues,
  stalePulls,
  ttfr,
  userStats,
  type Window,
} from "./metrics";

const NOW = new Date("2026-10-22T00:00:00Z");
const W: Window = { days: 30, now: NOW };
const ago = (days: number, hours = 0) =>
  new Date(NOW.getTime() - days * 86_400_000 - hours * 3_600_000).toISOString();

function pr(over: Partial<PullRow> & { number: number }): PullRow {
  return {
    repo: "app",
    title: `PR ${over.number}`,
    url: `https://github.com/org/app/pull/${over.number}`,
    state: "MERGED",
    draft: false,
    author: "alice",
    author_is_bot: false,
    created_at: ago(5),
    updated_at: ago(4),
    merged_at: ago(4),
    closed_at: ago(4),
    additions: 20,
    deletions: 5,
    changed_files: 2,
    labels: [],
    review_decision: null,
    first_human_review_at: null,
    first_ai_review_at: null,
    human_reviews: 0,
    ai_reviews: 0,
    reviews: [],
    self_merged: true,
    ...over,
  };
}

function run(over: Partial<RunRow> & { id: number }): RunRow {
  return {
    repo: "app",
    workflow: "CI",
    run_number: over.id,
    attempt: 1,
    conclusion: "success",
    event: "push",
    branch: "main",
    actor: "alice",
    title: "t",
    created_at: ago(2),
    duration_s: 60,
    url: null,
    failed_jobs: [],
    ...over,
  };
}

function issue(over: Partial<IssueRow> & { number: number }): IssueRow {
  return {
    repo: "app",
    title: `I ${over.number}`,
    url: "",
    state: "OPEN",
    author: "alice",
    author_is_bot: false,
    created_at: ago(10),
    updated_at: ago(10),
    closed_at: null,
    labels: [],
    assignees: [],
    comments: 0,
    ...over,
  };
}

const pulls: PullRow[] = [
  pr({ number: 1 }), // merged in window, self-merged
  pr({ number: 2, created_at: ago(60), merged_at: ago(50), closed_at: ago(50), updated_at: ago(50) }), // outside window
  pr({ number: 3, state: "OPEN", merged_at: null, closed_at: null, created_at: ago(20), updated_at: ago(20), self_merged: false }), // stale open
  pr({ number: 4, state: "OPEN", merged_at: null, closed_at: null, created_at: ago(1), updated_at: ago(1), self_merged: false }),
  pr({ number: 5, author: "dependabot", author_is_bot: true, state: "OPEN", merged_at: null, closed_at: null, created_at: ago(40), updated_at: ago(40) }),
  pr({
    number: 6,
    created_at: ago(3),
    merged_at: ago(2),
    updated_at: ago(2),
    human_reviews: 1,
    ai_reviews: 1,
    first_human_review_at: ago(3, -2), // 2h after creation
    first_ai_review_at: ago(3, -1),
    reviews: [
      { login: "bob", bot: false, state: "APPROVED", at: ago(3, -2) },
      { login: "cubic-dev-ai", bot: true, state: "COMMENTED", at: ago(3, -1) },
    ],
    self_merged: false,
    additions: 1500,
    deletions: 0,
  }),
];

const runs: RunRow[] = [
  run({ id: 1 }),
  run({ id: 2, conclusion: "failure", created_at: ago(1), url: "u2" }),
  run({ id: 3, conclusion: "cancelled" }),
  run({ id: 4, conclusion: "failure", created_at: ago(45) }), // outside window
  run({ id: 5, event: "dynamic", conclusion: "success" }),
];

const issues: IssueRow[] = [
  issue({ number: 1, updated_at: ago(40) }), // stale, unassigned
  issue({ number: 2, assignees: ["alice"], updated_at: ago(1) }),
  issue({ number: 3, state: "CLOSED", closed_at: ago(2), created_at: ago(4) }),
];

const dash: Dashboard = {
  overview: { generated_at: NOW.toISOString(), window_days: 90, org: "org", repo_count: 1, stale_pr_days: 14, stale_issue_days: 30 },
  repos: [{ name: "app", url: "", lang: "Go", pushed_at: null, default_branch: "main" }],
  pulls,
  issues,
  runs,
  weeks: [
    { repo: "app", week: "2026-W41", commits: 10 },
    { repo: "app", week: "2026-W42", commits: 5 },
    { repo: "other", week: "2026-W42", commits: 7 },
  ],
};

describe("helpers", () => {
  it("quantile picks nearest rank", () => {
    expect(quantile([1, 2, 3, 4, 10], 0.9)).toBe(10);
    expect(quantile([], 0.5)).toBeNull();
  });
  it("sizeBucket thresholds", () => {
    expect(["XS", "S", "M", "L", "XL"]).toEqual([9, 10, 50, 250, 1000].map(sizeBucket));
  });
  it("isoWeek handles year boundary", () => {
    expect(isoWeek("2026-01-01T00:00:00Z")).toBe("2026-W01");
    expect(isoWeek("2027-01-01T00:00:00Z")).toBe("2026-W53");
  });
});

describe("PR metrics", () => {
  it("lead time only counts human PRs merged inside the window", () => {
    const lt = leadTime(pulls, W);
    expect(lt.sample).toBe(2); // #1 and #6, not #2 (outside) nor #5 (bot)
    expect(lt.median_h).toBe(24); // (24h + 24h) / 2
  });
  it("ttfr ignores AI reviews and hides small samples", () => {
    expect(ttfr(pulls, W)).toBeNull();
    const many = Array.from({ length: 5 }, (_, i) =>
      pr({ number: 100 + i, created_at: ago(3), first_human_review_at: ago(3, -2), human_reviews: 1 }),
    );
    expect(ttfr(many, W)?.median_h).toBe(2);
  });
  it("self-merge rate", () => {
    expect(selfMergeRate(pulls, W)).toEqual({ rate: 0.5, sample: 2 });
  });
  it("stale PRs use updated_at and exclude bots", () => {
    expect(stalePulls(pulls, W, 14).map((p) => p.number)).toEqual([3]);
  });
  it("size buckets by repo over PRs created in window", () => {
    // #1, #3, #4, #6 were created in the window (#2 is older, #5 is a bot)
    const s = prSize(pulls, W).by_repo[0];
    expect(s).toMatchObject({ repo: "app", S: 3, XL: 1, total: 4 });
  });
  it("review load splits human and AI", () => {
    const rl = reviewLoad(pulls, W);
    expect(rl.human).toEqual([expect.objectContaining({ login: "bob", approved: 1, total: 1, repos: 1 })]);
    expect(rl.ai[0].login).toBe("cubic-dev-ai");
  });
  it("heatmap counts merges in window", () => {
    expect(mergeHeatmap(pulls, W).total).toBe(2);
  });
  it("user stats", () => {
    const alice = userStats(pulls, W).find((u) => u.author === "alice")!;
    expect(alice).toMatchObject({ open_pr: 2, merged_pr: 2, additions: 1520 });
  });
});

describe("CI metrics", () => {
  it("pass rate ignores cancelled runs and runs outside the window", () => {
    expect(ciPassRate(runs, W).get("app")).toEqual({ rate: 2 / 3, runs: 3 });
  });
  it("excludeEvents drops dynamic runs", () => {
    expect(ciPassRate(runs, W, { excludeEvents: ["dynamic"] }).get("app")).toEqual({ rate: 0.5, runs: 2 });
  });
  it("failures list keeps last failure link", () => {
    const f = ciFailures(runs, W);
    expect(f[0].workflows[0]).toMatchObject({ name: "CI", fail: 1, total: 3, last_fail_url: "u2" });
  });
});

describe("issues + repos + kpis", () => {
  it("stale issues", () => {
    expect(staleIssues(issues, W, 30).map((i) => i.number)).toEqual([1]);
  });
  it("repoHealth", () => {
    const r = repoHealth(dash, W)[0];
    expect(r).toMatchObject({ human_open_pr: 2, human_stale_pr: 1, human_merged_pr: 2, open_issues: 2, bot_open_pr: 1, ci_runs: 3, commits_window: 15, dormant: false });
  });
  it("kpis", () => {
    expect(kpis(dash, W)).toMatchObject({
      open_pr_human: 2,
      open_pr_bot: 1,
      stale_pr: 1,
      merged: 2,
      issues_open: 2,
      issues_closed: 1,
      commits: 22,
    });
  });
});

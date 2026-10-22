// Row types mirror collector/src/insights/process.py. The processor only
// normalizes; every metric is derived in ./metrics.ts.

export type Overview = {
  generated_at: string;
  window_days: number;
  org: string;
  repo_count: number;
  stale_pr_days: number;
  stale_issue_days: number;
};

export type RepoMeta = {
  name: string;
  url: string;
  lang: string | null;
  pushed_at: string | null;
  default_branch: string | null;
};

export type Review = { login: string; bot: boolean; state: string | null; at: string };

export type PullRow = {
  repo: string;
  number: number;
  title: string;
  url: string;
  state: "OPEN" | "MERGED" | "CLOSED";
  draft: boolean;
  author: string | null;
  author_is_bot: boolean;
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  closed_at: string | null;
  additions: number;
  deletions: number;
  changed_files: number;
  labels: string[];
  review_decision: string | null;
  first_human_review_at: string | null;
  first_ai_review_at: string | null;
  human_reviews: number;
  ai_reviews: number;
  reviews: Review[];
  self_merged: boolean;
};

export type IssueRow = {
  repo: string;
  number: number;
  title: string;
  url: string;
  state: "OPEN" | "CLOSED";
  author: string | null;
  author_is_bot: boolean;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  labels: string[];
  assignees: string[];
  comments: number;
};

export type FailedJob = { name: string | null; step: string | null; url: string | null };

export type RunRow = {
  repo: string;
  id: number;
  workflow: string;
  run_number: number | null;
  attempt: number;
  conclusion: string | null;
  event: string | null;
  branch: string | null;
  actor: string | null;
  title: string | null;
  created_at: string;
  duration_s: number | null;
  url: string | null;
  failed_jobs: FailedJob[];
};

export type WeekRow = { week: string; commits: number };

export type Dashboard = {
  overview: Overview;
  repos: RepoMeta[];
  pulls: PullRow[];
  issues: IssueRow[];
  runs: RunRow[];
  weeks: WeekRow[];
};

// Each JSON is a dynamic import so Vite emits it as its own chunk and the
// route loader fetches them in parallel. Dev and build both read
// ../data/processed directly (see server.fs.allow in vite.config.ts).
// `resolveJsonModule` infers literal shapes from the committed JSON, so the
// import is widened to unknown and trusted to match the row types above.
async function load<T>(importer: () => Promise<{ default: unknown }>, fallback: T): Promise<T> {
  try {
    return (await importer()).default as T;
  } catch (e) {
    console.warn("processed JSON missing, using fallback", e);
    return fallback;
  }
}

export async function loadDashboard(): Promise<Dashboard> {
  const [overview, repos, pulls, issues, runs, weeks] = await Promise.all([
    import("../../../data/processed/overview.json").then((m) => m.default as Overview),
    load<RepoMeta[]>(() => import("../../../data/processed/repos.json"), []),
    load<PullRow[]>(() => import("../../../data/processed/pulls.json"), []),
    load<IssueRow[]>(() => import("../../../data/processed/issues.json"), []),
    load<RunRow[]>(() => import("../../../data/processed/workflow_runs.json"), []),
    load<WeekRow[]>(() => import("../../../data/processed/activity_weekly.json"), []),
  ]);
  return { overview, repos, pulls, issues, runs, weeks };
}

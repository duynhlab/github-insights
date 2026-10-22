export type Overview = {
  generated_at: string;
  window_days: number;
  org: string;
  repo_count: number;
};

export type RepoRow = {
  name: string;
  url?: string;
  lang: string | null;
  size_kb?: number;
  pushed_at?: string;
  open_issues?: number;
  human_open_pr: number;
  human_stale_pr: number;
  human_merged_pr: number;
  commits_window: number;
  lead_time_median_h: number | null;
  lead_time_p95_h?: number | null;
  ttfr_median_h?: number | null;
  ttfr_p90_h?: number | null;
  ttfr_sample?: number;
  ci_success_rate: number | null;
  ci_runs: number;
};

export type DepRow = {
  name: string;
  bot_open_pr: number;
  bot_merged_pr: number;
  bot_lead_time_median_h: number | null;
};

export type WeekRow = { week: string; commits: number };

export type PrRow = {
  repo: string;
  url?: string;
  number: number;
  title: string;
  state: string;
  draft: boolean;
  author: string | null;
  created_at: string;
  merged_at: string | null;
  additions: number;
  deletions: number;
  changed_files: number;
  lead_time_h: number | null;
};

export type UserWeekRow = {
  week: string;
  author: string;
  is_bot: boolean;
  created: number;
  merged: number;
};

export type Reviewer = {
  login: string;
  approved: number;
  commented: number;
  changes_requested: number;
  dismissed: number;
  total: number;
  repos: number;
};

export type SizeRow = {
  repo?: string;
  author?: string;
  XS: number;
  S: number;
  M: number;
  L: number;
  XL: number;
  total: number;
};

export type PrSize = {
  by_repo: SizeRow[];
  by_author: SizeRow[];
  buckets: string[];
  thresholds: Record<string, string>;
};

export type TtfrRow = {
  repo?: string;
  author?: string;
  sample: number;
  median_h: number | null;
  p90_h: number | null;
};

export type Ttfr = { by_repo: TtfrRow[]; by_author: TtfrRow[] };

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

export type WorkflowFail = {
  name: string;
  fail: number;
  total: number;
  fail_rate: number;
  last_fail_url: string | null;
  last_fail_at: string | null;
};

export type CiFailRepo = { repo: string; workflows: WorkflowFail[] };

export type Dashboard = {
  overview: Overview;
  repos: RepoRow[];
  deps: DepRow[];
  weeks: WeekRow[];
  userWeekly: UserWeekRow[];
  pullsHuman: PrRow[];
  pullsBot: PrRow[];
  reviewers: Reviewer[];
  prSize: PrSize;
  ttfr: Ttfr;
  stalePrs: StalePr[];
  ciFailures: CiFailRepo[];
};

// Each JSON is a dynamic import so Vite emits it as its own chunk and the
// route loader fetches them in parallel. Dev and build both read
// ../data/processed directly (see server.fs.allow in vite.config.ts).
async function load<T>(importer: () => Promise<{ default: T }>, fallback: T): Promise<T> {
  try {
    return (await importer()).default;
  } catch (e) {
    console.warn("processed JSON missing, using fallback", e);
    return fallback;
  }
}

const EMPTY_SIZE: PrSize = {
  by_repo: [],
  by_author: [],
  buckets: ["XS", "S", "M", "L", "XL"],
  thresholds: {},
};

export async function loadDashboard(): Promise<Dashboard> {
  const [
    overview,
    repos,
    deps,
    weeks,
    userWeekly,
    pullsHuman,
    pullsBot,
    reviewers,
    prSize,
    ttfr,
    stalePrs,
    ciFailures,
  ] = await Promise.all([
    import("../../../data/processed/overview.json").then((m) => m.default as Overview),
    load<RepoRow[]>(() => import("../../../data/processed/repos.json"), []),
    load<DepRow[]>(() => import("../../../data/processed/dependencies.json"), []),
    load<WeekRow[]>(() => import("../../../data/processed/activity_weekly.json"), []),
    load<UserWeekRow[]>(() => import("../../../data/processed/activity_user_weekly.json"), []),
    load<PrRow[]>(() => import("../../../data/processed/pulls_human.json"), []),
    load<PrRow[]>(() => import("../../../data/processed/pulls_bot.json"), []),
    load<Reviewer[]>(() => import("../../../data/processed/reviewers.json"), []),
    load<PrSize>(() => import("../../../data/processed/pr_size.json"), EMPTY_SIZE),
    load<Ttfr>(() => import("../../../data/processed/ttfr.json"), { by_repo: [], by_author: [] }),
    load<StalePr[]>(() => import("../../../data/processed/stale_prs.json"), []),
    load<CiFailRepo[]>(() => import("../../../data/processed/ci_failures.json"), []),
  ]);
  return {
    overview,
    repos,
    deps,
    weeks,
    userWeekly,
    pullsHuman,
    pullsBot,
    reviewers,
    prSize,
    ttfr,
    stalePrs,
    ciFailures,
  };
}

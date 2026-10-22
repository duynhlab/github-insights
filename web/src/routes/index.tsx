import { useMemo } from "react";
import { createFileRoute, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { loadDashboard, type Dashboard } from "@/lib/data";
import {
  botPulls,
  ciFailures,
  depPulse,
  humanPulls,
  mergeHeatmap,
  prSize,
  repoHealth,
  reviewLoad,
  stalePulls,
  userStats,
  weeklyByAuthor,
  weeksIn,
  type Window,
} from "@/lib/metrics";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/Skeletons";
import StickyNav from "@/components/StickyNav";
import ThemeToggle from "@/components/ThemeToggle";
import KpiSection, { GlossarySection } from "@/sections/KpiSection";
import WeeklyActivitySection from "@/sections/WeeklyActivitySection";
import UserActivitySection from "@/sections/UserActivitySection";
import RepoHealthSection from "@/sections/RepoHealthSection";
import UsersSection from "@/sections/UsersSection";
import ReviewersSection from "@/sections/ReviewersSection";
import PrSizeSection from "@/sections/PrSizeSection";
import MergeHeatmapSection from "@/sections/MergeHeatmapSection";
import TtfrSection from "@/sections/TtfrSection";
import StaleSection from "@/sections/StaleSection";
import CiSection from "@/sections/CiSection";
import DepsSection from "@/sections/DepsSection";

export const Route = createFileRoute("/")({
  loader: loadDashboard,
  pendingComponent: PageSkeleton,
  errorComponent: ErrorPage,
  component: DashboardPage,
});

function ErrorPage({ error }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-16 text-center">
      <h1 className="font-mono text-2xl font-semibold">Dashboard failed to load</h1>
      <p className="text-sm text-muted-foreground">
        {error instanceof Error ? error.message : String(error)}
      </p>
      <Button type="button" onClick={() => router.invalidate()}>
        Retry
      </Button>
    </main>
  );
}

function Header({ overview }: { overview: Dashboard["overview"] }) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <h1 className="font-mono text-3xl font-semibold leading-none tracking-tight sm:text-4xl">
          {overview.org} — GitHub Insights
        </h1>
        <p className="text-xs text-muted-foreground">
          {overview.repo_count} public repos · rolling {overview.window_days}d · generated{" "}
          <time dateTime={overview.generated_at}>
            {new Date(overview.generated_at).toLocaleString()}
          </time>
        </p>
      </div>
      <ThemeToggle />
    </header>
  );
}

// Dynamic runs (Dependabot / CodeQL default setup) would otherwise dominate CI rates.
const CI_OPTS = { excludeEvents: ["dynamic"] };

function DashboardPage() {
  const d = Route.useLoaderData();
  const m = useMemo(() => {
    const w: Window = { days: d.overview.window_days, now: new Date(d.overview.generated_at) };
    const repos = repoHealth(d, w, CI_OPTS);
    return {
      w,
      repos,
      deps: depPulse(d.pulls, w, d.repos),
      weeks: weeksIn(d.weeks, w),
      userWeekly: weeklyByAuthor(d.pulls, w),
      users: userStats(humanPulls(d.pulls), w),
      bots: userStats(botPulls(d.pulls), w),
      reviewers: reviewLoad(d.pulls, w),
      prSize: prSize(d.pulls, w),
      heatmap: mergeHeatmap(d.pulls, w),
      ttfr: {
        by_repo: repos
          .filter((r) => r.ttfr_sample > 0)
          .map((r) => ({ repo: r.name, sample: r.ttfr_sample, median_h: r.ttfr_median_h, p90_h: r.ttfr_p90_h })),
      },
      stalePrs: stalePulls(d.pulls, w, d.overview.stale_pr_days),
      ciFailures: ciFailures(d.runs, w, CI_OPTS),
    };
  }, [d]);

  return (
    <div className="min-h-dvh">
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto max-w-6xl space-y-6 px-4 py-6 focus:outline-none sm:px-6"
      >
        <Header overview={d.overview} />
        <StickyNav />
        <KpiSection overview={d.overview} repos={m.repos} deps={m.deps} />
        <WeeklyActivitySection weeks={m.weeks} />
        <UserActivitySection data={m.userWeekly} />
        <RepoHealthSection repos={m.repos} />
        <UsersSection users={m.users} bots={m.bots} />
        <ReviewersSection reviewers={[...m.reviewers.human, ...m.reviewers.ai]} />
        <PrSizeSection prSize={m.prSize} />
        <MergeHeatmapSection heatmap={m.heatmap} />
        <TtfrSection ttfr={m.ttfr} />
        <StaleSection stalePrs={m.stalePrs} />
        <CiSection ciFailures={m.ciFailures} />
        <DepsSection deps={m.deps} />
        <GlossarySection overview={d.overview} />
      </main>
    </div>
  );
}

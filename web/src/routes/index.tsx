import { createFileRoute, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { loadDashboard, type Dashboard } from "@/lib/data";
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

function DashboardPage() {
  const d = Route.useLoaderData();
  return (
    <div className="min-h-dvh">
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto max-w-6xl space-y-6 px-4 py-6 focus:outline-none sm:px-6"
      >
        <Header overview={d.overview} />
        <StickyNav />
        <KpiSection overview={d.overview} repos={d.repos} deps={d.deps} />
        <WeeklyActivitySection weeks={d.weeks} />
        <UserActivitySection data={d.userWeekly} />
        <RepoHealthSection repos={d.repos} />
        <UsersSection pullsHuman={d.pullsHuman} pullsBot={d.pullsBot} />
        <ReviewersSection reviewers={d.reviewers} />
        <PrSizeSection prSize={d.prSize} />
        <MergeHeatmapSection pulls={d.pullsHuman} />
        <TtfrSection ttfr={d.ttfr} />
        <StaleSection stalePrs={d.stalePrs} />
        <CiSection ciFailures={d.ciFailures} />
        <DepsSection deps={d.deps} />
        <GlossarySection overview={d.overview} />
      </main>
    </div>
  );
}

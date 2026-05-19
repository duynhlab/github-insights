import { Suspense } from "react";
import { Grid } from "@tremor/react";
import { readJson, type Overview } from "./lib/data";
import StickyNav from "./components/StickyNav";
import ThemeToggle from "./components/ThemeToggle";
import {
  ChartSkeleton,
  KpiSkeleton,
  TableSkeleton,
} from "./components/Skeleton";

import KpiSection, { GlossarySection } from "./sections/KpiSection";
import WeeklyActivitySection from "./sections/WeeklyActivitySection";
import UserActivitySection from "./sections/UserActivitySection";
import RepoHealthSection from "./sections/RepoHealthSection";
import UsersSection from "./sections/UsersSection";
import ReviewersSection from "./sections/ReviewersSection";
import PrSizeSection from "./sections/PrSizeSection";
import TtfrSection from "./sections/TtfrSection";
import StaleSection from "./sections/StaleSection";
import CiSection from "./sections/CiSection";
import DepsSection from "./sections/DepsSection";

async function Header() {
  const overview = await readJson<Overview>("overview.json");
  return (
    <header className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {overview.org} — GitHub Insights
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
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

function KpiGridFallback() {
  return (
    <Grid numItemsSm={2} numItemsMd={5} className="gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <KpiSkeleton key={i} />
      ))}
    </Grid>
  );
}

function SectionFallback({
  id,
  title,
  kind = "table",
}: {
  id: string;
  title: string;
  kind?: "table" | "chart";
}) {
  return (
    <section id={id} className="section-anchor space-y-3" aria-busy="true">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {kind === "chart" ? <ChartSkeleton /> : <TableSkeleton />}
    </section>
  );
}

export default function Page() {
  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6">
        <Suspense
          fallback={
            <header className="space-y-2">
              <div className="skeleton h-7 w-72" />
              <div className="skeleton h-4 w-96" />
            </header>
          }
        >
          <Header />
        </Suspense>

        <StickyNav />

        <Suspense fallback={<KpiGridFallback />}>
          <KpiSection />
        </Suspense>

        <Suspense fallback={<SectionFallback id="activity" title="Weekly commit activity" kind="chart" />}>
          <WeeklyActivitySection />
        </Suspense>

        <Suspense fallback={<SectionFallback id="users-chart" title="Weekly PR activity (by user)" kind="chart" />}>
          <UserActivitySection />
        </Suspense>

        <Suspense fallback={<SectionFallback id="health" title="Repo Health" />}>
          <RepoHealthSection />
        </Suspense>

        <Suspense fallback={<SectionFallback id="users" title="By User" />}>
          <UsersSection />
        </Suspense>

        <Suspense fallback={<SectionFallback id="reviewers" title="Review load by user" />}>
          <ReviewersSection />
        </Suspense>

        <Suspense fallback={<SectionFallback id="size" title="PR size distribution" kind="chart" />}>
          <PrSizeSection />
        </Suspense>

        <Suspense fallback={<SectionFallback id="ttfr" title="Review speed (time-to-first-review)" />}>
          <TtfrSection />
        </Suspense>

        <Suspense fallback={<SectionFallback id="stale" title="Stale PRs" />}>
          <StaleSection />
        </Suspense>

        <Suspense fallback={<SectionFallback id="ci" title="CI failures by workflow" />}>
          <CiSection />
        </Suspense>

        <Suspense fallback={<SectionFallback id="deps" title="Dependency Pulse" />}>
          <DepsSection />
        </Suspense>

        <Suspense fallback={<SectionFallback id="glossary" title="Metrics glossary" />}>
          <GlossarySection />
        </Suspense>
      </main>
    </div>
  );
}

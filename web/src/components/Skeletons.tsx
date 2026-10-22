import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ChartSkeleton({ height = 256 }: { height?: number }) {
  return (
    <Card>
      <CardContent>
        <Skeleton className="mb-3 h-4 w-32" />
        <Skeleton className="w-full" style={{ height }} />
      </CardContent>
    </Card>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Card>
      <CardContent>
        <div className="mb-3 grid grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-4" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="grid grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, j) => (
                <Skeleton key={j} className="h-4" />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function KpiSkeleton() {
  return (
    <Card size="sm">
      <CardContent>
        <Skeleton className="mb-3 h-3 w-24" />
        <Skeleton className="mb-2 h-8 w-16" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

function SectionSkeleton({ title, kind = "table" }: { title: string; kind?: "table" | "chart" }) {
  return (
    <section className="section-anchor space-y-3" aria-busy="true">
      <h2 className="font-mono text-xl font-semibold tracking-tight">{title}</h2>
      {kind === "chart" ? <ChartSkeleton /> : <TableSkeleton />}
    </section>
  );
}

/** Whole-page fallback while the route loader fetches processed JSON. */
export function PageSkeleton() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6" aria-busy="true">
      <header className="space-y-2">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </header>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <KpiSkeleton key={i} />
        ))}
      </div>
      <SectionSkeleton title="Weekly commit activity" kind="chart" />
      <SectionSkeleton title="Repo Health" />
      <SectionSkeleton title="By User" />
    </main>
  );
}

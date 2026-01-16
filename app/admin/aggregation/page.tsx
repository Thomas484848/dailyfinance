import { prisma } from '@/lib/prisma';
import { loadAggregatorConfig } from '@/lib/aggregation/config';

export const dynamic = 'force-dynamic';

export default async function AggregationDashboard() {
  const config = loadAggregatorConfig();
  const [jobCount, runCount, cacheCount, metricsCount, latestJobs] = await Promise.all([
    prisma.job.count(),
    prisma.jobRun.count(),
    prisma.providerCache.count(),
    prisma.metrics.count(),
    prisma.job.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { runs: { take: 5, orderBy: { startedAt: 'desc' } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Dashboard Aggregation</h1>
        <p className="text-muted-foreground">
          Quotas, jobs et cache pour l&apos;agregateur multi-providers.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Jobs</div>
          <div className="text-2xl font-semibold">{jobCount}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Job runs</div>
          <div className="text-2xl font-semibold">{runCount}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Cache provider</div>
          <div className="text-2xl font-semibold">{cacheCount}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Metrics</div>
          <div className="text-2xl font-semibold">{metricsCount}</div>
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold mb-3">Quotas providers</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {Object.entries(config.quotas).map(([provider, quota]) => (
            <div key={provider} className="rounded-md border p-3">
              <div className="font-medium capitalize">{provider}</div>
              <div className="text-sm text-muted-foreground">
                rpm: {quota.requestsPerMinute ?? ''} | rpd: {quota.requestsPerDay ?? ''} |
                concurrent: {quota.maxConcurrent ?? ''}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold mb-3">Derniers jobs</h2>
        <div className="space-y-4">
          {latestJobs.map((job) => (
            <div key={job.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{job.type}</div>
                  <div className="text-xs text-muted-foreground">
                    {job.status}  {job.createdAt.toLocaleString('fr-FR')}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  runs: {job.runs.length}
                </div>
              </div>
              {job.runs.length > 0 && (
                <div className="mt-2 text-sm text-muted-foreground">
                  {job.runs.map((run) => (
                    <div key={run.id}>
                      {run.status}  {run.startedAt?.toLocaleString('fr-FR') ?? ''}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

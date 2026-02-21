import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { listErrors, getTimeline, listCodebases } from '../api/client';
import { ErrorTimeline } from '../components/errors/ErrorTimeline';

function StatCard({
  label,
  value,
  subtext,
  color = 'brand',
}: {
  label: string;
  value: string | number;
  subtext?: string;
  color?: 'brand' | 'danger' | 'success' | 'warning';
}) {
  const colorMap = {
    brand: 'text-brand-400',
    danger: 'text-red-400',
    success: 'text-emerald-400',
    warning: 'text-amber-400',
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-surface p-6">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${colorMap[color]}`}>{value}</p>
      {subtext && <p className="mt-1 text-xs text-gray-600">{subtext}</p>}
    </div>
  );
}

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function DashboardPage() {
  const { data: codebases = [] } = useQuery({
    queryKey: ['codebases'],
    queryFn: listCodebases,
  });

  const selectedCodebaseId =
    localStorage.getItem('radiator_selected_codebase') ?? codebases[0]?.id;

  const { data: errorsData } = useQuery({
    queryKey: ['errors', 'recent'],
    queryFn: () => listErrors({ limit: 5 }),
  });

  const { data: allErrorsData } = useQuery({
    queryKey: ['errors', 'count-24h'],
    queryFn: () =>
      listErrors({
        since: Date.now() - 24 * 60 * 60 * 1000,
        limit: 1,
      }),
  });

  const { data: timelineData, isLoading: timelineLoading } = useQuery({
    queryKey: ['timeline', selectedCodebaseId],
    queryFn: () =>
      getTimeline(
        selectedCodebaseId!,
        Date.now() - 24 * 60 * 60 * 1000,
        Date.now(),
        48,
      ),
    enabled: !!selectedCodebaseId,
  });

  const recentErrors = errorsData?.errors ?? [];
  const totalErrors24h = allErrorsData?.total ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your runtime type monitoring
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Errors (24h)"
          value={totalErrors24h}
          color="danger"
          subtext="Total errors in the last 24 hours"
        />
        <StatCard
          label="Total Errors"
          value={errorsData?.total ?? 0}
          color="warning"
          subtext="All time"
        />
        <StatCard
          label="Codebases"
          value={codebases.length}
          color="brand"
          subtext="Connected codebases"
        />
        <StatCard
          label="Status"
          value={totalErrors24h > 0 ? 'Active' : 'Clean'}
          color={totalErrors24h > 0 ? 'warning' : 'success'}
          subtext={totalErrors24h > 0 ? 'Errors detected' : 'No recent errors'}
        />
      </div>

      {/* Timeline */}
      <ErrorTimeline
        data={timelineData?.timeline ?? []}
        loading={timelineLoading}
      />

      {/* Recent errors */}
      <div className="rounded-xl border border-gray-800 bg-surface">
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
          <h3 className="text-sm font-semibold text-gray-200">Recent Errors</h3>
          <Link
            to="/errors"
            className="text-xs font-medium text-brand-400 hover:text-brand-300"
          >
            View all
          </Link>
        </div>

        {recentErrors.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No errors recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-gray-800/50">
            {recentErrors.map((err) => (
              <Link
                key={err.id}
                to={`/errors/${err.id}`}
                className="flex items-center justify-between px-6 py-3.5 transition-colors hover:bg-gray-800/30"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-red-400">
                    {err.error_name}
                  </span>
                  <span className="mt-0.5 text-xs text-gray-500 line-clamp-1">
                    {err.error_message}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-mono text-xs text-gray-400">
                    {err.function_name}
                  </span>
                  <span className="mt-0.5 text-xs text-gray-600">
                    {timeAgo(err.created_at)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

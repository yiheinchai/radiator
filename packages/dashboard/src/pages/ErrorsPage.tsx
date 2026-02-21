import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listErrors, getTimeline, listCodebases } from '../api/client';
import { ErrorList } from '../components/errors/ErrorList';
import { ErrorTimeline } from '../components/errors/ErrorTimeline';
import { ErrorFilters, getTimeRangeMs } from '../components/errors/ErrorFilters';

export function ErrorsPage() {
  const [timeRange, setTimeRange] = useState('24h');
  const [errorType, setErrorType] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 25;

  const { data: codebases = [] } = useQuery({
    queryKey: ['codebases'],
    queryFn: listCodebases,
  });

  const selectedCodebaseId =
    localStorage.getItem('radiator_selected_codebase') ?? codebases[0]?.id;

  const since = Date.now() - getTimeRangeMs(timeRange);

  const { data: errorsData, isLoading } = useQuery({
    queryKey: ['errors', selectedCodebaseId, timeRange, errorType, offset],
    queryFn: () =>
      listErrors({
        codebaseId: selectedCodebaseId,
        since,
        limit,
        offset,
        errorName: errorType || undefined,
      }),
  });

  const { data: timelineData, isLoading: timelineLoading } = useQuery({
    queryKey: ['timeline', selectedCodebaseId, timeRange],
    queryFn: () =>
      getTimeline(selectedCodebaseId!, since, Date.now(), 50),
    enabled: !!selectedCodebaseId,
  });

  // Extract unique error types for the filter dropdown
  const errorTypes = [
    ...new Set(errorsData?.errors.map((e) => e.error_name) ?? []),
  ];

  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range);
    setOffset(0);
  };

  const handleErrorTypeChange = (type: string) => {
    setErrorType(type);
    setOffset(0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Errors</h1>
          <p className="mt-1 text-sm text-gray-500">
            Runtime type errors detected across your codebase
          </p>
        </div>
        <ErrorFilters
          timeRange={timeRange}
          onTimeRangeChange={handleTimeRangeChange}
          errorType={errorType}
          onErrorTypeChange={handleErrorTypeChange}
          errorTypes={errorTypes}
        />
      </div>

      <ErrorTimeline
        data={timelineData?.timeline ?? []}
        loading={timelineLoading}
      />

      {isLoading ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-gray-800 bg-surface">
          <div className="text-sm text-gray-500">Loading errors...</div>
        </div>
      ) : (
        <ErrorList
          errors={errorsData?.errors ?? []}
          total={errorsData?.total ?? 0}
          limit={limit}
          offset={offset}
          onPageChange={setOffset}
        />
      )}
    </div>
  );
}

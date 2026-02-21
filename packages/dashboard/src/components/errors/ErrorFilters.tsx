interface ErrorFiltersProps {
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
  errorType: string;
  onErrorTypeChange: (type: string) => void;
  errorTypes?: string[];
}

const TIME_RANGES = [
  { label: '1h', value: '1h', ms: 60 * 60 * 1000 },
  { label: '6h', value: '6h', ms: 6 * 60 * 60 * 1000 },
  { label: '24h', value: '24h', ms: 24 * 60 * 60 * 1000 },
  { label: '7d', value: '7d', ms: 7 * 24 * 60 * 60 * 1000 },
  { label: '30d', value: '30d', ms: 30 * 24 * 60 * 60 * 1000 },
];

export function getTimeRangeMs(range: string): number {
  return TIME_RANGES.find((r) => r.value === range)?.ms ?? 24 * 60 * 60 * 1000;
}

export function ErrorFilters({
  timeRange,
  onTimeRangeChange,
  errorType,
  onErrorTypeChange,
  errorTypes = [],
}: ErrorFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Time range selector */}
      <div className="flex rounded-lg border border-gray-700 bg-surface-raised overflow-hidden">
        {TIME_RANGES.map((range) => (
          <button
            key={range.value}
            onClick={() => onTimeRangeChange(range.value)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              timeRange === range.value
                ? 'bg-brand-600 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>

      {/* Error type filter */}
      <select
        value={errorType}
        onChange={(e) => onErrorTypeChange(e.target.value)}
        className="rounded-lg border border-gray-700 bg-surface-raised px-3 py-1.5 text-xs text-gray-300 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      >
        <option value="">All error types</option>
        {errorTypes.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>
    </div>
  );
}

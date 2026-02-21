import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Brush,
} from 'recharts';
import type { TimelineBucket } from '../../api/client';

interface ErrorTimelineProps {
  data: TimelineBucket[];
  loading?: boolean;
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function formatTooltipTime(ts: number): string {
  return new Date(ts).toLocaleString();
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: number;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length || label === undefined) return null;

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 shadow-xl">
      <p className="text-xs text-gray-400">{formatTooltipTime(label)}</p>
      <p className="mt-1 text-sm font-semibold text-red-400">
        {payload[0].value} error{payload[0].value !== 1 ? 's' : ''}
      </p>
    </div>
  );
}

export function ErrorTimeline({ data, loading }: ErrorTimelineProps) {
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-gray-800 bg-surface">
        <div className="text-sm text-gray-500">Loading timeline...</div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-gray-800 bg-surface">
        <div className="text-sm text-gray-500">No timeline data available</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-surface p-4">
      <h3 className="mb-4 text-sm font-semibold text-gray-300">Error Timeline</h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="errorGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={formatTimestamp}
            stroke="#4b5563"
            tick={{ fontSize: 11 }}
            axisLine={{ stroke: '#374151' }}
          />
          <YAxis
            stroke="#4b5563"
            tick={{ fontSize: 11 }}
            axisLine={{ stroke: '#374151' }}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#ef4444"
            strokeWidth={2}
            fill="url(#errorGradient)"
            animationDuration={300}
          />
          <Brush
            dataKey="timestamp"
            height={30}
            stroke="#374151"
            fill="#111827"
            tickFormatter={formatTimestamp}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

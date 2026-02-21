import { Link } from 'react-router-dom';
import type { ErrorLogEntry } from '../../api/client';

interface ErrorListProps {
  errors: ErrorLogEntry[];
  total: number;
  limit: number;
  offset: number;
  onPageChange: (offset: number) => void;
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

export function ErrorList({ errors, total, limit, offset, onPageChange }: ErrorListProps) {
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  if (errors.length === 0) {
    return (
      <div className="rounded-xl border border-gray-800 bg-surface p-12 text-center">
        <svg className="mx-auto h-12 w-12 text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
        <h3 className="mt-3 text-sm font-medium text-gray-300">No errors found</h3>
        <p className="mt-1 text-sm text-gray-500">Your application is running clean.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-surface overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-800 text-left">
            <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Error
            </th>
            <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Function
            </th>
            <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
              File
            </th>
            <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Time
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/50">
          {errors.map((err) => (
            <tr
              key={err.id}
              className="transition-colors hover:bg-gray-800/30"
            >
              <td className="px-6 py-4">
                <Link
                  to={`/errors/${err.id}`}
                  className="group flex flex-col"
                >
                  <span className="text-sm font-medium text-red-400 group-hover:text-red-300">
                    {err.error_name}
                  </span>
                  <span className="mt-0.5 text-xs text-gray-500 line-clamp-1">
                    {err.error_message}
                  </span>
                </Link>
              </td>
              <td className="px-6 py-4">
                <span className="font-mono text-sm text-gray-300">
                  {err.function_name}
                </span>
              </td>
              <td className="px-6 py-4">
                <span className="font-mono text-xs text-gray-500 line-clamp-1">
                  {err.file_path}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                {timeAgo(err.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-800 px-6 py-3">
          <span className="text-sm text-gray-500">
            Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-400 transition-colors hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="flex items-center px-2 text-xs text-gray-500">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(offset + limit)}
              disabled={offset + limit >= total}
              className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-400 transition-colors hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

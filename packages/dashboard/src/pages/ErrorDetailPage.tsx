import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getErrorDetail } from '../api/client';
import { SnapshotViewer } from '../components/errors/SnapshotViewer';
import { openInVSCode } from '../lib/vscode';

export function ErrorDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['error', id],
    queryFn: () => getErrorDetail(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-sm text-gray-500">Loading error details...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <div className="text-sm text-red-400">
          {error instanceof Error ? error.message : 'Error not found'}
        </div>
        <Link to="/errors" className="text-sm text-brand-400 hover:text-brand-300">
          Back to errors
        </Link>
      </div>
    );
  }

  const { error: errorLog, snapshot } = data;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link to="/errors" className="text-gray-500 hover:text-gray-300">
          Errors
        </Link>
        <span className="text-gray-700">/</span>
        <span className="text-gray-300">{errorLog.error_name}</span>
      </div>

      {/* Error header */}
      <div className="rounded-xl border border-gray-800 bg-surface p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-red-400">
              {errorLog.error_name}
            </h1>
            <p className="mt-1 text-sm text-gray-400">
              {errorLog.error_message}
            </p>
          </div>

          <button
            onClick={() => openInVSCode(errorLog.file_path)}
            className="flex items-center gap-2 rounded-lg border border-gray-700 bg-surface-raised px-3 py-2 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.583 2.603a1.016 1.016 0 0 1 1.32.38l2.883 5a1.016 1.016 0 0 1-.38 1.32l-5 2.883a1.016 1.016 0 0 1-1.32-.38l-2.883-5a1.016 1.016 0 0 1 .38-1.32l5-2.883Z" />
            </svg>
            Open in VS Code
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-gray-600">Function</p>
            <p className="mt-1 font-mono text-sm text-gray-300">
              {errorLog.function_name}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">File</p>
            <p className="mt-1 font-mono text-xs text-gray-400 truncate">
              {errorLog.file_path}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Time</p>
            <p className="mt-1 text-sm text-gray-300">
              {new Date(errorLog.created_at).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Snapshot ID</p>
            <p className="mt-1 font-mono text-xs text-gray-500 truncate">
              {errorLog.snapshot_id}
            </p>
          </div>
        </div>

        {/* Stack trace */}
        {errorLog.error_stack && (
          <div className="mt-4">
            <p className="text-xs font-medium text-gray-500 mb-2">Stack Trace</p>
            <pre className="rounded-lg bg-gray-900 border border-gray-800 p-4 text-xs text-gray-400 overflow-x-auto whitespace-pre-wrap font-mono">
              {errorLog.error_stack}
            </pre>
          </div>
        )}
      </div>

      {/* Snapshot viewer */}
      {snapshot ? (
        <SnapshotViewer snapshot={snapshot} />
      ) : (
        <div className="rounded-xl border border-gray-800 bg-surface p-8 text-center">
          <p className="text-sm text-gray-500">
            No type snapshot available for this error.
          </p>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listCodebases, createCodebase } from '../api/client';

export function SettingsPage() {
  const queryClient = useQueryClient();
  const [newCodebaseName, setNewCodebaseName] = useState('');

  const { data: codebases = [] } = useQuery({
    queryKey: ['codebases'],
    queryFn: listCodebases,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => createCodebase(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['codebases'] });
      setNewCodebaseName('');
    },
  });

  const handleCreateCodebase = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCodebaseName.trim()) {
      createMutation.mutate(newCodebaseName.trim());
    }
  };

  const orgId = localStorage.getItem('radiator_org_id');

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your organization and codebases
        </p>
      </div>

      {/* Organization */}
      <section className="rounded-xl border border-gray-800 bg-surface p-6">
        <h2 className="text-lg font-semibold text-gray-200">Organization</h2>
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500">
              Organization ID
            </label>
            <p className="mt-1 font-mono text-sm text-gray-300">
              {orgId ?? 'Unknown'}
            </p>
          </div>
        </div>
      </section>

      {/* Codebases */}
      <section className="rounded-xl border border-gray-800 bg-surface p-6">
        <h2 className="text-lg font-semibold text-gray-200">Codebases</h2>
        <p className="mt-1 text-sm text-gray-500">
          Each codebase represents a separate project being monitored.
        </p>

        {/* Codebase list */}
        <div className="mt-4 space-y-2">
          {codebases.length === 0 ? (
            <p className="text-sm text-gray-600">No codebases yet. Create one below.</p>
          ) : (
            codebases.map((cb) => (
              <div
                key={cb.id}
                className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/50 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-200">{cb.name}</p>
                  <p className="mt-0.5 font-mono text-xs text-gray-600">{cb.id}</p>
                </div>
                <span className="text-xs text-gray-600">
                  {new Date(cb.created_at).toLocaleDateString()}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Create codebase form */}
        <form onSubmit={handleCreateCodebase} className="mt-4 flex gap-3">
          <input
            type="text"
            value={newCodebaseName}
            onChange={(e) => setNewCodebaseName(e.target.value)}
            placeholder="New codebase name"
            className="flex-1 rounded-lg border border-gray-700 bg-surface-raised px-4 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button
            type="submit"
            disabled={createMutation.isPending || !newCodebaseName.trim()}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createMutation.isPending ? 'Creating...' : 'Create'}
          </button>
        </form>

        {createMutation.error && (
          <p className="mt-2 text-sm text-red-400">
            {createMutation.error instanceof Error
              ? createMutation.error.message
              : 'Failed to create codebase'}
          </p>
        )}
      </section>

      {/* API Integration */}
      <section className="rounded-xl border border-gray-800 bg-surface p-6">
        <h2 className="text-lg font-semibold text-gray-200">API Integration</h2>
        <p className="mt-1 text-sm text-gray-500">
          Configure your Radiator client to send data to the server.
        </p>

        <div className="mt-4 rounded-lg bg-gray-900 border border-gray-800 p-4">
          <p className="text-xs font-medium text-gray-500 mb-2">
            radiator.config.ts
          </p>
          <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap">{`import { configure } from '@radiator/client';

configure({
  serverUrl: '${window.location.origin}',
  codebaseId: '${codebases[0]?.id ?? '<your-codebase-id>'}',
});`}</pre>
        </div>
      </section>
    </div>
  );
}

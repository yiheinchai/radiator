import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listCodebases, type Codebase } from '../../api/client';

const CODEBASE_KEY = 'radiator_selected_codebase';

export function useSelectedCodebase() {
  const [selectedId, setSelectedId] = useState<string | null>(
    () => localStorage.getItem(CODEBASE_KEY),
  );

  const { data: codebases = [] } = useQuery({
    queryKey: ['codebases'],
    queryFn: listCodebases,
  });

  const select = (id: string) => {
    localStorage.setItem(CODEBASE_KEY, id);
    setSelectedId(id);
  };

  const selected = codebases.find((c) => c.id === selectedId) ?? codebases[0] ?? null;

  return { codebases, selected, select };
}

export function Header() {
  const { codebases, selected, select } = useSelectedCodebase();

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-800 bg-surface px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-medium text-gray-400">Codebase</h2>
        <select
          value={selected?.id ?? ''}
          onChange={(e) => select(e.target.value)}
          className="rounded-lg border border-gray-700 bg-surface-raised px-3 py-1.5 text-sm text-gray-200 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          {codebases.length === 0 && (
            <option value="">No codebases</option>
          )}
          {codebases.map((cb: Codebase) => (
            <option key={cb.id} value={cb.id}>
              {cb.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-600/20 text-brand-400 text-xs font-semibold">
          U
        </span>
      </div>
    </header>
  );
}

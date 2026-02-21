import { useState } from 'react';
import type {
  FunctionTypeSnapshot,
  RadiatorType,
  VariableCapture,
} from '../../api/client';

interface SnapshotViewerProps {
  snapshot: FunctionTypeSnapshot;
}

// ── Color helpers ─────────────────────────────────────────────────────────────

function kindColor(kind: string): string {
  switch (kind) {
    case 'primitive':
      return 'text-emerald-400';
    case 'object':
    case 'class':
    case 'array':
      return 'text-blue-400';
    case 'null':
    case 'undefined':
      return 'text-red-400';
    case 'function':
      return 'text-purple-400';
    case 'union':
      return 'text-amber-400';
    default:
      return 'text-gray-400';
  }
}

function kindBadgeColor(kind: string): string {
  switch (kind) {
    case 'primitive':
      return 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20';
    case 'object':
    case 'class':
    case 'array':
      return 'bg-blue-400/10 text-blue-400 border-blue-400/20';
    case 'null':
    case 'undefined':
      return 'bg-red-400/10 text-red-400 border-red-400/20';
    case 'function':
      return 'bg-purple-400/10 text-purple-400 border-purple-400/20';
    case 'union':
      return 'bg-amber-400/10 text-amber-400 border-amber-400/20';
    default:
      return 'bg-gray-400/10 text-gray-400 border-gray-400/20';
  }
}

// ── Example value formatter ───────────────────────────────────────────────────

function formatExample(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') {
    const truncated = value.length > 60 ? value.slice(0, 60) + '...' : value;
    return `"${truncated}"`;
  }
  if (typeof value === 'object') {
    try {
      const s = JSON.stringify(value);
      return s.length > 80 ? s.slice(0, 80) + '...' : s;
    } catch {
      return '[Object]';
    }
  }
  return String(value);
}

// ── Type Node (recursive) ─────────────────────────────────────────────────────

interface TypeNodeProps {
  type: RadiatorType;
  name?: string;
  depth?: number;
  defaultExpanded?: boolean;
}

function TypeNode({ type, name, depth = 0, defaultExpanded = false }: TypeNodeProps) {
  const hasChildren =
    (type.properties && Object.keys(type.properties).length > 0) ||
    type.elementType ||
    type.parameters ||
    type.returnType ||
    type.unionOf;

  const [expanded, setExpanded] = useState(defaultExpanded || depth < 1);

  return (
    <div className={depth > 0 ? 'ml-4 border-l border-gray-800 pl-3' : ''}>
      <div
        className={`flex items-center gap-2 py-1 ${hasChildren ? 'cursor-pointer group' : ''}`}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {/* Expand/collapse indicator */}
        {hasChildren ? (
          <svg
            className={`h-3.5 w-3.5 text-gray-500 transition-transform ${expanded ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        ) : (
          <span className="inline-block w-3.5" />
        )}

        {/* Variable name */}
        {name && (
          <span className="font-mono text-sm text-gray-200">{name}</span>
        )}

        {name && <span className="text-gray-600">:</span>}

        {/* Type badge */}
        <span
          className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-mono ${kindBadgeColor(type.kind)}`}
        >
          {type.name}
        </span>

        {/* Kind label */}
        <span className={`text-xs ${kindColor(type.kind)}`}>
          {type.kind}
        </span>

        {/* Example values */}
        {type.examples && type.examples.length > 0 && (
          <span className="ml-2 text-xs text-gray-500 font-mono truncate max-w-xs">
            e.g. {formatExample(type.examples[0])}
          </span>
        )}

        {/* Null/undefined warning */}
        {(type.kind === 'null' || type.kind === 'undefined') && (
          <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-400">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            unexpected
          </span>
        )}
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div className="mt-0.5">
          {/* Object properties */}
          {type.properties &&
            Object.entries(type.properties).map(([propName, propType]) => (
              <TypeNode
                key={propName}
                type={propType}
                name={propName}
                depth={depth + 1}
              />
            ))}

          {/* Array element type */}
          {type.elementType && (
            <TypeNode
              type={type.elementType}
              name="[element]"
              depth={depth + 1}
            />
          )}

          {/* Function parameters */}
          {type.parameters?.map((param, i) => (
            <TypeNode
              key={i}
              type={param.type}
              name={`${param.name}${param.optional ? '?' : ''}`}
              depth={depth + 1}
            />
          ))}

          {/* Function return type */}
          {type.returnType && (
            <TypeNode
              type={type.returnType}
              name="[return]"
              depth={depth + 1}
            />
          )}

          {/* Union types */}
          {type.unionOf?.map((variant, i) => (
            <TypeNode
              key={i}
              type={variant}
              name={`variant[${i}]`}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Variable Capture Section ──────────────────────────────────────────────────

interface CaptureSectionProps {
  title: string;
  captures: VariableCapture[];
  defaultExpanded?: boolean;
}

function CaptureSection({ title, captures, defaultExpanded = true }: CaptureSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (captures.length === 0) return null;

  return (
    <div className="mt-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-semibold text-gray-300 hover:text-gray-100 transition-colors"
      >
        <svg
          className={`h-4 w-4 text-gray-500 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
        {title}
        <span className="text-xs text-gray-600 font-normal">({captures.length})</span>
      </button>

      {expanded && (
        <div className="mt-2 rounded-lg border border-gray-800 bg-gray-900/50 p-3">
          {captures.map((capture, i) => (
            <TypeNode
              key={i}
              type={capture.type}
              name={capture.name}
              defaultExpanded={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function SnapshotViewer({ snapshot }: SnapshotViewerProps) {
  return (
    <div className="rounded-xl border border-gray-800 bg-surface p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-200">Type Snapshot</h3>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              snapshot.captureMode === 'error'
                ? 'bg-red-500/10 text-red-400'
                : 'bg-emerald-500/10 text-emerald-400'
            }`}
          >
            {snapshot.captureMode}
          </span>
          <span className="text-xs text-gray-500">
            {snapshot.sampleCount} sample{snapshot.sampleCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Function signature */}
      <div className="rounded-lg bg-gray-900 border border-gray-800 px-4 py-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-purple-400 text-sm font-mono font-semibold">
            {snapshot.functionName}
          </span>
          <span className="text-gray-600 text-sm">(</span>
          <span className="text-gray-400 text-sm font-mono">
            {snapshot.parameters.map((p) => p.name).join(', ')}
          </span>
          <span className="text-gray-600 text-sm">)</span>
        </div>
        <div className="mt-1 text-xs text-gray-600 font-mono">
          {snapshot.filePath}
        </div>
      </div>

      {/* Error info */}
      {snapshot.error && (
        <div className="rounded-lg bg-red-500/5 border border-red-500/20 px-4 py-3 mb-4">
          <div className="text-sm font-semibold text-red-400">
            {snapshot.error.name}: {snapshot.error.message}
          </div>
          {snapshot.error.stack && (
            <pre className="mt-2 text-xs text-gray-500 overflow-x-auto whitespace-pre-wrap">
              {snapshot.error.stack}
            </pre>
          )}
        </div>
      )}

      {/* Parameters */}
      <CaptureSection
        title="Parameters"
        captures={snapshot.parameters}
        defaultExpanded={true}
      />

      {/* Local Variables */}
      <CaptureSection
        title="Local Variables"
        captures={snapshot.localVariables}
        defaultExpanded={true}
      />

      {/* Return Value */}
      {snapshot.returnValue && (
        <CaptureSection
          title="Return Value"
          captures={[snapshot.returnValue]}
          defaultExpanded={true}
        />
      )}

      {/* Legend */}
      <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-gray-800 pt-4">
        <span className="text-xs text-gray-600">Legend:</span>
        <span className="flex items-center gap-1.5 text-xs">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-gray-500">Primitive</span>
        </span>
        <span className="flex items-center gap-1.5 text-xs">
          <span className="inline-block h-2 w-2 rounded-full bg-blue-400" />
          <span className="text-gray-500">Object / Array</span>
        </span>
        <span className="flex items-center gap-1.5 text-xs">
          <span className="inline-block h-2 w-2 rounded-full bg-red-400" />
          <span className="text-gray-500">Null / Undefined</span>
        </span>
        <span className="flex items-center gap-1.5 text-xs">
          <span className="inline-block h-2 w-2 rounded-full bg-purple-400" />
          <span className="text-gray-500">Function</span>
        </span>
        <span className="flex items-center gap-1.5 text-xs">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
          <span className="text-gray-500">Union</span>
        </span>
      </div>
    </div>
  );
}

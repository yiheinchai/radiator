const BASE_URL = '/api';

function getToken(): string | null {
  return localStorage.getItem('radiator_token');
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) ?? {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    localStorage.removeItem('radiator_token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }

  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthResponse {
  token: string;
  userId: string;
  orgId: string;
}

export function login(email: string, password: string) {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function register(email: string, password: string, orgName: string) {
  return request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, orgName }),
  });
}

// ── Codebases ─────────────────────────────────────────────────────────────────

export interface Codebase {
  id: string;
  org_id: string;
  name: string;
  created_at: number;
}

export function listCodebases() {
  return request<Codebase[]>('/codebases');
}

export function createCodebase(name: string) {
  return request<{ id: string; name: string }>('/codebases', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

// ── Errors ────────────────────────────────────────────────────────────────────

export interface ErrorLogEntry {
  id: string;
  codebase_id: string;
  snapshot_id: string;
  error_name: string;
  error_message: string;
  error_stack: string | null;
  function_name: string;
  file_path: string;
  created_at: number;
}

export interface ErrorListResponse {
  errors: ErrorLogEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface ErrorListParams {
  codebaseId?: string;
  since?: number;
  until?: number;
  limit?: number;
  offset?: number;
  errorName?: string;
}

export function listErrors(params: ErrorListParams = {}) {
  const search = new URLSearchParams();
  if (params.codebaseId) search.set('codebaseId', params.codebaseId);
  if (params.since) search.set('since', String(params.since));
  if (params.until) search.set('until', String(params.until));
  if (params.limit) search.set('limit', String(params.limit));
  if (params.offset) search.set('offset', String(params.offset));
  if (params.errorName) search.set('errorName', params.errorName);

  const qs = search.toString();
  return request<ErrorListResponse>(`/errors${qs ? `?${qs}` : ''}`);
}

export interface ErrorDetailResponse {
  error: ErrorLogEntry;
  snapshot: FunctionTypeSnapshot | null;
}

export function getErrorDetail(id: string) {
  return request<ErrorDetailResponse>(`/errors/${id}`);
}

// ── Timeline ──────────────────────────────────────────────────────────────────

export interface TimelineBucket {
  timestamp: number;
  count: number;
  errors: Record<string, number>;
}

export interface TimelineResponse {
  timeline: TimelineBucket[];
  since: number;
  until: number;
  bucketSize: number;
}

export function getTimeline(
  codebaseId: string,
  since?: number,
  until?: number,
  buckets?: number,
) {
  const search = new URLSearchParams();
  if (since) search.set('since', String(since));
  if (until) search.set('until', String(until));
  if (buckets) search.set('buckets', String(buckets));

  const qs = search.toString();
  return request<TimelineResponse>(
    `/errors/timeline/${codebaseId}${qs ? `?${qs}` : ''}`,
  );
}

// ── Snapshot types (mirrors @radiator/common) ─────────────────────────────────

export type RadiatorTypeKind =
  | 'primitive'
  | 'object'
  | 'array'
  | 'function'
  | 'class'
  | 'null'
  | 'undefined'
  | 'union';

export interface RadiatorType {
  kind: RadiatorTypeKind;
  name: string;
  properties?: Record<string, RadiatorType>;
  elementType?: RadiatorType;
  parameters?: ParameterType[];
  returnType?: RadiatorType;
  constructorName?: string;
  examples?: unknown[];
  unionOf?: RadiatorType[];
}

export interface ParameterType {
  name: string;
  type: RadiatorType;
  optional?: boolean;
}

export interface SourceLocation {
  line: number;
  column: number;
  filePath?: string;
}

export interface VariableCapture {
  name: string;
  type: RadiatorType;
  location: SourceLocation;
  captureTimestamp: number;
}

export interface ErrorCapture {
  message: string;
  name: string;
  stack: string;
  causeChain: ErrorCapture[];
}

export interface FunctionTypeSnapshot {
  functionHash: string;
  functionName: string;
  filePath: string;
  parameters: VariableCapture[];
  localVariables: VariableCapture[];
  returnValue?: VariableCapture;
  captureMode: 'normal' | 'error';
  error?: ErrorCapture;
  timestamp: number;
  sampleCount: number;
}

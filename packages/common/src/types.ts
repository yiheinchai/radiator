// ─── Runtime Type Representation ─────────────────────────────────────────────

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

// ─── Source Location ─────────────────────────────────────────────────────────

export interface SourceLocation {
  line: number;
  column: number;
  filePath?: string;
}

// ─── Variable Capture ────────────────────────────────────────────────────────

export interface VariableCapture {
  name: string;
  type: RadiatorType;
  location: SourceLocation;
  captureTimestamp: number;
}

// ─── Function-Level Type Snapshot ────────────────────────────────────────────

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

// ─── Error Capture ───────────────────────────────────────────────────────────

export interface ErrorCapture {
  message: string;
  name: string;
  stack: string;
  causeChain: ErrorCapture[];
}

// ─── Content-Addressable Store Objects (git-like) ────────────────────────────

export interface RadiatorBlob {
  type: 'blob';
  hash: string;
  content: Uint8Array;
}

export interface TreeEntry {
  name: string;
  hash: string;
  mode: 'blob' | 'tree';
}

export interface RadiatorTree {
  type: 'tree';
  hash: string;
  entries: TreeEntry[];
}

export interface RadiatorCommit {
  type: 'commit';
  hash: string;
  tree: string;
  parent?: string;
  timestamp: number;
  message: string;
  codebaseId: string;
}

// ─── Configuration ───────────────────────────────────────────────────────────

export interface CaptureConfig {
  mode: 'normal' | 'error' | 'both';
  maxDepth: number;
  maxStringLength: number;
  maxArraySamples: number;
  maxProperties: number;
  flushIntervalMs: number;
  radiatorDir: string;
  serverUrl?: string;
  apiKey?: string;
  codebaseId?: string;
}

export const DEFAULT_CAPTURE_CONFIG: CaptureConfig = {
  mode: 'both',
  maxDepth: 3,
  maxStringLength: 200,
  maxArraySamples: 3,
  maxProperties: 50,
  flushIntervalMs: 5000,
  radiatorDir: '.radiator',
};

// ─── API Types ───────────────────────────────────────────────────────────────

export interface StoreRequest {
  codebaseId: string;
  snapshot: FunctionTypeSnapshot;
}

export interface QueryRequest {
  codebaseId: string;
  functionHash: string;
  mode?: 'normal' | 'error';
}

export interface ErrorLogEntry {
  id: string;
  codebaseId: string;
  snapshotId: string;
  errorName: string;
  errorMessage: string;
  errorStack?: string;
  functionName: string;
  filePath: string;
  createdAt: number;
}

// ─── Organization / Codebase ─────────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  createdAt: number;
}

export interface Codebase {
  id: string;
  orgId: string;
  name: string;
  createdAt: number;
}

export interface User {
  id: string;
  email: string;
  orgId: string;
  role: 'admin' | 'member';
  createdAt: number;
}

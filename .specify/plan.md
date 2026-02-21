# Radiator Implementation Plan

# Radiator: Git-Based Runtime Type Cache - Implementation Plan

## Context

Most TypeScript projects have incorrect or missing types. Radiator solves this by capturing runtime types from real execution and caching them using git-style content-addressable hashing. Two use cases:

1. **Type-informed development** - Hover over any variable in VSCode to see runtime types + example data
2. **Error debugging** - When errors occur, capture full type/data snapshots of all variables (like Datadog/Sentry but with full variable inspection)

The type cache is keyed to code content (AST hash), so it automatically maps to the matching code version as developers edit.

---

## Architecture Overview

### Monorepo Structure (pnpm + Turborepo)

```
rad/
├── .specify/                      # GitHub spec-kit
│   ├── constitution.md
│   ├── spec.md
│   ├── plan.md
│   └── tasks/
├── packages/
│   ├── common/                    # @radiator/common - shared types, hashing, serialization
│   ├── core/                      # @radiator/core - CAS store, capture orchestration
│   ├── transform/                 # @radiator/transform - Babel plugin for instrumentation
│   ├── client/                    # @radiator/client - lightweight runtime SDK
│   ├── server/                    # @radiator/server - Express API + SQLite + blob storage
│   └── dashboard/                 # @radiator/dashboard - React+Vite error monitoring UI
├── extensions/
│   └── vscode/                    # radiator-vscode - hover types + error browser
├── apps/
│   └── demo-bank/                 # Demo Express+React banking app with intentional bugs
│       ├── backend/
│       └── frontend/
├── tests/
│   └── integration/               # Cross-package integration tests
├── package.json                   # Workspace root
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

### Package Dependency Graph

```
@radiator/common  (zero deps - types, hashing, serialization)
    │
    ├── @radiator/core        (CAS object store, capture manager, sampling)
    │       │
    │       ├── @radiator/transform   (Babel plugin - instrumentation)
    │       │
    │       └── @radiator/client      (lightweight runtime SDK for apps)
    │
    ├── @radiator/server      (REST API, SQLite metadata, blob storage)
    │
    ├── @radiator/dashboard   (React error monitoring UI)
    │
    └── radiator-vscode       (HoverProvider, error browser)
```

Build order: `common` → `core` → `transform` + `client` + `server` (parallel) → `dashboard` + `vscode` (parallel) → `demo`

---

## Key Technical Decisions

| Decision            | Choice                                                                                    | Rationale                                                                                                                                        |
| ------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Instrumentation     | Babel plugin (user code only)                                                             | Works with Vite, webpack, Next.js, esbuild. Only instrument user-authored source files, exclude node_modules. Configurable include/exclude globs |
| Hashing             | SHA-256 of normalized AST                                                                 | Strip comments/whitespace/locations, serialize to canonical JSON, hash. Stable across formatting changes                                         |
| Local storage       | `.radiator/` directory                                                                    | Git-like `objects/` (2-char prefix dirs), `refs/`, `config`. Zero-config default                                                                 |
| Remote storage      | Express + SQLite + filesystem blobs                                                       | SQLite for metadata/queries (zero setup), filesystem for CAS blobs (like git)                                                                    |
| Type representation | JSON with examples                                                                        | `RadiatorType` with kind, name, properties, examples array. Depth-limited (3 normal, 5 error)                                                    |
| Testing             | Vitest (unit/integration), Supertest (API), Playwright (dashboard), @vscode/test-electron |                                                                                                                                                  |
| Package manager     | pnpm workspaces + Turborepo                                                               | Fast, reliable monorepo tooling                                                                                                                  |

---

## Phase 0: Project Scaffolding & Spec-Kit

- Initialize git repo, pnpm workspace, Turborepo pipeline
- Create `.specify/` with constitution.md, spec.md, plan.md, tasks/
- Shared configs: tsconfig.base.json, ESLint, Prettier, Vitest workspace
- `.gitignore`, `.npmrc`

---

## Phase 1: `@radiator/common` - Shared Foundation

**Critical files:**

- `src/types.ts` - Core data model: `RadiatorType` (kind, name, properties, examples), `VariableCapture`, `FunctionTypeSnapshot`, `ErrorCapture`, CAS objects (`RadiatorBlob`, `RadiatorTree`, `RadiatorCommit`), org/codebase types
- `src/hash.ts` - `hashContent()` (SHA-256), `hashObject()` (git-style `type length\0content`)
- `src/ast-hash.ts` - `normalizeAST()` strips loc/comments/extra, `hashFunctionAST()` parses → normalizes → canonical JSON → SHA-256. Uses `@babel/parser` as peer dep
- `src/type-capture.ts` - `captureType(value, maxDepth)` produces `RadiatorType` from runtime values. Handles primitives, objects, arrays, functions, null, undefined. Depth-limited, string-truncated, array-sampled
- `src/type-infer.ts` - `inferPropertyType(cachedType, propertyPath)` resolves `person.car` from cached `person` type. `mergeTypes()` unions across runs
- `src/serialize.ts` - Canonical JSON (sorted keys), depth-limited snapshots, zlib compress/decompress

---

## Phase 2: `@radiator/core` - CAS Store & Capture Engine

- `src/store/object-store.ts` - Git-like content-addressable storage in `.radiator/objects/`. Write/read/exists with 2-char prefix directories, zlib compression
- `src/store/tree-builder.ts` - Build tree hierarchy: file → functions → variables. Create commits pointing to root trees
- `src/capture/capture-manager.ts` - Central orchestrator: receives captures from instrumented code, manages pending snapshots, periodic flush (5s), immediate flush on error. Provides `capture()`, `onFunctionExit()`, `onFunctionError()`, `getSnapshot()`, `inferType()`
- `src/capture/sampler.ts` - Logarithmic sampling for normal mode (capture first 10, then at 100, 1000, etc.)
- `src/sync/sync-client.ts` - Push/pull to radiator-server (git-like object negotiation)

---

## Phase 3: `@radiator/transform` - Babel Plugin

**Most technically challenging component.**

- `src/plugin.ts` - Babel plugin visiting all `Function` nodes (declarations, expressions, arrows, methods, async, generators). For each function:
  1. Compute AST hash at build time (embedded as string literal - zero runtime hashing cost)
  2. Extract all parameter names (including destructured patterns)
  3. Scan body for `VariableDeclarator` to find local variables
  4. Wrap body in `try { ...captures... } catch(e) { onError() } finally { exitFunction() }`
  5. Inject `capture()` calls after each variable declaration and assignment
- `src/extract-params.ts` - Handle all patterns: `(a, b)`, `({name, age})`, `({name: n, ...rest})`, `([first, ...others])`, `(a = default)`
- `src/hash-at-build.ts` - Compute function hash during Babel transform (uses `@babel/generator` to print, then `hashFunctionAST`)
- `src/optimize.ts` - Sampling check as first statement (fast bail), lazy import, configurable depth, skip trivial functions

---

## Phase 4: `@radiator/client` + `@radiator/server`

### Client (lightweight runtime SDK)

- `src/index.ts` - Exports `enterFunction()`, `capture()`, `captureReturn()`, `onError()`, `exitFunction()`, `flush()`. Lazy-initializes CaptureManager. Registers `process.on('beforeExit', flush)`
- `src/config.ts` - Load from `.radiator/config`, env vars (`RADIATOR_SERVER_URL`, `RADIATOR_API_KEY`, `RADIATOR_MODE`)

### Server (Express + SQLite + blob storage)

- `src/app.ts` - Express app with routes for objects, snapshots, errors, orgs, codebases, auth, sync
- `src/db/schema.sql` - Tables: organizations, users, codebases, objects, snapshots (indexed by function_hash), error_logs (indexed by codebase + timestamp)
- `src/storage/blob-store.ts` - Filesystem CAS blob storage (same format as local `.radiator/objects/`)
- Auth: JWT-based, register/login/invite endpoints

**Key API routes:**

- `POST/GET /api/objects` - Store/retrieve type blobs
- `GET /api/snapshots/:functionHash` - Query by function hash
- `GET /api/errors` - Paginated, filterable error list with time range
- `POST /api/sync/push|pull` - Git-like sync
- `POST /api/auth/register|login|invite`

---

## Phase 5: VSCode Extension

- `src/extension.ts` - Register HoverProvider, ErrorTreeProvider, commands, status bar
- `src/providers/hover-provider.ts` - On hover: find enclosing function → hash AST → query cache → find variable → format hover with syntax-highlighted type + example data (TypeScript-style formatting)
- `src/providers/error-tree-provider.ts` - Tree view of errors grouped by file, click to load error snapshot
- `src/client.ts` - Try local `.radiator/` first, fall back to server

Hover format (TypeScript-style):

```
(radiator) person: {
  id: string
  name: string
  balance: number
}
---
Example: { id: "acc_123", name: "Alice", balance: 1500.00 }
```

---

## Phase 6: Web Dashboard (React + Vite + Tailwind)

Styling: **Tailwind CSS** (utility-first, fast to build, consistent)

- **Error monitoring** - Paginated error list with filters (time range, error type, file)
- **Timeline view** - Recharts timeline with click-and-drag zoom (like Datadog)
- **Error detail** - Full error info + interactive type snapshot tree viewer
- **Snapshot viewer** - Tree view showing each variable's type + data, highlighting unexpected types (null where number expected, etc.)
- **"Open in VSCode"** - Uses `vscode://` URI scheme to open file at error location with snapshot pre-loaded
- **Org management** - Sign up, create org, invite members, manage codebases
- Auth: JWT-based login/register

---

## Phase 7: Demo Banking App

### Backend (Express.js)

Banking API with accounts, transfers, users. Instrumented with `@radiator/transform` Babel plugin.

**Intentional edge-case bugs:**

1. **Null balance** - Newly created account has `balance: null` instead of `0`, causing `NaN` in arithmetic
2. **Negative zero** - Race condition allows `amount = -0` which passes `> 0` check but corrupts balances
3. **Float precision** - `0.1 + 0.2 !== 0.3` causes balance discrepancies on certain amounts
4. **Timezone** - Date comparison mixing local/UTC causes midnight transfers to fail

### Frontend (React + Vite)

Simple banking UI: account dashboard, transfer form, transaction history.

### Demo flow:

1. Start radiator-server, demo backend (instrumented), demo frontend
2. Perform normal transactions → normal type cache generated
3. Open VSCode, hover over variables → see runtime types
4. Trigger edge-case bug → error type snapshot captured
5. View error in dashboard timeline → click "Open in VSCode"
6. Hover over variables in error snapshot → see null balance, identify bug

---

## Phase 8: Integration Testing & Polish

- `tests/integration/capture-flow.test.ts` - Transform → run → verify types in `.radiator/`
- `tests/integration/server-sync.test.ts` - Capture → push → query → verify
- `tests/integration/error-flow.test.ts` - Trigger error → verify snapshot → query via API
- `tests/integration/type-inference.test.ts` - Cache types → change code → verify inference
- Performance benchmark: <5% overhead normal mode, <20% error mode

---

## Verification Plan

1. **Unit tests**: `pnpm turbo test` - all packages pass
2. **Integration tests**: Cross-package capture → store → query flow
3. **Demo walkthrough**: Run full demo script, verify both use cases work end-to-end
4. **VSCode extension**: Load in Extension Development Host, hover shows types, error browser works
5. **Dashboard**: Login, view errors, timeline zoom, snapshot viewer, "Open in VSCode"
6. **Performance**: Benchmark shows acceptable overhead

## Summary

8-phase implementation:

1. Phase 0: Monorepo scaffolding + spec-kit
2. Phase 1: @radiator/common (types, hashing, serialization)
3. Phase 2: @radiator/core (CAS store, capture engine)
4. Phase 3: @radiator/transform (Babel plugin)
5. Phase 4: @radiator/client + @radiator/server
6. Phase 5: VSCode extension
7. Phase 6: Web dashboard
8. Phase 7: Demo banking app + integration tests

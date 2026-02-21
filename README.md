# Radiator

**Runtime type intelligence for JavaScript and TypeScript.**

Radiator captures types from actual runtime execution and makes them available during development. Hover over any variable in VSCode and see its real type and example data — even in completely untyped JavaScript. When errors occur, Radiator captures full snapshots of every variable in scope, giving you Datadog-level observability in your local editor.

```
// Your code has no type annotations:
export function processTransfer(fromAccountId, toAccountId, amount, description) {
  const transfer = { id: `txn-${uuidv4()}`, fromAccountId, toAccountId, amount, ... };
  const fromAccount = getAccountById(fromAccountId);
  const fee = calculateFee(amount);
  ...
}

// But hover over `fromAccount` in VSCode and Radiator shows:
//
//   (radiator) processTransfer
//
//   const fromAccount: {
//     id: string
//     ownerId: string
//     ownerName: string
//     balance: number
//     currency: string
//     createdAt: number
//   }
//
//   Example: { id: "acc-001", ownerName: "Alice Johnson", balance: 5200.50, ... }
//   Captured just now — 10 samples
```

## How It Works

Radiator has three components:

1. **Babel plugin** (`@radiator/transform`) — instruments your source code at build time, injecting capture calls around every function's parameters, local variables, and return values
2. **Runtime client** (`@radiator/client`) — receives the captured values, infers their types, and writes snapshots to a local `.radiator/` directory using git-style content-addressable storage
3. **VSCode extension** (`@radiator/vscode`) — reads the snapshots and displays runtime types on hover, plus a sidebar for browsing captured functions and error logs

The key insight: function snapshots are keyed by **AST hash** (SHA-256 of the normalized abstract syntax tree), not file paths or line numbers. This means the type cache automatically maps to the correct code version as you edit — change formatting or comments and the hash stays the same; change the logic and a fresh capture begins.

### The Pipeline

```
Source Code                    Instrumented Code                    .radiator/
+-----------------------+     +---------------------------+     +-------------------+
| function transfer(    |     | function transfer(        |     | refs/snapshots/   |
|   from, to, amount    | --> |   from, to, amount        | --> |   <hash> = {      |
| ) {                   |     | ) {                       |     |     functionName,  |
|   const fee = calc()  |     |   __rad_enter(hash, ...)  |     |     parameters: [ |
|   ...                 |     |   __rad_capture("from",   |     |       { name:     |
| }                     |     |     from, {line:1,col:2}) |     |         "from",   |
|                       |     |   const fee = calc()      |     |         type: {   |
+-----------------------+     |   __rad_capture("fee",    |     |           kind:   |
                              |     fee, {line:3,col:2})  |     |           "string"|
   Babel Transform            |   ...                     |     |         }         |
   (build time)               | }                         |     |       } ]         |
                              +---------------------------+     +-------------------+
                                                                         |
                                   Runtime Execution                     v
                                                                  VSCode Hover
                                                                  + Sidebar
                                                                  + Web Dashboard
```

## Architecture

```
rad/
├── packages/
│   ├── common/        @radiator/common     Shared types, hashing, serialization (zero deps)
│   ├── core/          @radiator/core       Content-addressable store, capture engine, sampling
│   ├── transform/     @radiator/transform  Babel plugin for instrumentation
│   ├── client/        @radiator/client     Lightweight runtime SDK
│   ├── server/        @radiator/server     Express + SQLite REST API for remote storage
│   └── dashboard/     @radiator/dashboard  React + Vite error monitoring web UI
├── extensions/
│   └── vscode/        @radiator/vscode     Hover types, error browser, snapshot inspector
├── apps/
│   └── demo-bank/                          Demo banking app with intentional bugs
│       ├── backend/                        Express API (instrumented with Radiator)
│       └── frontend/                       React UI
└── tests/
    └── integration/                        Cross-package integration tests
```

### Package Dependency Graph

```
@radiator/common  ← zero dependencies, the foundation
     |
     +---> @radiator/core       ← CAS object store, capture manager, sampling
     |          |
     |          +---> @radiator/transform   ← Babel plugin (build-time only)
     |          |
     |          +---> @radiator/client      ← runtime SDK (lightweight, auto-flushes)
     |
     +---> @radiator/server     ← REST API, SQLite metadata, blob storage
     |
     +---> @radiator/dashboard  ← React error monitoring UI
     |
     +---> @radiator/vscode     ← hover types, error browser sidebar
```

Build order: `common` → `core` → `transform` + `client` + `server` (parallel) → `dashboard` + `vscode` (parallel)

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 9+

### Install and Build

```bash
git clone <repo-url> rad
cd rad
pnpm install
pnpm build
```

### Instrument Your Project

**1. Install dependencies:**

```bash
pnpm add @radiator/client @radiator/transform
pnpm add -D @babel/core @babel/cli @babel/preset-env @babel/preset-typescript
```

**2. Configure Babel** (`babel.config.cjs`):

```js
const path = require('path');

module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' }, modules: 'commonjs' }],
    '@babel/preset-typescript',
  ],
  plugins: [
    [require.resolve('@radiator/transform/dist/plugin.js'), {
      captureModule: '@radiator/client',
    }],
  ],
};
```

**3. Build and run:**

```bash
# Compile with instrumentation
npx babel src --out-dir .instrumented --extensions '.ts'

# Run the instrumented code
node .instrumented/index.js
```

That's it. A `.radiator/` directory appears with captured type snapshots after your first request.

**4. Install the VSCode extension:**

```bash
# From the rad monorepo root:
ln -s "$(pwd)/extensions/vscode" ~/.vscode/extensions/radiator-vscode
```

Reload VSCode, open your source files, and hover over any variable to see runtime types.

## What Radiator Captures

Every instrumented function gets a `FunctionTypeSnapshot` containing:

| Field | Description |
|-------|-------------|
| `functionHash` | SHA-256 of the normalized AST (stable across formatting changes) |
| `functionName` | Human-readable name (`processTransfer`, `calculateFee`, etc.) |
| `filePath` | Absolute path to the source file |
| `parameters` | Array of captured parameter types with example values |
| `localVariables` | Array of captured local variable types with example values |
| `returnValue` | Captured return type with example values |
| `captureMode` | `"normal"` or `"error"` |
| `error` | If captured during error mode: name, message, stack trace, cause chain |
| `sampleCount` | Number of invocations captured (logarithmic sampling) |
| `timestamp` | When the snapshot was last updated |

### Type Representation

Runtime values are captured as `RadiatorType` objects:

```typescript
interface RadiatorType {
  kind: 'primitive' | 'object' | 'array' | 'function' | 'class' | 'null' | 'undefined' | 'union';
  name: string;                              // "string", "number", "Object", "Array", etc.
  properties?: Record<string, RadiatorType>; // for object types
  elementType?: RadiatorType;                // for array types
  examples?: unknown[];                      // real captured values
  unionOf?: RadiatorType[];                  // for union types (seen multiple kinds)
}
```

For example, a captured `transfer` variable might look like:

```json
{
  "kind": "object",
  "name": "Object",
  "properties": {
    "id": { "kind": "primitive", "name": "string", "examples": ["txn-49d4131d"] },
    "fromAccountId": { "kind": "primitive", "name": "string", "examples": ["acc-001"] },
    "toAccountId": { "kind": "primitive", "name": "string", "examples": ["acc-002"] },
    "amount": { "kind": "primitive", "name": "number", "examples": [100] },
    "status": { "kind": "primitive", "name": "string", "examples": ["completed"] },
    "createdAt": { "kind": "primitive", "name": "number", "examples": [1771700118138] }
  }
}
```

### Sampling Strategy

To keep overhead low, Radiator uses **logarithmic sampling** in normal mode:

- First 10 invocations: capture all
- Next 90: capture every 10th
- Next 900: capture every 100th
- And so on...

In error mode, every invocation is captured (errors are rare enough that overhead doesn't matter).

## Storage: Git-Style Content-Addressable

Radiator stores data in a `.radiator/` directory with a structure inspired by git:

```
.radiator/
├── config              # Local configuration (mode, server URL, etc.)
├── objects/            # Content-addressable blob storage
│   ├── 4a/             # 2-char prefix directories (like git)
│   │   └── 71de35...   # zlib-compressed type snapshots
│   └── ...
└── refs/
    └── snapshots/      # Function hash → latest snapshot mapping
        ├── a715f001... # processTransfer snapshot
        ├── 23f83907... # calculateFee snapshot
        └── ...
```

Objects are addressed by SHA-256 hash of their content. The `refs/snapshots/` directory maps function hashes to their latest snapshot, providing O(1) lookup by function identity.

## VSCode Extension

The extension provides three features:

### 1. Hover Types

Hover over any variable inside an instrumented function to see its runtime type and example data. The extension:
1. Detects the enclosing function name from the cursor position
2. Finds the nearest `.radiator/` directory by walking up from the file
3. Searches snapshots by function name + file path
4. Renders the type in TypeScript syntax with example values

Works on `.ts`, `.js`, `.tsx`, and `.jsx` files.

### 2. Sidebar (Activity Bar)

The Radiator sidebar (pulse icon in the Activity Bar) has three panels:

- **Error Log** — Errors grouped by file, with error name, message, function, and relative time. Click an error to open the webview detail panel and populate the snapshot inspector.
- **Snapshot Inspector** — Interactive tree view of a selected snapshot: expandable parameters, local variables, return value, with inline type annotations and example values. Null/undefined values are flagged with warning icons.
- **Captured Functions** — All captured function snapshots grouped by file. Expand a function to see its parameters, locals, and return type.

### 3. Error Detail Webview

Clicking an error in the sidebar opens a styled HTML panel showing:
- Error banner with name, message, and full stack trace
- All captured variables at the time of the error, with their types and example values
- Color-coded warnings for null/undefined values
- Source file link

### Commands

| Command | Description |
|---------|-------------|
| `Radiator: Toggle Mode` | Cycle between Normal / Error / Both capture modes |
| `Radiator: Refresh Errors` | Reload the error tree |
| `Radiator: Refresh Snapshots` | Reload the captured functions tree |

The status bar shows the current mode and auto-refreshes when `.radiator/` contents change.

## Web Dashboard

The dashboard (`@radiator/dashboard`) is a React + Vite + Tailwind application for team-wide error monitoring:

- **Error Timeline** — Recharts-based timeline with click-and-drag zoom (Datadog-style)
- **Error Filtering** — Filter by time range, error type, file, function
- **Snapshot Viewer** — Interactive tree showing all captured variables at error time
- **"Open in VSCode"** — One-click to open the error location in your editor via `vscode://` URI
- **Auth** — JWT-based login/register with organization and codebase management

Start the dashboard:

```bash
# Start the server (port 3210)
pnpm --filter @radiator/server dev

# Start the dashboard (port 5174)
pnpm --filter @radiator/dashboard dev
```

## Radiator Server

The server (`@radiator/server`) provides a REST API backed by SQLite + filesystem blob storage:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Create account + organization |
| `/api/auth/login` | POST | Login, returns JWT |
| `/api/snapshots/:hash` | GET | Query snapshot by function hash |
| `/api/errors` | GET | Paginated error list with filters |
| `/api/codebases` | GET/POST | Manage codebases |
| `/health` | GET | Health check |

The server uses the same CAS blob format as the local `.radiator/` directory, making sync straightforward.

## Demo: Banking App with Intentional Bugs

The `apps/demo-bank/` directory contains a banking application with four intentional edge-case bugs that demonstrate Radiator's debugging capabilities:

### The Bugs

**Bug #1: Null Balance**
Account `acc-005` (Evan Martinez) has `balance: null` instead of `0`. When used in arithmetic (`null + 100`), JavaScript coerces `null` to `0`, which sometimes works but produces incorrect results in certain paths.

**Bug #2: Float Precision**
The `calculateFee()` function computes a 30% fee as `amount * 0.1 + amount * 0.2`, which is NOT always equal to `amount * 0.3` due to IEEE 754 floating point. For example, `0.1 * 0.1 + 0.1 * 0.2 = 0.030000000000000006`.

**Bug #3: Negative Zero**
`validateTransferAmount()` uses `amount >= 0`, which allows `-0` to pass (because `-0 >= 0` is `true` in JavaScript). Zero-amount transfers shouldn't be valid.

**Bug #4: Timezone Mismatch**
`isBusinessHours()` mixes `getHours()` (local time) with `getUTCHours()` (UTC), causing the business hours window to shift based on server timezone.

### Running the Demo

```bash
# 1. Start the Radiator server
pnpm --filter @radiator/server dev &

# 2. Start the dashboard
pnpm --filter @radiator/dashboard dev &

# 3. Instrument and start the demo backend
cd apps/demo-bank/backend
npx babel src --out-dir .instrumented --extensions '.ts'
echo '{"type":"commonjs"}' > .instrumented/package.json
RADIATOR_DEMO_MODE=1 node .instrumented/index.js &

# 4. Start the demo frontend
cd apps/demo-bank/frontend
pnpm dev &
```

### The Demo Flow

1. Open `http://localhost:5173` — make a few transfers in the banking UI
2. Radiator captures runtime types for every function invocation
3. Open `apps/demo-bank/backend/src/services/transfer-service.ts` in VSCode
4. **Hover over `fromAccount`** — see the full object shape with real data
5. **Hover over `fee`** — see `number` with example `30` (or `30.000000000000004` for the float bug)
6. **Hover over `newToBalance`** — see `number` with example `12850` (or `NaN` if the null bug triggered)
7. Check the Radiator sidebar — browse all captured functions and their types

The demo source files have **zero TypeScript type annotations**. Every type you see on hover was captured from actual runtime execution.

## Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `RADIATOR_SERVER_URL` | Remote server URL for syncing |
| `RADIATOR_API_KEY` | API key for server authentication |
| `RADIATOR_MODE` | Capture mode: `normal`, `error`, or `both` |
| `RADIATOR_DEMO_MODE` | Set to `1` to bypass business hours check in demo app |

### Local Config (`.radiator/config`)

```json
{
  "mode": "both",
  "maxDepth": 3,
  "flushIntervalMs": 2000,
  "serverUrl": "http://localhost:3210"
}
```

### Babel Plugin Options

```js
[require.resolve('@radiator/transform/dist/plugin.js'), {
  captureModule: '@radiator/client',  // Module to import capture functions from
  mode: 'both',                       // 'normal' | 'error' | 'both'
  exclude: ['**/node_modules/**'],    // Glob patterns to skip
  minStatements: 1,                   // Min statements to instrument a function
}]
```

## Development

```bash
# Build everything
pnpm build

# Run all tests (139 tests across 10 packages)
pnpm test

# Type check
pnpm typecheck

# Build a single package
pnpm --filter @radiator/common build

# Run tests for a single package
pnpm --filter @radiator/common test
```

### Testing

| Suite | Tests | Coverage |
|-------|-------|----------|
| `@radiator/common` | Hashing, type capture, AST normalization, serialization | Unit |
| `@radiator/core` | Object store, capture manager, sampling, tree builder | Unit |
| `@radiator/transform` | Plugin instrumentation, param extraction, hash stability | Unit |
| `@radiator/server` | API routes, auth, SQLite queries | Unit + Supertest |
| Integration | Capture flow, error flow, server sync, type inference | End-to-end |

Run tests:

```bash
pnpm test                          # All tests
pnpm --filter @radiator/core test  # Single package
```

## Key Design Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Instrumentation | Babel plugin | Works with Vite, webpack, Next.js, esbuild. Runs at build time, not runtime. |
| Hash function | SHA-256 of normalized AST | Stable across whitespace/comment changes. Automatically invalidates when logic changes. |
| Local storage | `.radiator/` directory | Zero-config, git-like, works offline, no server required. |
| Remote storage | Express + SQLite | SQLite for metadata queries, filesystem for CAS blobs. Zero infrastructure. |
| Type depth | 3 (normal), 5 (error) | Deep enough to be useful, shallow enough to stay fast. |
| Sampling | Logarithmic | Captures the important early samples, then exponentially backs off. <5% overhead. |
| VSCode lookup | Function name + file path | More robust than re-hashing source (avoids build-time vs hover-time hash mismatches). |

## Tech Stack

- **Runtime:** Node.js 18+, TypeScript 5.4+
- **Build:** pnpm workspaces, Turborepo, Babel
- **Backend:** Express, better-sqlite3, JWT
- **Frontend:** React 19, Vite 6, Tailwind CSS 4, Recharts, TanStack React Query
- **Extension:** VSCode Extension API, esbuild
- **Testing:** Vitest, Supertest

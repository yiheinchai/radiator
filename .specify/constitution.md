# Radiator Constitution

## Core Principles

1. **Performance-First Instrumentation**: Runtime type capture must have minimal overhead. Normal mode targets <5% overhead through sampling. Build-time AST hashing eliminates runtime hashing cost.

2. **Git-Compatible Storage**: Types are stored in a content-addressable object store modeled on git internals (blobs, trees, commits). Code identity is determined by AST hash, not file path or line numbers.

3. **Zero-Config Developer Experience**: A single import with minimal configuration should be enough to start capturing types. Local storage in `.radiator/` works out of the box without a server.

4. **Privacy by Default**: No source code leaves the developer's machine unless they explicitly configure remote sync. Only type metadata and example values are transmitted.

5. **User Code Only**: By default, only instrument user-authored source files. Node_modules and third-party libraries are excluded.

## Technical Standards

- TypeScript strict mode throughout
- Vitest for all testing
- pnpm workspaces with Turborepo for build orchestration
- ESLint + Prettier for code quality
- All packages publish ESM with TypeScript declarations

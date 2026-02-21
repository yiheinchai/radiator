# Radiator Specification

## Overview

Radiator is a git-based runtime type cache for TypeScript. It captures types from real runtime execution and makes them available during development via VSCode hover and a web-based error monitoring dashboard.

## Use Case 1: Type-Informed Development

### User Story
As a developer, I want to hover over any variable in VSCode and see its runtime type and example data, so I can understand what data flows through my application without guessing.

### Requirements
- Babel plugin instruments all functions in user code to capture variable types at runtime
- Types are cached using content-addressable hashing keyed to function AST
- VSCode extension shows runtime types on hover in TypeScript-style format
- Example data from runtime is displayed alongside types
- When code changes, the cache automatically maps to matching code versions
- Type inference works across code edits (e.g., if `person` is cached and code changes to access `person.car`, infer the type)

### Acceptance Criteria
- Hover over any parameter, local variable, or intermediate value shows its runtime type
- Types update automatically when code matches a different cached version
- Works with all function forms: declarations, expressions, arrows, methods, async, generators
- Destructured parameters are individually inspectable

## Use Case 2: Error Debugging

### User Story
As a developer, I want to see the full type and data snapshot of all variables at the time an error occurred, so I can diagnose bugs without reproducing them.

### Requirements
- When an error occurs, capture complete type snapshots of all variables in the error's function
- Error logs include function name, file path, timestamp, error details
- Web dashboard shows error timeline (like Datadog/Sentry) with filtering and drag-to-zoom
- "Open in VSCode" loads the file with the error-time type snapshot pre-loaded
- VSCode error browser lists recent errors grouped by file

### Acceptance Criteria
- Error snapshots capture all variables with full depth
- Dashboard shows errors in a timeline with click-and-drag zoom
- Clicking "Open in VSCode" opens the correct file at the error location
- Hovering variables in VSCode shows the error-time data

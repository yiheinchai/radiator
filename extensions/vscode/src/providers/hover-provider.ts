import * as vscode from 'vscode';
import type { FunctionTypeSnapshot, VariableCapture } from '@radiator/common';
import { RadiatorClient } from '../client';
import { formatObjectType, formatTypeName, formatExamples } from '../format';

/**
 * Provides hover information showing runtime types captured by Radiator.
 *
 * When the user hovers over a variable inside a function, we:
 * 1. Find the enclosing function at the cursor position
 * 2. Look up the captured type snapshot by function name + file path
 * 3. Find the hovered variable in the snapshot
 * 4. Format and display the runtime type with examples
 */
export class RadiatorHoverProvider implements vscode.HoverProvider {
  constructor(private readonly client: RadiatorClient) {}

  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): Promise<vscode.Hover | null> {
    // Get the word at the cursor position
    const wordRange = document.getWordRangeAtPosition(position);
    if (!wordRange) return null;

    const word = document.getText(wordRange);
    if (!word || word.length === 0) return null;

    // Find the enclosing function
    const functionInfo = findEnclosingFunction(document, position);
    if (!functionInfo) return null;

    // Look up snapshot by function name + file path (robust, no hash mismatch)
    const snapshot = await this.client.getSnapshotByFunction(
      functionInfo.name,
      document.uri.fsPath
    );
    if (!snapshot) return null;

    // Find the variable in the snapshot
    const variable = findVariable(snapshot, word);
    if (!variable) return null;

    // Format the hover content
    const hover = formatHover(variable, functionInfo.name, snapshot);
    return hover;
  }
}

// ── Function Detection ─────────────────────────────────────────────────────

interface FunctionInfo {
  name: string;
  source: string;
  range: vscode.Range;
}

/**
 * Find the enclosing function at the given position by scanning upward
 * through the document for function declarations/expressions.
 */
function findEnclosingFunction(
  document: vscode.TextDocument,
  position: vscode.Position
): FunctionInfo | null {
  const text = document.getText();
  const offset = document.offsetAt(position);

  // Regex patterns for function-like constructs
  const functionPatterns = [
    // function declarations: function name(...)
    /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,
    // arrow functions assigned to const/let/var: const name = (...) =>
    /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>/g,
    // method definitions: name(...) {
    /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{/g,
    // async function: async function name(...)
    /async\s+function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,
  ];

  interface Match {
    name: string;
    start: number;
  }

  const matches: Match[] = [];

  for (const pattern of functionPatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      matches.push({
        name: match[1],
        start: match.index,
      });
    }
  }

  if (matches.length === 0) return null;

  // Find the closest function that contains the cursor position.
  // Sort by start position descending so we find the innermost function first.
  matches.sort((a, b) => b.start - a.start);

  for (const m of matches) {
    if (m.start > offset) continue;

    // Extract the function body by finding matching braces
    const bodyStart = text.indexOf('{', m.start);
    if (bodyStart === -1) {
      // Might be an arrow function without braces
      const arrowIndex = text.indexOf('=>', m.start);
      if (arrowIndex === -1 || arrowIndex > m.start + 500) continue;

      // For concise arrow functions, find the end of the expression
      const exprEnd = findExpressionEnd(text, arrowIndex + 2);
      if (exprEnd <= offset) continue;

      const source = text.substring(m.start, exprEnd);
      const startPos = document.positionAt(m.start);
      const endPos = document.positionAt(exprEnd);
      return {
        name: m.name,
        source,
        range: new vscode.Range(startPos, endPos),
      };
    }

    const bodyEnd = findMatchingBrace(text, bodyStart);
    if (bodyEnd === -1 || bodyEnd < offset) continue;

    // The cursor is inside this function
    const source = text.substring(m.start, bodyEnd + 1);
    const startPos = document.positionAt(m.start);
    const endPos = document.positionAt(bodyEnd + 1);
    return {
      name: m.name,
      source,
      range: new vscode.Range(startPos, endPos),
    };
  }

  return null;
}

/**
 * Find the matching closing brace for an opening brace.
 */
function findMatchingBrace(text: string, openIndex: number): number {
  let depth = 0;
  let inString: string | null = null;
  let escaped = false;

  for (let i = openIndex; i < text.length; i++) {
    const ch = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === '\\') {
      escaped = true;
      continue;
    }

    if (inString) {
      if (ch === inString) {
        inString = null;
      }
      continue;
    }

    if (ch === '"' || ch === "'" || ch === '`') {
      inString = ch;
      continue;
    }

    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }

  return -1;
}

/**
 * Find the end of an expression (for concise arrow functions).
 * Stops at semicolons, commas outside parens, or newlines not followed by operators.
 */
function findExpressionEnd(text: string, startIndex: number): number {
  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;

  for (let i = startIndex; i < text.length; i++) {
    const ch = text[i];

    if (ch === '(') parenDepth++;
    else if (ch === ')') {
      parenDepth--;
      if (parenDepth < 0) return i;
    } else if (ch === '[') bracketDepth++;
    else if (ch === ']') {
      bracketDepth--;
      if (bracketDepth < 0) return i;
    } else if (ch === '{') braceDepth++;
    else if (ch === '}') {
      braceDepth--;
      if (braceDepth < 0) return i;
    } else if (ch === ';' && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
      return i;
    } else if (ch === ',' && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
      return i;
    }
  }

  return text.length;
}

// ── Variable Lookup ────────────────────────────────────────────────────────

/**
 * Find a variable by name in the function snapshot.
 * Searches parameters, local variables, and return value.
 */
function findVariable(
  snapshot: FunctionTypeSnapshot,
  name: string
): VariableCapture | null {
  // Check parameters
  for (const param of snapshot.parameters) {
    if (param.name === name) return param;
  }

  // Check local variables
  for (const local of snapshot.localVariables) {
    if (local.name === name) return local;
  }

  // Check return value
  if (snapshot.returnValue && snapshot.returnValue.name === name) {
    return snapshot.returnValue;
  }

  return null;
}

// ── Hover Formatting ───────────────────────────────────────────────────────

/**
 * Format a VariableCapture into a VSCode Hover with TypeScript-style display.
 */
function formatHover(
  variable: VariableCapture,
  functionName: string,
  snapshot: FunctionTypeSnapshot
): vscode.Hover {
  const md = new vscode.MarkdownString();
  md.isTrusted = true;
  md.supportHtml = true;

  // Main type display - TypeScript style
  const typeString = formatObjectType(variable.type);
  const isParameter = snapshot.parameters.some(
    (p) => p.name === variable.name
  );
  const qualifier = isParameter ? 'parameter' : 'const';

  md.appendMarkdown(`*(radiator) ${functionName}*\n\n`);
  md.appendCodeblock(
    `${qualifier} ${variable.name}: ${typeString}`,
    'typescript'
  );

  // Example data section
  const examples = formatExamples(variable.type);
  if (examples) {
    md.appendMarkdown('\n---\n');
    md.appendMarkdown('**Example:**\n');
    md.appendCodeblock(examples, 'json');
  }

  // Capture metadata
  const sampleText =
    snapshot.sampleCount > 1
      ? `${snapshot.sampleCount} samples`
      : '1 sample';
  const timeAgo = getRelativeTime(snapshot.timestamp);
  md.appendMarkdown(
    `\n<span style="color:#888;">Captured ${timeAgo} &mdash; ${sampleText}</span>\n`
  );

  return new vscode.Hover(md);
}

/**
 * Format a timestamp as a relative time string (e.g. "2 hours ago").
 */
function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

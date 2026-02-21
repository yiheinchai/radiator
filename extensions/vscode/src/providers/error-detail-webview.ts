import * as vscode from 'vscode';
import * as path from 'path';
import type { FunctionTypeSnapshot, RadiatorType } from '@radiator/common';
import { formatTypeName } from '../format';

/**
 * Webview panel that shows a rich visualization of an error snapshot,
 * including the error info, stack trace, captured variable types,
 * and example data — all in a styled HTML view.
 */
export class ErrorDetailWebview {
  private panel: vscode.WebviewPanel | null = null;

  show(snapshot: FunctionTypeSnapshot, workspaceRoot: string): void {
    if (this.panel) {
      this.panel.reveal();
    } else {
      this.panel = vscode.window.createWebviewPanel(
        'radiator.errorDetail',
        `Radiator: ${snapshot.functionName}`,
        vscode.ViewColumn.Beside,
        { enableScripts: false }
      );
      this.panel.onDidDispose(() => {
        this.panel = null;
      });
    }

    this.panel.title = `Radiator: ${snapshot.functionName}`;
    this.panel.webview.html = this.getHtml(snapshot, workspaceRoot);
  }

  private getHtml(snapshot: FunctionTypeSnapshot, workspaceRoot: string): string {
    const relativePath = path.relative(workspaceRoot, snapshot.filePath);
    const timestamp = new Date(snapshot.timestamp).toLocaleString();
    const mode = snapshot.captureMode || 'normal';

    const errorSection = snapshot.error
      ? `
      <div class="error-banner">
        <div class="error-title">${escapeHtml(snapshot.error.name)}</div>
        <div class="error-message">${escapeHtml(snapshot.error.message)}</div>
        ${
          snapshot.error.stack
            ? `<div class="stack-trace">${escapeHtml(snapshot.error.stack)}</div>`
            : ''
        }
      </div>`
      : '';

    const paramsHtml = snapshot.parameters.length > 0
      ? `
      <div class="section">
        <div class="section-title">Parameters</div>
        ${snapshot.parameters.map((p) => this.renderVariable(p.name, p.type, 'param')).join('')}
      </div>`
      : '';

    const localsHtml = snapshot.localVariables.length > 0
      ? `
      <div class="section">
        <div class="section-title">Local Variables</div>
        ${snapshot.localVariables.map((v) => this.renderVariable(v.name, v.type, 'local')).join('')}
      </div>`
      : '';

    const returnHtml = snapshot.returnValue
      ? `
      <div class="section">
        <div class="section-title">Return Value</div>
        ${this.renderVariable('return', snapshot.returnValue.type, 'return')}
      </div>`
      : '';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root {
      --bg: var(--vscode-editor-background);
      --fg: var(--vscode-editor-foreground);
      --border: var(--vscode-panel-border);
      --header-bg: var(--vscode-sideBarSectionHeader-background);
      --badge-bg: var(--vscode-badge-background);
      --badge-fg: var(--vscode-badge-foreground);
      --error-fg: var(--vscode-errorForeground);
      --warning-fg: var(--vscode-editorWarning-foreground);
      --link: var(--vscode-textLink-foreground);
      --code-bg: var(--vscode-textCodeBlock-background);
      --subtle: var(--vscode-descriptionForeground);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--fg);
      background: var(--bg);
      padding: 16px;
      line-height: 1.5;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border);
    }

    .header .fn-name {
      font-size: 1.4em;
      font-weight: 600;
      font-family: var(--vscode-editor-font-family);
    }

    .header .badge {
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 0.8em;
      background: var(--badge-bg);
      color: var(--badge-fg);
    }

    .meta {
      color: var(--subtle);
      font-size: 0.9em;
      margin-bottom: 16px;
    }

    .meta span { margin-right: 16px; }

    .error-banner {
      background: color-mix(in srgb, var(--error-fg) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--error-fg) 30%, transparent);
      border-left: 4px solid var(--error-fg);
      border-radius: 4px;
      padding: 12px 16px;
      margin-bottom: 16px;
    }

    .error-title {
      font-weight: 700;
      color: var(--error-fg);
      font-size: 1.1em;
      margin-bottom: 4px;
    }

    .error-message {
      margin-bottom: 8px;
    }

    .stack-trace {
      font-family: var(--vscode-editor-font-family);
      font-size: 0.85em;
      white-space: pre-wrap;
      color: var(--subtle);
      background: var(--code-bg);
      padding: 8px;
      border-radius: 3px;
      max-height: 200px;
      overflow-y: auto;
    }

    .section {
      margin-bottom: 20px;
    }

    .section-title {
      font-weight: 600;
      font-size: 1em;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--subtle);
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 1px solid var(--border);
    }

    .var-card {
      background: var(--code-bg);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 10px 14px;
      margin-bottom: 8px;
    }

    .var-card.warning {
      border-left: 3px solid var(--warning-fg);
    }

    .var-header {
      display: flex;
      align-items: baseline;
      gap: 8px;
      margin-bottom: 4px;
    }

    .var-name {
      font-weight: 600;
      font-family: var(--vscode-editor-font-family);
      color: var(--link);
    }

    .var-type {
      font-family: var(--vscode-editor-font-family);
      color: var(--subtle);
    }

    .var-tag {
      font-size: 0.75em;
      padding: 1px 5px;
      border-radius: 3px;
      background: var(--badge-bg);
      color: var(--badge-fg);
    }

    .var-props {
      margin-top: 6px;
      margin-left: 12px;
    }

    .prop-line {
      font-family: var(--vscode-editor-font-family);
      font-size: 0.9em;
      padding: 1px 0;
    }

    .prop-key { color: var(--link); }
    .prop-type { color: var(--subtle); }
    .prop-value { color: var(--fg); opacity: 0.8; }

    .example-section {
      margin-top: 8px;
      padding-top: 6px;
      border-top: 1px dashed var(--border);
    }

    .example-label {
      font-size: 0.8em;
      color: var(--subtle);
      margin-bottom: 2px;
    }

    .example-value {
      font-family: var(--vscode-editor-font-family);
      font-size: 0.85em;
      background: var(--bg);
      padding: 6px 8px;
      border-radius: 3px;
      white-space: pre-wrap;
      overflow-x: auto;
    }
  </style>
</head>
<body>
  <div class="header">
    <span class="fn-name">${escapeHtml(snapshot.functionName)}()</span>
    <span class="badge">${escapeHtml(mode)}</span>
    ${snapshot.error ? '<span class="badge" style="background:var(--error-fg);color:#fff;">ERROR</span>' : ''}
  </div>

  <div class="meta">
    <span>📄 ${escapeHtml(relativePath)}</span>
    <span>🕒 ${escapeHtml(timestamp)}</span>
    <span>📊 ${snapshot.sampleCount} sample${snapshot.sampleCount !== 1 ? 's' : ''}</span>
  </div>

  ${errorSection}
  ${paramsHtml}
  ${localsHtml}
  ${returnHtml}
</body>
</html>`;
  }

  private renderVariable(name: string, type: RadiatorType, tag: string): string {
    const typeName = formatTypeName(type);
    const isWarning = type.kind === 'null' || type.kind === 'undefined';

    let propsHtml = '';
    if (type.kind === 'object' && type.properties && Object.keys(type.properties).length > 0) {
      const propLines = Object.entries(type.properties)
        .map(([key, propType]) => {
          const pType = formatTypeName(propType);
          const exValue =
            propType.examples && propType.examples.length > 0
              ? ` = ${truncateStr(JSON.stringify(propType.examples[0]), 50)}`
              : '';
          return `<div class="prop-line"><span class="prop-key">${escapeHtml(key)}</span>: <span class="prop-type">${escapeHtml(pType)}</span><span class="prop-value">${escapeHtml(exValue)}</span></div>`;
        })
        .join('');
      propsHtml = `<div class="var-props">${propLines}</div>`;
    }

    let exampleHtml = '';
    if (type.examples && type.examples.length > 0) {
      const exStr = JSON.stringify(type.examples[0], null, 2);
      if (exStr.length <= 300) {
        exampleHtml = `
        <div class="example-section">
          <div class="example-label">Example value:</div>
          <div class="example-value">${escapeHtml(exStr)}</div>
        </div>`;
      }
    }

    return `
    <div class="var-card${isWarning ? ' warning' : ''}">
      <div class="var-header">
        <span class="var-name">${escapeHtml(name)}</span>
        <span class="var-type">${escapeHtml(typeName)}</span>
        <span class="var-tag">${escapeHtml(tag)}</span>
      </div>
      ${propsHtml}
      ${exampleHtml}
    </div>`;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncateStr(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.substring(0, max - 3) + '...';
}

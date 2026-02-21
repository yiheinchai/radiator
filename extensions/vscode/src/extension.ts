import * as vscode from 'vscode';
import { RadiatorHoverProvider } from './providers/hover-provider';
import { RadiatorErrorTreeProvider } from './providers/error-tree-provider';
import { RadiatorFunctionTreeProvider } from './providers/function-tree-provider';
import { RadiatorSnapshotDetailProvider } from './providers/snapshot-detail-provider';
import { ErrorDetailWebview } from './providers/error-detail-webview';
import { RadiatorClient } from './client';

let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext): void {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) {
    return;
  }

  const client = new RadiatorClient(workspaceRoot);

  // Set context to show the views
  vscode.commands.executeCommand('setContext', 'radiator.active', true);

  // ── Hover Provider ───────────────────────────────────────────────────────
  const supportedLanguages = [
    { scheme: 'file', language: 'typescript' },
    { scheme: 'file', language: 'javascript' },
    { scheme: 'file', language: 'typescriptreact' },
    { scheme: 'file', language: 'javascriptreact' },
  ];

  const hoverProvider = new RadiatorHoverProvider(client);
  for (const selector of supportedLanguages) {
    context.subscriptions.push(
      vscode.languages.registerHoverProvider(selector, hoverProvider)
    );
  }

  // ── Error Tree View ──────────────────────────────────────────────────────
  const errorTreeProvider = new RadiatorErrorTreeProvider(client, workspaceRoot);
  const errorTreeView = vscode.window.createTreeView('radiator-errors', {
    treeDataProvider: errorTreeProvider,
    showCollapseAll: true,
  });
  context.subscriptions.push(errorTreeView);

  // ── Function Tree View ────────────────────────────────────────────────────
  const functionTreeProvider = new RadiatorFunctionTreeProvider(client, workspaceRoot);
  const functionTreeView = vscode.window.createTreeView('radiator-functions', {
    treeDataProvider: functionTreeProvider,
    showCollapseAll: true,
  });
  context.subscriptions.push(functionTreeView);

  // ── Snapshot Detail View ──────────────────────────────────────────────────
  const snapshotDetailProvider = new RadiatorSnapshotDetailProvider();
  const snapshotTreeView = vscode.window.createTreeView('radiator-snapshot-detail', {
    treeDataProvider: snapshotDetailProvider,
    showCollapseAll: true,
  });
  context.subscriptions.push(snapshotTreeView);

  // ── Error Detail Webview ──────────────────────────────────────────────────
  const errorDetailWebview = new ErrorDetailWebview();

  // ── Commands ─────────────────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('radiator.refreshErrors', () => {
      errorTreeProvider.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('radiator.refreshSnapshots', () => {
      functionTreeProvider.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'radiator.openErrorSnapshot',
      async (snapshotId: string) => {
        const snapshot = await client.getSnapshotById(snapshotId);
        if (!snapshot) {
          vscode.window.showErrorMessage(
            `Radiator: Snapshot ${snapshotId} not found`
          );
          return;
        }

        // Open the file at the error location
        const filePath = snapshot.filePath;
        const uri = vscode.Uri.file(filePath);
        try {
          const doc = await vscode.workspace.openTextDocument(uri);
          const line = snapshot.error
            ? extractLineFromStack(snapshot.error.stack, filePath)
            : 0;
          await vscode.window.showTextDocument(doc, {
            selection: new vscode.Range(line, 0, line, 0),
          });
        } catch {
          vscode.window.showErrorMessage(
            `Radiator: Could not open ${filePath}`
          );
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'radiator.viewErrorDetail',
      async (snapshotId: string) => {
        const snapshot = await client.getSnapshotById(snapshotId);
        if (!snapshot) {
          vscode.window.showErrorMessage(
            `Radiator: Snapshot ${snapshotId} not found`
          );
          return;
        }

        // Show the snapshot in the inspector tree
        vscode.commands.executeCommand(
          'setContext',
          'radiator.snapshotSelected',
          true
        );
        snapshotDetailProvider.setSnapshot(snapshot);

        // Open the rich webview panel
        errorDetailWebview.show(snapshot, workspaceRoot);

        // Also open the source file
        const uri = vscode.Uri.file(snapshot.filePath);
        try {
          const doc = await vscode.workspace.openTextDocument(uri);
          const line = snapshot.error
            ? extractLineFromStack(snapshot.error.stack, snapshot.filePath)
            : 0;
          await vscode.window.showTextDocument(doc, {
            selection: new vscode.Range(line, 0, line, 0),
            viewColumn: vscode.ViewColumn.One,
          });
        } catch {
          // File might not exist locally
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('radiator.toggleMode', () => {
      client.toggleMode();
      const mode = client.getMode();
      statusBarItem.text = `$(pulse) Radiator: ${mode}`;
      vscode.window.showInformationMessage(`Radiator mode: ${mode}`);
      errorTreeProvider.refresh();
      functionTreeProvider.refresh();
    })
  );

  // ── Status Bar ───────────────────────────────────────────────────────────
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.text = `$(pulse) Radiator: ${client.getMode()}`;
  statusBarItem.tooltip = 'Click to toggle Radiator capture mode';
  statusBarItem.command = 'radiator.toggleMode';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // ── Auto-refresh on file changes ──────────────────────────────────────────
  const watcher = vscode.workspace.createFileSystemWatcher('**/.radiator/**');
  watcher.onDidChange(() => {
    errorTreeProvider.refresh();
    functionTreeProvider.refresh();
  });
  watcher.onDidCreate(() => {
    errorTreeProvider.refresh();
    functionTreeProvider.refresh();
  });
  context.subscriptions.push(watcher);
}

export function deactivate(): void {
  // Cleanup handled by disposables
}

/**
 * Extract a line number from an error stack trace for a given file.
 */
function extractLineFromStack(stack: string, filePath: string): number {
  const lines = stack.split('\n');
  for (const line of lines) {
    if (line.includes(filePath)) {
      const match = line.match(/:(\d+):\d+/);
      if (match) {
        // Stack traces are 1-indexed, VSCode is 0-indexed
        return Math.max(0, parseInt(match[1], 10) - 1);
      }
    }
  }
  return 0;
}

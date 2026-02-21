import * as vscode from 'vscode';
import * as path from 'path';
import type { ErrorLogEntry, FunctionTypeSnapshot } from '@radiator/common';
import { RadiatorClient } from '../client';

/**
 * Tree data provider for the Radiator Error Log view.
 * Shows errors grouped by file, with each error displaying
 * the error name, message, and relative time.
 */
export class RadiatorErrorTreeProvider
  implements vscode.TreeDataProvider<ErrorTreeItem>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    ErrorTreeItem | undefined | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(
    private readonly client: RadiatorClient,
    private readonly workspaceRoot: string
  ) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ErrorTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ErrorTreeItem): Promise<ErrorTreeItem[]> {
    if (!element) {
      return this.getFileGroups();
    }

    if (element.contextValue === 'file-group') {
      return element.children || [];
    }

    return [];
  }

  private async getFileGroups(): Promise<ErrorTreeItem[]> {
    const errors = await this.client.getErrors();

    // Also load all snapshots and create error-like entries for snapshots
    // captured in "error" mode
    const allSnapshots = await this.client.getAllSnapshots();
    const errorSnapshots = allSnapshots.filter(
      (s) => s.captureMode === 'error' && s.error
    );

    // Merge: use snapshot-based errors (richer data) where available
    const seenIds = new Set(errors.map((e) => e.snapshotId));
    for (const snap of errorSnapshots) {
      if (!seenIds.has(snap.functionHash)) {
        errors.push({
          id: snap.functionHash,
          codebaseId: '',
          snapshotId: snap.functionHash,
          errorName: snap.error!.name,
          errorMessage: snap.error!.message,
          errorStack: snap.error!.stack,
          functionName: snap.functionName,
          filePath: snap.filePath,
          createdAt: snap.timestamp,
        });
      }
    }

    if (errors.length === 0) return [];

    // Sort by time descending
    errors.sort((a, b) => b.createdAt - a.createdAt);

    // Group by file
    const fileGroups = new Map<string, ErrorLogEntry[]>();
    for (const error of errors) {
      const filePath = error.filePath || 'unknown';
      const group = fileGroups.get(filePath) || [];
      group.push(error);
      fileGroups.set(filePath, group);
    }

    return Array.from(fileGroups.entries()).map(([filePath, fileErrors]) => {
      const relativePath = path.relative(this.workspaceRoot, filePath);
      const item = new ErrorTreeItem(
        `${relativePath} (${fileErrors.length})`,
        vscode.TreeItemCollapsibleState.Expanded,
        'file-group'
      );
      item.iconPath = new vscode.ThemeIcon('file');
      item.children = fileErrors.map((err) =>
        this.createErrorItem(err)
      );
      return item;
    });
  }

  private createErrorItem(error: ErrorLogEntry): ErrorTreeItem {
    const timeAgo = getRelativeTime(error.createdAt);
    const label = `${error.errorName}: ${error.errorMessage}`;
    const item = new ErrorTreeItem(
      label,
      vscode.TreeItemCollapsibleState.None,
      'error'
    );
    item.description = `${error.functionName} - ${timeAgo}`;
    item.tooltip = new vscode.MarkdownString(
      [
        `**${error.errorName}**: ${error.errorMessage}`,
        '',
        `Function: \`${error.functionName}\``,
        `File: \`${error.filePath}\``,
        `Captured: ${timeAgo}`,
        '',
        error.errorStack
          ? '```\n' + error.errorStack.split('\n').slice(0, 5).join('\n') + '\n```'
          : '',
      ].join('\n')
    );
    item.iconPath = new vscode.ThemeIcon(
      'error',
      new vscode.ThemeColor('errorForeground')
    );

    // Click to view the error detail (opens webview + snapshot inspector)
    item.command = {
      command: 'radiator.viewErrorDetail',
      title: 'View Error Detail',
      arguments: [error.snapshotId],
    };

    return item;
  }
}

export class ErrorTreeItem extends vscode.TreeItem {
  children?: ErrorTreeItem[];

  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    public override contextValue: string
  ) {
    super(label, collapsibleState);
  }
}

/**
 * Format a timestamp as a relative time string.
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

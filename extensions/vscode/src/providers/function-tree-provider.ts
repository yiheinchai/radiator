import * as vscode from 'vscode';
import * as path from 'path';
import type { FunctionTypeSnapshot } from '@radiator/common';
import { RadiatorClient } from '../client';
import { formatTypeName } from '../format';

/**
 * Tree provider showing all captured function snapshots,
 * grouped by file. Each function can be expanded to see
 * its parameters, local variables, and return type.
 */
export class RadiatorFunctionTreeProvider
  implements vscode.TreeDataProvider<FunctionTreeItem>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    FunctionTreeItem | undefined | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(
    private readonly client: RadiatorClient,
    private readonly workspaceRoot: string
  ) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: FunctionTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: FunctionTreeItem): Promise<FunctionTreeItem[]> {
    if (!element) {
      return this.getFileGroups();
    }
    return element.children || [];
  }

  private async getFileGroups(): Promise<FunctionTreeItem[]> {
    const snapshots = await this.client.getAllSnapshots();
    if (snapshots.length === 0) return [];

    // Group by file
    const fileGroups = new Map<string, FunctionTypeSnapshot[]>();
    for (const snap of snapshots) {
      const group = fileGroups.get(snap.filePath) || [];
      group.push(snap);
      fileGroups.set(snap.filePath, group);
    }

    return Array.from(fileGroups.entries()).map(([filePath, snaps]) => {
      const relativePath = path.relative(this.workspaceRoot, filePath);
      const item = new FunctionTreeItem(
        relativePath,
        vscode.TreeItemCollapsibleState.Expanded,
        'file-group'
      );
      item.iconPath = new vscode.ThemeIcon('file-code');
      item.description = `${snaps.length} function${snaps.length > 1 ? 's' : ''}`;
      item.children = snaps.map((snap) => this.createFunctionItem(snap));
      return item;
    });
  }

  private createFunctionItem(snapshot: FunctionTypeSnapshot): FunctionTreeItem {
    const item = new FunctionTreeItem(
      snapshot.functionName,
      vscode.TreeItemCollapsibleState.Collapsed,
      'function'
    );
    item.iconPath = new vscode.ThemeIcon('symbol-function');
    item.description = `${snapshot.sampleCount} sample${snapshot.sampleCount > 1 ? 's' : ''}`;
    item.tooltip = `${snapshot.functionName} — ${snapshot.sampleCount} samples captured`;

    // Click to open the source file
    item.command = {
      command: 'vscode.open',
      title: 'Open File',
      arguments: [vscode.Uri.file(snapshot.filePath)],
    };

    // Build children: params, locals, return
    const children: FunctionTreeItem[] = [];

    if (snapshot.parameters.length > 0) {
      const paramsGroup = new FunctionTreeItem(
        'Parameters',
        vscode.TreeItemCollapsibleState.Expanded,
        'group'
      );
      paramsGroup.iconPath = new vscode.ThemeIcon('symbol-parameter');
      paramsGroup.children = snapshot.parameters.map((p) => {
        const child = new FunctionTreeItem(
          `${p.name}: ${formatTypeName(p.type)}`,
          vscode.TreeItemCollapsibleState.None,
          'variable'
        );
        child.iconPath = new vscode.ThemeIcon('symbol-variable');
        if (p.type.examples && p.type.examples.length > 0) {
          child.description = truncate(JSON.stringify(p.type.examples[0]), 40);
        }
        return child;
      });
      children.push(paramsGroup);
    }

    if (snapshot.localVariables.length > 0) {
      const localsGroup = new FunctionTreeItem(
        'Local Variables',
        vscode.TreeItemCollapsibleState.Expanded,
        'group'
      );
      localsGroup.iconPath = new vscode.ThemeIcon('symbol-variable');
      localsGroup.children = snapshot.localVariables.map((v) => {
        const child = new FunctionTreeItem(
          `${v.name}: ${formatTypeName(v.type)}`,
          vscode.TreeItemCollapsibleState.None,
          'variable'
        );
        child.iconPath = new vscode.ThemeIcon('symbol-field');
        if (v.type.examples && v.type.examples.length > 0) {
          child.description = truncate(JSON.stringify(v.type.examples[0]), 40);
        }
        return child;
      });
      children.push(localsGroup);
    }

    if (snapshot.returnValue) {
      const retItem = new FunctionTreeItem(
        `return: ${formatTypeName(snapshot.returnValue.type)}`,
        vscode.TreeItemCollapsibleState.None,
        'variable'
      );
      retItem.iconPath = new vscode.ThemeIcon('symbol-event');
      if (snapshot.returnValue.type.examples && snapshot.returnValue.type.examples.length > 0) {
        retItem.description = truncate(JSON.stringify(snapshot.returnValue.type.examples[0]), 40);
      }
      children.push(retItem);
    }

    item.children = children;
    return item;
  }
}

class FunctionTreeItem extends vscode.TreeItem {
  children?: FunctionTreeItem[];

  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    public override contextValue: string
  ) {
    super(label, collapsibleState);
  }
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.substring(0, max - 3) + '...';
}

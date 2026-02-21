import * as vscode from 'vscode';
import type { FunctionTypeSnapshot, RadiatorType, VariableCapture } from '@radiator/common';
import { formatTypeName } from '../format';

/**
 * Tree provider showing the detailed contents of a selected snapshot.
 * Displays all captured variables with their types and example values
 * in an interactive tree that can be expanded to explore nested objects.
 */
export class RadiatorSnapshotDetailProvider
  implements vscode.TreeDataProvider<SnapshotTreeItem>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    SnapshotTreeItem | undefined | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private snapshot: FunctionTypeSnapshot | null = null;

  setSnapshot(snapshot: FunctionTypeSnapshot | null): void {
    this.snapshot = snapshot;
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: SnapshotTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: SnapshotTreeItem): Promise<SnapshotTreeItem[]> {
    if (!this.snapshot) return [];

    if (!element) {
      return this.getRootItems();
    }

    return element.children || [];
  }

  private getRootItems(): SnapshotTreeItem[] {
    if (!this.snapshot) return [];
    const items: SnapshotTreeItem[] = [];

    // Header with function info
    const header = new SnapshotTreeItem(
      `${this.snapshot.functionName}()`,
      vscode.TreeItemCollapsibleState.None,
      'header'
    );
    header.iconPath = new vscode.ThemeIcon('symbol-function');
    header.description = `${this.snapshot.sampleCount} samples`;
    items.push(header);

    // Error info if present
    if (this.snapshot.error) {
      const errorItem = new SnapshotTreeItem(
        `${this.snapshot.error.name}: ${this.snapshot.error.message}`,
        vscode.TreeItemCollapsibleState.Collapsed,
        'error-info'
      );
      errorItem.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('errorForeground'));
      if (this.snapshot.error.stack) {
        errorItem.children = this.snapshot.error.stack
          .split('\n')
          .filter((line) => line.trim())
          .slice(0, 8)
          .map((line) => {
            const stackItem = new SnapshotTreeItem(
              line.trim(),
              vscode.TreeItemCollapsibleState.None,
              'stack-line'
            );
            stackItem.iconPath = new vscode.ThemeIcon('debug-stackframe');
            return stackItem;
          });
      }
      items.push(errorItem);
    }

    // Parameters section
    if (this.snapshot.parameters.length > 0) {
      const paramsSection = new SnapshotTreeItem(
        'Parameters',
        vscode.TreeItemCollapsibleState.Expanded,
        'section'
      );
      paramsSection.iconPath = new vscode.ThemeIcon('symbol-parameter');
      paramsSection.children = this.snapshot.parameters.map((p) =>
        this.createVariableItem(p, 'param')
      );
      items.push(paramsSection);
    }

    // Local variables section
    if (this.snapshot.localVariables.length > 0) {
      const localsSection = new SnapshotTreeItem(
        'Local Variables',
        vscode.TreeItemCollapsibleState.Expanded,
        'section'
      );
      localsSection.iconPath = new vscode.ThemeIcon('symbol-variable');
      localsSection.children = this.snapshot.localVariables.map((v) =>
        this.createVariableItem(v, 'local')
      );
      items.push(localsSection);
    }

    // Return value
    if (this.snapshot.returnValue) {
      const retSection = new SnapshotTreeItem(
        'Return Value',
        vscode.TreeItemCollapsibleState.Expanded,
        'section'
      );
      retSection.iconPath = new vscode.ThemeIcon('symbol-event');
      retSection.children = [
        this.createVariableItem(this.snapshot.returnValue, 'return'),
      ];
      items.push(retSection);
    }

    return items;
  }

  private createVariableItem(
    capture: VariableCapture,
    category: string
  ): SnapshotTreeItem {
    const typeName = formatTypeName(capture.type);
    const hasChildren =
      (capture.type.kind === 'object' &&
        capture.type.properties &&
        Object.keys(capture.type.properties).length > 0) ||
      (capture.type.kind === 'array' && capture.type.elementType != null);

    const item = new SnapshotTreeItem(
      capture.name,
      hasChildren
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None,
      category
    );

    item.description = typeName;

    // Color-code based on potential issues
    if (capture.type.kind === 'null' || capture.type.kind === 'undefined') {
      item.iconPath = new vscode.ThemeIcon(
        'warning',
        new vscode.ThemeColor('editorWarning.foreground')
      );
    } else {
      item.iconPath = new vscode.ThemeIcon('symbol-field');
    }

    // Add tooltip with examples
    if (capture.type.examples && capture.type.examples.length > 0) {
      const examples = capture.type.examples
        .slice(0, 3)
        .map((e) => JSON.stringify(e, null, 2))
        .join('\n---\n');
      item.tooltip = new vscode.MarkdownString(
        `**${capture.name}**: \`${typeName}\`\n\n**Examples:**\n\`\`\`json\n${examples}\n\`\`\``
      );
    }

    // Build children for object types
    if (
      capture.type.kind === 'object' &&
      capture.type.properties &&
      Object.keys(capture.type.properties).length > 0
    ) {
      item.children = Object.entries(capture.type.properties).map(
        ([key, propType]) => this.createTypeItem(key, propType)
      );
    }

    return item;
  }

  private createTypeItem(name: string, type: RadiatorType): SnapshotTreeItem {
    const typeName = formatTypeName(type);
    const hasChildren =
      (type.kind === 'object' &&
        type.properties &&
        Object.keys(type.properties).length > 0) ||
      (type.kind === 'array' && type.elementType != null);

    const item = new SnapshotTreeItem(
      name,
      hasChildren
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None,
      'property'
    );

    item.description = typeName;

    // Show example value inline
    if (type.examples && type.examples.length > 0) {
      const example = type.examples[0];
      const exStr = JSON.stringify(example);
      if (exStr.length <= 50) {
        item.description = `${typeName}  =  ${exStr}`;
      }
    }

    // Null/undefined warnings
    if (type.kind === 'null' || type.kind === 'undefined') {
      item.iconPath = new vscode.ThemeIcon(
        'warning',
        new vscode.ThemeColor('editorWarning.foreground')
      );
    } else if (type.kind === 'object') {
      item.iconPath = new vscode.ThemeIcon('symbol-object');
    } else if (type.kind === 'array') {
      item.iconPath = new vscode.ThemeIcon('symbol-array');
    } else {
      item.iconPath = new vscode.ThemeIcon('symbol-key');
    }

    // Recurse into nested objects
    if (
      type.kind === 'object' &&
      type.properties &&
      Object.keys(type.properties).length > 0
    ) {
      item.children = Object.entries(type.properties).map(([key, propType]) =>
        this.createTypeItem(key, propType)
      );
    }

    if (type.kind === 'array' && type.elementType) {
      item.children = [this.createTypeItem('[element]', type.elementType)];
    }

    return item;
  }
}

class SnapshotTreeItem extends vscode.TreeItem {
  children?: SnapshotTreeItem[];

  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    public override contextValue: string
  ) {
    super(label, collapsibleState);
  }
}

/**
 * Open a file in VS Code using the vscode:// URI scheme.
 *
 * @param filePath - Absolute path to the file
 * @param line     - Optional line number (1-based)
 * @param column   - Optional column number (1-based)
 */
export function openInVSCode(
  filePath: string,
  line?: number,
  column?: number,
): void {
  let uri = `vscode://file/${encodeURIComponent(filePath)}`;

  if (line !== undefined) {
    uri += `:${line}`;
    if (column !== undefined) {
      uri += `:${column}`;
    }
  }

  window.open(uri, '_blank');
}

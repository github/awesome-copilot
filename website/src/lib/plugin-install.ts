export function buildVSCodePluginInstallUrl(pluginName: string): string {
  if (!pluginName.trim() || /[@\u0000-\u001f\u007f]/.test(pluginName)) {
    throw new Error(`Invalid marketplace plugin name: ${pluginName}`);
  }

  const query = new URLSearchParams({ source: "github/awesome-copilot", plugin: pluginName });
  return `vscode://chat-plugin/install?${query}`;
}

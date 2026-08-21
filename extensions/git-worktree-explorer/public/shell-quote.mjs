// Single-quoted arguments are literal in POSIX shells and PowerShell, so
// paths and branch names cannot introduce substitutions when pasted.
export function quoteShellArg(value) {
  const text = String(value ?? "");
  if (text === "") return "''";
  if (!/[^A-Za-z0-9_\-./:@+=,]/.test(text)) return text;
  return `'${text.replace(/'/g, "'\\''")}'`;
}

export function formatShellCommand(parts) {
  return parts.map(quoteShellArg).join(" ");
}

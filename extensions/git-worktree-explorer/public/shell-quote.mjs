// Single-quoted arguments are literal in both POSIX shells and PowerShell; only the
// escape for an embedded apostrophe differs, so callers pick the target shell.
const SAFE_ARGUMENT = /^[A-Za-z0-9_\-./:@+=,]+$/;

export function detectShell(platform = "") {
  return /^win/i.test(String(platform)) ? "powershell" : "posix";
}

export function quoteShellArg(value, shell = "posix") {
  const text = String(value ?? "");
  if (text === "") return "''";
  if (SAFE_ARGUMENT.test(text)) return text;
  const escaped = shell === "powershell" ? text.replace(/'/g, "''") : text.replace(/'/g, "'\\''");
  return `'${escaped}'`;
}

export function formatShellCommand(parts, shell = "posix") {
  return parts.map((part) => quoteShellArg(part, shell)).join(" ");
}

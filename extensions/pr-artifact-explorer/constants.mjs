import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const EXTENSION_ROOT = dirname(fileURLToPath(import.meta.url));
export const ASSET_ROOT = join(EXTENSION_ROOT, "assets");

const copilotHome = process.env.COPILOT_HOME || join(homedir(), ".copilot");
export const DATA_ROOT = join(copilotHome, "extensions", "pr-artifact-explorer", "artifacts");
export const CACHE_ROOT = join(DATA_ROOT, "cache");
export const JOBS_FILE = join(DATA_ROOT, "jobs.json");
export const PREFS_FILE = join(DATA_ROOT, "preferences.json");

export const GITHUB_API = "https://api.github.com";
export const USER_AGENT = "github-copilot-pr-artifact-explorer";

// Hard guards protect integrity and memory; they are not user-tunable.
export const MIN_CACHE_FREE_BYTES = 512 * 1024 * 1024;

// Soft limits warn and prompt; work continues while a prompt is outstanding.
export const DEFAULT_SOFT_LIMITS = Object.freeze({
  downloadBytes: 4 * 1024 * 1024 * 1024,
  zipEntries: 50_000,
  centralDirectoryBytes: 64 * 1024 * 1024,
  streamedEntryBytes: 512 * 1024 * 1024,
  idleSeconds: 60,
});
export const MAX_INLINE_PREVIEW_BYTES = 4 * 1024 * 1024;
export const MAX_TRX_PREVIEW_BYTES = 32 * 1024 * 1024;
export const MAX_STREAMED_ENTRY_BYTES = DEFAULT_SOFT_LIMITS.streamedEntryBytes;

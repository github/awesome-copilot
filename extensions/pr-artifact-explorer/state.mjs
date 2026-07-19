import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { PREFS_FILE } from "./constants.mjs";

const MAX_RECENT_REPOSITORIES = 12;
const MAX_FAVORITE_REPOSITORIES = 3;
const MAX_PULL_FILTER_REPOSITORIES = 50;
const PLAYER_FONT_SIZES = new Set(["12px", "14px", "16px", "18px", "20px", "22px"]);
const PLAYER_FONTS = new Set(["system", "cascadia", "consolas"]);
const PLAYER_SPEEDS = new Set([0.5, 1, 1.5, 2]);
const PULL_ARTIFACT_FILTERS = new Set(["all", "with", "without"]);
const PULL_CI_FILTERS = new Set(["all", "failing", "passing", "pending", "none"]);
let preferenceSaveQueue = Promise.resolve();
let preferenceSaveSequence = 0;
const WINDOWS_RENAME_RETRY_CODES = new Set(["EACCES", "EBUSY", "EPERM"]);

export const DEFAULT_PREFS = Object.freeze({
  account: null,
  repository: "microsoft/aspire",
  pullState: "open",
  repositories: {
    pinned: null,
    favorites: [],
    recent: ["microsoft/aspire"],
  },
  pullFilters: {},
  explorer: {
    sidebarCollapsed: false,
  },
  player: {
    fontSize: "16px",
    fontFamily: "system",
    lineHeight: 1.2,
    speed: 1,
  },
});

export function normalizeRepository(value) {
  const repository = String(value ?? "").trim().replace(/^https?:\/\/github\.com\//i, "");
  const match = repository.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?$/);
  if (!match) {
    throw new Error("Repository must use the owner/name format.");
  }
  return `${match[1]}/${match[2]}`;
}

function normalizeStoredRepository(value) {
  try {
    return typeof value === "string" && value.trim() ? normalizeRepository(value) : null;
  } catch {
    return null;
  }
}

function normalizeRepositoryList(value, limit) {
  const repositories = [];
  for (const item of Array.isArray(value) ? value : []) {
    const repository = normalizeStoredRepository(item);
    if (repository && !repositories.includes(repository)) repositories.push(repository);
    if (repositories.length === limit) break;
  }
  return repositories;
}

function normalizePlayer(value) {
  const lineHeight = Number(value?.lineHeight);
  const speed = Number(value?.speed);
  return {
    fontSize: PLAYER_FONT_SIZES.has(value?.fontSize)
      ? value.fontSize
      : DEFAULT_PREFS.player.fontSize,
    fontFamily: PLAYER_FONTS.has(value?.fontFamily)
      ? value.fontFamily
      : DEFAULT_PREFS.player.fontFamily,
    lineHeight:
      Number.isFinite(lineHeight) && lineHeight >= 1 && lineHeight <= 1.6
        ? Math.round(lineHeight * 10) / 10
        : DEFAULT_PREFS.player.lineHeight,
    speed: PLAYER_SPEEDS.has(speed) ? speed : DEFAULT_PREFS.player.speed,
  };
}

function normalizeExplorer(value) {
  return {
    sidebarCollapsed: value?.sidebarCollapsed === true,
  };
}

function normalizePullFilter(value) {
  const author =
    typeof value?.author === "string" && value.author.trim()
      ? value.author.trim().slice(0, 100)
      : null;
  const updatedAt = Number(value?.updatedAt);
  return {
    state: ["open", "closed", "all"].includes(value?.state) ? value.state : "open",
    author,
    artifacts: PULL_ARTIFACT_FILTERS.has(value?.artifacts) ? value.artifacts : "all",
    ci: PULL_CI_FILTERS.has(value?.ci) ? value.ci : "all",
    updatedAt: Number.isFinite(updatedAt) && updatedAt > 0 ? updatedAt : 0,
  };
}

function normalizePullFilters(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const entries = [];
  for (const [key, filter] of Object.entries(value)) {
    const repository = normalizeStoredRepository(key);
    if (!repository || !filter || typeof filter !== "object") continue;
    entries.push([
      repository.toLocaleLowerCase(),
      normalizePullFilter(filter),
    ]);
  }
  return Object.fromEntries(
    entries
      .sort((left, right) => right[1].updatedAt - left[1].updatedAt)
      .slice(0, MAX_PULL_FILTER_REPOSITORIES),
  );
}

export function normalizePrefs(value) {
  const prefs = value && typeof value === "object" ? value : {};
  const repository =
    normalizeStoredRepository(prefs.repository) ?? DEFAULT_PREFS.repository;
  const pinned = normalizeStoredRepository(prefs.repositories?.pinned);
  const favorites = normalizeRepositoryList(
    prefs.repositories?.favorites,
    MAX_FAVORITE_REPOSITORIES,
  ).filter((item) => item !== pinned);
  return {
    account: typeof prefs.account === "string" && prefs.account ? prefs.account : null,
    repository,
    pullState: ["open", "closed", "all"].includes(prefs.pullState)
      ? prefs.pullState
      : DEFAULT_PREFS.pullState,
    repositories: {
      pinned,
      favorites,
      recent: normalizeRepositoryList(
        [
          repository,
          ...(Array.isArray(prefs.repositories?.recent)
            ? prefs.repositories.recent
            : []),
        ],
        MAX_RECENT_REPOSITORIES,
      ),
    },
    pullFilters: normalizePullFilters(prefs.pullFilters),
    explorer: normalizeExplorer(prefs.explorer),
    player: normalizePlayer(prefs.player),
  };
}

export async function loadPrefs() {
  try {
    return normalizePrefs(JSON.parse(await readFile(PREFS_FILE, "utf8")));
  } catch (error) {
    if (error?.code === "ENOENT") {
      return normalizePrefs();
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Preferences are not valid JSON: ${PREFS_FILE}`, { cause: error });
    }
    throw error;
  }
}

async function replacePreferencesFile(temporary) {
  let lastError;
  for (let attempt = 0; attempt < 7; attempt++) {
    try {
      await rename(temporary, PREFS_FILE);
      return;
    } catch (error) {
      if (!WINDOWS_RENAME_RETRY_CODES.has(error?.code)) throw error;
      lastError = error;
      if (attempt === 6) break;
      await delay(10 * 2 ** attempt);
    }
  }
  try {
    await rm(temporary, { force: true });
  } catch (cleanupError) {
    throw new AggregateError(
      [lastError, cleanupError],
      "Preferences could not be replaced or cleaned up.",
    );
  }
  throw lastError;
}

export async function savePrefs(value) {
  const prefs = normalizePrefs(value);
  const save = async () => {
    await mkdir(dirname(PREFS_FILE), { recursive: true });
    const temporary =
      `${PREFS_FILE}.${process.pid}.${++preferenceSaveSequence}.tmp`;
    await writeFile(temporary, `${JSON.stringify(prefs, null, 2)}\n`, "utf8");
    await replacePreferencesFile(temporary);
    return prefs;
  };
  const pending = preferenceSaveQueue.then(save, save);
  preferenceSaveQueue = pending.then(
    () => undefined,
    () => undefined,
  );
  return pending;
}

export function rememberRepository(preferences, value) {
  const repository = normalizeRepository(value);
  preferences.repository = repository;
  preferences.repositories ??= {};
  preferences.repositories.recent = normalizeRepositoryList(
    [
      repository,
      ...(Array.isArray(preferences.repositories.recent)
        ? preferences.repositories.recent
        : []),
    ],
    MAX_RECENT_REPOSITORIES,
  );
  return repository;
}

export function setPinnedRepository(preferences, value) {
  const repository = value == null || value === "" ? null : normalizeRepository(value);
  preferences.repositories ??= {};
  preferences.repositories.pinned = repository;
  preferences.repositories.favorites = normalizeRepositoryList(
    preferences.repositories.favorites,
    MAX_FAVORITE_REPOSITORIES,
  ).filter((item) => item !== repository);
  return repository;
}

export function setFavoriteRepository(preferences, value, favorite) {
  const repository = normalizeRepository(value);
  preferences.repositories ??= {};
  const favorites = normalizeRepositoryList(
    preferences.repositories.favorites,
    MAX_FAVORITE_REPOSITORIES,
  ).filter((item) => item !== repository);
  if (favorite) {
    if (preferences.repositories.pinned === repository) {
      throw new Error("The pinned repository is already available in quick switch.");
    }
    if (favorites.length >= MAX_FAVORITE_REPOSITORIES) {
      throw new Error("You can favorite up to three repositories.");
    }
    favorites.unshift(repository);
  }
  preferences.repositories.favorites = favorites;
  return favorites;
}

export function setPullFilterPreferences(preferences, repositoryValue, value) {
  const repository = normalizeRepository(repositoryValue).toLocaleLowerCase();
  preferences.pullFilters = normalizePullFilters({
    ...preferences.pullFilters,
    [repository]: {
      ...preferences.pullFilters?.[repository],
      ...value,
      updatedAt: Date.now(),
    },
  });
  return preferences.pullFilters[repository];
}

export function setExplorerPreferences(preferences, value) {
  preferences.explorer = normalizeExplorer({
    ...preferences.explorer,
    ...value,
  });
  return preferences.explorer;
}

export function setPlayerPreferences(preferences, value) {
  preferences.player = normalizePlayer({
    ...preferences.player,
    ...value,
  });
  return preferences.player;
}

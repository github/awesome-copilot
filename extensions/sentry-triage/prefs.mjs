// User preferences for the Sentry Triage canvas, persisted to a small on-disk
// JSON file so an explicit choice (currently: the default org) survives canvas
// reopens. There is no first-class "extension preferences" API in the Copilot
// SDK, so we own this file ourselves. Design constraints we deliberately keep:
//   - Only ever written on an explicit user action (never silently).
//   - Only stores low-sensitivity data (an org slug) — never tokens/secrets.
//   - Versioned + minimal shape so it's easy to reason about and migrate later.
//   - Never throws: unreadable/corrupt/missing prefs fall back to empty defaults
//     so the canvas keeps working.
//   - Atomic writes (temp file + rename) so a crash mid-write can't leave a
//     half-written file behind.
// Stored OUTSIDE ~/.copilot/extensions/sentry-triage/ (the redeploy target) so
// `npm run deploy` can't clobber the user's saved preference.

import { homedir } from 'node:os'
import { join } from 'node:path'
import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs'

// Where the prefs file lives. Resolved lazily (not a module constant) so tests
// can point it at a temp directory via SENTRY_TRIAGE_PREFS_DIR and never touch a
// developer's real ~/.copilot/sentry-triage/preferences.json.
function prefsDir() {
  return process.env.SENTRY_TRIAGE_PREFS_DIR || join(homedir(), '.copilot', 'sentry-triage')
}
function prefsPath() {
  return join(prefsDir(), 'preferences.json')
}
// Shown to the user in the UI so the write is transparent (no leaked home dir).
export const PREFS_DISPLAY_PATH = join('~', '.copilot', 'sentry-triage', 'preferences.json')
const PREFS_VERSION = 1

function normalizeSlug(slug) {
  return typeof slug === 'string' ? slug.trim().toLowerCase() : ''
}

// Read + normalize the prefs file. Always returns a well-formed object, even if
// the file is missing or corrupt.
export function readPrefs() {
  try {
    const data = JSON.parse(readFileSync(prefsPath(), 'utf-8'))
    if (!data || typeof data !== 'object') return { version: PREFS_VERSION, defaultOrg: '' }
    return {
      version: PREFS_VERSION,
      defaultOrg: normalizeSlug(data.defaultOrg),
    }
  } catch {
    return { version: PREFS_VERSION, defaultOrg: '' }
  }
}

export function getDefaultOrg() {
  return readPrefs().defaultOrg
}

// Persist the user's chosen default org. Passing an empty/blank slug clears the
// saved default. Returns the normalized slug that was saved (or '' when cleared).
// Throws if the atomic write fails, so callers can report a real error instead of
// showing a success toast for a preference that never landed on disk.
export function saveDefaultOrg(slug) {
  const value = normalizeSlug(slug)
  const payload = JSON.stringify({ version: PREFS_VERSION, defaultOrg: value }, null, 2) + '\n'
  mkdirSync(prefsDir(), { recursive: true })
  const path = prefsPath()
  const tmp = `${path}.${process.pid}.tmp`
  writeFileSync(tmp, payload, 'utf-8')
  renameSync(tmp, path)
  return value
}

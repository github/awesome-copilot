// Connection preflight: make sure the canvas can actually reach Sentry BEFORE the
// user tries to use the board.
//
// Sentry is a hard requirement: without it there is no data at all. We verify it
// through the Sentry CLI SDK (./sentryClient.mjs) by making a live auth.whoami()
// call — if it succeeds a credential is present and valid, if it throws
// (SentryError: "Not authenticated…", or a transient network error) we surface
// that as "not connected" rather than an empty board. Auth is resolved by the SDK
// from a one-time `sentry auth login` (or SENTRY_AUTH_TOKEN); the canvas never
// handles a raw token.
//
// GitHub is intentionally NOT preflighted: the "Work on selected" hand-off is
// performed by the agent (session.sendAndWait), which has its own GitHub access.
//
// buildConnections() is pure so it can be unit-tested offline; checkConnections()
// is the thin wrapper that talks to Sentry.

import { whoami, installPackage, login, SentryError } from './sentryClient.mjs'

// Shape the raw signals into the connection status the UI consumes. Pure.
export function buildConnections({
  sentryConfigured = false,
  sentryReachable = false,
  sentryError = '',
  sentryTransient = false,
  sentrySetup = '',
} = {}) {
  return {
    checked: true,
    sentry: {
      configured: Boolean(sentryConfigured),
      reachable: Boolean(sentryReachable),
      // Whether the failure is worth retrying (a network blip) vs. a settled
      // problem. Only meaningful while unreachable. The gate uses this to promise
      // recovery for blips but show neutral guidance for unknown failures that
      // won't self-heal, instead of routing every failure to a "network" message.
      transient: sentryReachable ? false : Boolean(sentryTransient),
      // Explicit setup reason (currently only 'package-missing') for gate variants
      // that must NOT be inferred from the auth boolean. Keeps a missing-dependency
      // install prompt from rendering beneath contradictory "sign in" guidance.
      setup: sentryReachable ? '' : String(sentrySetup || ''),
      error: sentryReachable ? '' : String(sentryError || ''),
    },
  }
}

// The state a canvas starts with, before any preflight has run. Optimistic
// (checked:false) so the UI never flashes a setup gate before we actually know.
export function unknownConnections() {
  return {
    checked: false,
    sentry: { configured: false, reachable: false, transient: false, setup: '', error: '' },
  }
}

const msg = (err) => (err instanceof Error ? err.message : String(err))

// The optional `sentry` package isn't installed for this extension (a published
// awesome-copilot plugin ships source only). This is a one-time setup step, not a
// network blip and not an auth failure, so it gets its own gate branch.
const isPackageMissing = (err) => Boolean(err) && err.code === 'SENTRY_PACKAGE_MISSING'

// An active SENTRY_AUTH_TOKEN/SENTRY_TOKEN in the environment takes precedence
// over any OAuth login, so the "Sign in" button can't do anything useful while
// one is set — sentryClient's login() detects this up front and fails fast
// with this code instead of running an OAuth flow that can't take effect.
const isEnvTokenActive = (err) => Boolean(err) && err.code === 'SENTRY_ENV_TOKEN_ACTIVE'

// Text used for classification: the message plus any CLI stderr, since a rejected
// credential (HTTP 401/403) often surfaces its status in stderr rather than the
// Error message.
const errText = (err) => `${msg(err)} ${(err && err.stderr) || ''}`

// "Not authenticated" means there is no stored login yet — that is the setup
// gate's whole reason for existing, NOT a transient blip, so we do not retry it.
const isNotAuthenticated = (err) =>
  (err instanceof SentryError && err.exitCode === 10) ||
  /not authenticated|no (?:stored )?(?:auth|credential|token)|run 'sentry auth login'|please log ?in/i.test(msg(err))

// A credential problem the user must fix by (re-)authenticating. Either there is
// no stored login at all (isNotAuthenticated) OR a credential IS present but the
// server rejected it — an expired/invalid/revoked token, or an HTTP 401/403.
// Both are resolved by `sentry auth login`, and neither is worth retrying, so we
// keep them out of the transient/network bucket and mark the connection as
// not-configured so the gate shows sign-in guidance instead of "check your VPN".
const isAuthFailure = (err) =>
  isNotAuthenticated(err) ||
  (err instanceof SentryError && (err.exitCode === 401 || err.exitCode === 403)) ||
  /\b40[13]\b|unauthor(?:i[sz]ed)|forbidden|invalid (?:auth|credential|token|api ?key|session)|(?:auth|credential|token|session|login)\b[^.]{0,24}?\b(?:expired|invalid|revoked)|(?:expired|revoked)\b[^.]{0,24}?\b(?:auth|credential|token|session|login)/i.test(errText(err))

// A dropped socket / DNS hiccup / timeout can fail one probe and succeed on the
// next. Treat those as transient so a re-check retries instead of parking the
// user on the setup gate for a blip. Auth failures are never transient.
const isTransient = (err) =>
  !isAuthFailure(err) &&
  /econnreset|socket hang up|etimedout|timeout|enotfound|eai_again|network|temporarily|transport|connection (?:closed|reset)|fetch failed/i.test(msg(err))

// Turn the raw error into something a human can act on.
const humanizeSentryError = (err) => {
  const t = msg(err)
  if (isPackageMissing(err)) {
    return 'The Sentry CLI isn’t installed for this canvas yet. Ask Copilot to “install the sentry-triage dependencies and reload extensions,” then run `npx sentry auth login` from the extension folder and re-open this canvas.'
  }
  if (isEnvTokenActive(err)) {
    return t
  }
  if (isNotAuthenticated(err)) {
    return 'Sentry isn’t connected yet.'
  }
  if (isAuthFailure(err)) {
    return 'Sentry rejected your credential (expired or invalid). Sign in again below.'
  }
  if (isTransient(err)) {
    return 'Couldn’t reach Sentry just now (network). It should recover on the next check.'
  }
  return `Could not reach Sentry: ${t}`
}

// Classify a failed Sentry probe into the two decisions the caller cares about,
// plus a human message. Pure and exported so the gate/retry branching can be
// unit-tested without mocking the SDK:
//   - configured: is the canvas actually set up to reach Sentry? Auth failures
//     (no login OR a rejected/expired credential) clear it so the gate shows
//     sign-in guidance, and a missing `sentry` package clears it too so the gate
//     shows install guidance instead of a contradictory configured:true state;
//     everything else keeps it so the gate shows connectivity guidance.
//   - transient: worth retrying? Only network blips — never auth failures, even
//     when their text happens to mention a network keyword.
export function classifySentryError(err) {
  return {
    configured: !isAuthFailure(err) && !isPackageMissing(err),
    transient: isTransient(err),
    message: humanizeSentryError(err),
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// One authoritative Sentry probe: a live auth.whoami() decides reachability.
// Returns { configured, reachable, transient, error }.
async function probeSentry() {
  try {
    await whoami()
    return { configured: true, reachable: true, transient: false, error: '' }
  } catch (err) {
    // classifySentryError decides gate (configured) vs retry (transient). Only an
    // auth failure clears `configured` so the gate shows sign-in guidance; on a
    // network blip a credential most likely exists, so report configured:true and
    // let the gate show connectivity guidance instead of wrongly telling an
    // already-signed-in user to run `sentry auth login`.
    const { configured, transient } = classifySentryError(err)
    return { configured, reachable: false, transient, error: err }
  }
}

// Shape a probe result into the UI connection object.
const shape = (result) =>
  buildConnections({
    sentryConfigured: result.configured,
    sentryReachable: result.reachable,
    sentryTransient: result.transient,
    sentrySetup: !result.reachable && isPackageMissing(result.error) ? 'package-missing' : '',
    sentryError: result.reachable ? '' : humanizeSentryError(result.error),
  })

// FAST single-probe check. Returns immediately after one call. `transient` marks
// a network blip (not an auth failure) so a caller can choose to retry.
export async function checkConnectionsOnce() {
  const result = await probeSentry()
  return { connections: shape(result), transient: !result.reachable && result.transient }
}

// The connection check behind the initial preflight and re-open. A network blip
// can fail the first probe and succeed a moment later, so retry a few times on a
// transient error (but never on an auth failure — that needs the user to run
// `sentry auth login`, and retrying would just stall the gate).
export async function checkConnections() {
  const backoffs = [400, 700, 1100]
  let result = await probeSentry()
  for (let i = 0; i < backoffs.length && !result.reachable && result.transient; i++) {
    await sleep(backoffs[i])
    result = await probeSentry()
  }
  return shape(result)
}

// One-click fix for the package-missing gate: run `npm install` in the
// extension's own directory (via sentryClient's installPackage, so the path is
// never guessed by an agent or user) and immediately re-probe. Returns the fresh
// connection state either way so the gate/setup UI can render the outcome —
// success clears the gate, and a failed install surfaces as a normal probe error
// (e.g. still package-missing, or an npm/network failure) rather than throwing.
export async function installDependencies() {
  try {
    await installPackage()
  } catch (err) {
    console.error('[sentry-triage] npm install failed:', err instanceof Error ? err.message : err)
  }
  const { connections } = await checkConnectionsOnce()
  return connections
}

// One-click fix for the "not authenticated" setup gate: run the SDK's own
// OAuth device-code login (sentryClient's login(), the in-process equivalent
// of `sentry auth login`) and immediately re-probe. Only ever called for a
// package-present, not-signed-in state — the gate never shows this button
// while the package itself is missing (see components/page.mjs) — so unlike
// installDependencies() a thrown login error (user closed the browser tab,
// denied consent, or the device code expired) is left to propagate: the
// caller (extension.mjs onAuthenticate) surfaces it to the gate rather than
// silently falling back to a generic "still signed out" re-probe, since the
// specific reason (denied vs. expired vs. cancelled) is worth showing.
export async function authenticate() {
  await login()
  const { connections } = await checkConnectionsOnce()
  return connections
}

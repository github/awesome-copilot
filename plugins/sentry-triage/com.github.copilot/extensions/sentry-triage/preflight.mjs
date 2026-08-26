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

import { whoami, SentryError } from './sentryClient.mjs'

// Shape the raw signals into the connection status the UI consumes. Pure.
export function buildConnections({
  sentryConfigured = false,
  sentryReachable = false,
  sentryError = '',
  sentryTransient = false,
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
      error: sentryReachable ? '' : String(sentryError || ''),
    },
  }
}

// The state a canvas starts with, before any preflight has run. Optimistic
// (checked:false) so the UI never flashes a setup gate before we actually know.
export function unknownConnections() {
  return {
    checked: false,
    sentry: { configured: false, reachable: false, transient: false, error: '' },
  }
}

const msg = (err) => (err instanceof Error ? err.message : String(err))

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
  if (isNotAuthenticated(err)) {
    return 'Sentry isn’t connected yet. Run `sentry auth login` in your terminal, then re-open this canvas.'
  }
  if (isAuthFailure(err)) {
    return 'Sentry rejected your credential (expired or invalid). Run `sentry auth login` in your terminal, then re-open this canvas.'
  }
  if (isTransient(err)) {
    return 'Couldn’t reach Sentry just now (network). It should recover on the next check.'
  }
  return `Could not reach Sentry: ${t}`
}

// Classify a failed Sentry probe into the two decisions the caller cares about,
// plus a human message. Pure and exported so the gate/retry branching can be
// unit-tested without mocking the SDK:
//   - configured: does a usable credential exist? Auth failures (no login OR a
//     rejected/expired credential) clear it so the gate shows sign-in guidance;
//     everything else keeps it so the gate shows connectivity guidance.
//   - transient: worth retrying? Only network blips — never auth failures, even
//     when their text happens to mention a network keyword.
export function classifySentryError(err) {
  return {
    configured: !isAuthFailure(err),
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

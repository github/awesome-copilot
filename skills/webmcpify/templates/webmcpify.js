/**
 * webmcpify runtime (JavaScript variant) — vendored from https://github.com/TueJon/webmcpify
 *
 * MIT License
 * Copyright (c) 2026 Jonas Tüchler
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software — keep this header when
 * copying this file into your project.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * Full text: https://github.com/TueJon/webmcpify/blob/main/LICENSE
 *
 * Spec-shaped helper around the WebMCP API (document.modelContext). Vendor this
 * file; do not add it as a dependency. Everything is feature-detected: in browsers
 * without WebMCP every function is a safe no-op. This file is an ES module
 * (`export`) — load it via a bundler or `<script type="module">`; for
 * CommonJS/classic-script projects, transpile or vendor the TS variant instead.
 */

/**
 * @typedef {(() => void) & { ready: Promise<boolean> }} ToolScopeHandle
 * Callable dispose handle: call it to dispose (aborts the registration signal,
 * frees the key). `ready` resolves true when all registrations committed and the
 * scope is still active; false on no WebMCP / key already active / registration
 * failure (rolled back) / disposed first. Never rejects — failures go to onError.
 */

/** The ONLY place the raw API is referenced — spec churn is a one-file fix. */
export function getModelContext() {
  if (typeof document !== 'undefined' && document.modelContext) return document.modelContext;
  // Deprecated surface used by the Chrome 149 origin trial; remove when obsolete.
  if (typeof navigator !== 'undefined' && navigator.modelContext) return navigator.modelContext;
  return undefined;
}

export function isWebMCPAvailable() {
  return getModelContext() !== undefined;
}

const scopes = new Map();

/**
 * @param {() => void} dispose
 * @param {Promise<boolean>} ready
 * @returns {ToolScopeHandle}
 */
function makeHandle(dispose, ready) {
  return Object.assign(dispose, { ready });
}

/**
 * Register a set of tools under one scope key. Returns a callable dispose handle
 * carrying `ready: Promise<boolean>` (see ToolScopeHandle).
 *
 * - AbortSignal is the spec's only unregistration mechanism — dispose aborts it.
 * - Validation runs BEFORE any registration, so a bad contract never leaves a
 *   half-registered scope.
 * - Registration failures — rejections AND synchronously throwing registerTool
 *   implementations (pre-2026-07 Chromium) — roll back the entire scope, resolve
 *   `ready` to false, and are reported via `onError` (default: console.error);
 *   the key is never stranded. `onError` is not called when the scope is
 *   disposed before registration settles.
 * - Disposing before registration settles (e.g. React StrictMode unmount) rolls
 *   back silently: `ready` resolves false and `onError` is NOT called.
 * - Calling with a key that is already active returns a no-op handle
 *   (`ready` → false) and leaves the existing scope untouched.
 *
 * @param {string} key
 * @param {Array<object>} tools
 * @param {{ exposedTo?: string[], validate?: boolean, onError?: (e: unknown) => void }} [options]
 * @returns {ToolScopeHandle}
 */
export function createToolScope(key, tools, options) {
  const mc = getModelContext();
  if (!mc) return makeHandle(() => {}, Promise.resolve(false));
  if (scopes.has(key)) return makeHandle(() => {}, Promise.resolve(false));

  if (shouldValidate(options)) for (const tool of tools) validateTool(tool);

  const controller = new AbortController();
  scopes.set(key, controller);

  let disposed = false;
  const rollback = () => {
    if (scopes.get(key) === controller) {
      controller.abort();
      scopes.delete(key);
    }
  };

  const registerOptions = { signal: controller.signal };
  if (options?.exposedTo) registerOptions.exposedTo = options.exposedTo;

  let registrations;
  try {
    // Legacy registerTool implementations throw synchronously instead of
    // rejecting — normalize so the rollback path below covers both.
    registrations = Promise.all(tools.map((tool) => mc.registerTool(tool, registerOptions)));
  } catch (error) {
    registrations = Promise.reject(error);
  }

  const ready = registrations.then(
    () => scopes.get(key) === controller, // false when disposed before settling
    (error) => {
      rollback();
      if (!disposed) {
        const report =
          options?.onError ??
          ((e) => console.error(`webmcpify: registration failed for scope "${key}"`, e));
        report(error);
      }
      return false;
    },
  );

  return makeHandle(() => {
    disposed = true;
    rollback();
  }, ready);
}

/**
 * Bridge execute() to the app's own event/state flow. The dispatched detail
 * carries `{ ...detail, requestId, signal }` — `signal` is an AbortSignal aborted
 * on timeout; handlers should pass it to fetch() and skip state commits and the
 * completion dispatch once aborted. Resolves only after the component confirms
 * the outcome by dispatching `tool-completion-<requestId>` with
 * `detail: { ok: boolean, message?: string, error?: string }` — and it must do so
 * AFTER the async work truly finished (awaited fetch/state commit/render),
 * because agents plan from what is on screen.
 *
 * The completion contract fails closed: `ok === true` resolves the message,
 * `ok === false` resolves `"ERROR: <error>"`, and anything else (missing or
 * non-boolean `ok`, no detail) resolves an ERROR string reporting an unknown
 * outcome. Timeouts resolve an ERROR string too. Never rejects — the model can
 * self-correct without unhandled rejections inside execute().
 *
 * @param {string} eventName
 * @param {Record<string, unknown>} [detail]
 * @param {number} [timeoutMs]
 * @returns {Promise<string>}
 */
export function dispatchAndWait(eventName, detail = {}, timeoutMs = 10000) {
  return new Promise((resolve) => {
    const requestId = Math.random().toString(36).slice(2, 12);
    const completionEvent = `tool-completion-${requestId}`;
    const abort = new AbortController();
    const cleanup = () => {
      clearTimeout(timer);
      window.removeEventListener(completionEvent, onDone);
    };
    const timer = setTimeout(() => {
      cleanup();
      abort.abort();
      resolve(
        'ERROR: The interface did not confirm this action in time. The request was signalled to cancel but may still be processing — check the current page state before retrying.',
      );
    }, timeoutMs);
    const onDone = (event) => {
      cleanup();
      const result = event.detail ?? {};
      if (result.ok === true) {
        resolve(result.message ?? 'Action completed successfully.');
      } else if (result.ok === false) {
        resolve(`ERROR: ${result.error ?? 'The action failed.'}`);
      } else {
        resolve(
          'ERROR: The interface sent a completion without a boolean `ok` — the outcome is unknown. Check the current page state before retrying.',
        );
      }
    };
    window.addEventListener(completionEvent, onDone);
    window.dispatchEvent(
      new CustomEvent(eventName, { detail: { ...detail, requestId, signal: abort.signal } }),
    );
  });
}

/**
 * Serialize a tool's execute(): while one call is in flight, further calls
 * resolve immediately to a busy ERROR string instead of racing shared UI state.
 *
 * ```js
 * execute: singleFlight(async (input) => dispatchAndWait('webmcp:save', input)),
 * ```
 *
 * @template {unknown[]} A
 * @param {(...args: A) => string | Promise<string>} fn
 * @param {string} [busyMessage]
 * @returns {(...args: A) => Promise<string>}
 */
export function singleFlight(
  fn,
  busyMessage = 'ERROR: A previous invocation of this tool is still in progress. Wait for it to finish, then check the current page state before retrying.',
) {
  let inFlight = false;
  return async (...args) => {
    if (inFlight) return busyMessage;
    inFlight = true;
    try {
      return await fn(...args);
    } finally {
      inFlight = false;
    }
  };
}

/**
 * @param {{ validate?: boolean }} [options]
 * Default: enabled when the bundler substitutes `process.env.NODE_ENV`
 * (Vite/webpack automatic; esbuild via `--define`) and it isn't `'production'`;
 * unbundled projects default to false — pass `validate: true` during development.
 */
function shouldValidate(options) {
  if (options?.validate !== undefined) return options.validate;
  // Bundlers substitute the literal; unbundled, the bare reference throws → false.
  try {
    return process.env.NODE_ENV !== 'production';
  } catch {
    return false;
  }
}

/** Contract-quality checks (Google's recommended budgets). */
function validateTool(tool) {
  const problems = [];
  if (!/^[a-zA-Z0-9_.-]{1,30}$/.test(tool.name)) {
    problems.push(`name "${tool.name}" should be 1-30 chars of [a-zA-Z0-9_.-]`);
  }
  if (!tool.description) problems.push(`tool "${tool.name}" is missing a description`);
  else if (tool.description.length > 500) {
    problems.push(`tool "${tool.name}" description exceeds 500 chars`);
  }
  if (problems.length) throw new Error(`webmcpify: ${problems.join('; ')}`);
}

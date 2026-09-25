/**
 * webmcpify compat helpers — vendored from https://github.com/TueJon/webmcpify
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
 * Shared string/object compat helpers for the native transition from JSON
 * strings to JavaScript objects.
 * Used by templates/webmcp.spec.ts (inlined inside page.evaluate for the
 * browser-boundary parts) and tests/compat.test.mjs — single source of truth.
 * Remove the JSON-string branch after Chrome 154 is no longer supported.
 */

export function parseInputSchema(raw) {
  return typeof raw === 'string' ? JSON.parse(raw) : raw ?? { type: 'object', properties: {} };
}

/**
 * Explicit adapter mode — capability-probe first, no retry of a real tool:
 * - stub via direct tool.execute(object) — headless-era stub
 * - current native/spec mc.executeTool(tool, object)
 * - legacy Chrome mc.executeTool(tool, JSON string)
 * The harness determines the native mode with a temporary side-effect-free
 * tool before invoking application tools. A handler failure never triggers a
 * retry, so a mutation cannot execute twice.
 */
export function isStubTool(tool) {
  return typeof tool?.execute === 'function';
}

export function isStubObjectExecute(mc) {
  return !!mc?.__webmcpStubObjectMode;
}

export function normalizeResult(r) {
  return r == null ? null : typeof r === 'string' ? r : JSON.stringify(r);
}

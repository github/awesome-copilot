/**
 * Ambient types for the WebMCP API — vendored from https://github.com/TueJon/webmcpify
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
 * registerTool/ontoolchange/annotations/getTools/executeTool follow the CG draft
 * (https://webmachinelearning.github.io/webmcp/). Chrome's origin-trial I/O shape
 * can lag that draft; keep the compatibility notes below dated and explicit.
 *
 * This is a GLOBAL script file — no imports (an import would turn it into a
 * module and un-globalize every interface). React JSX typings for the declarative
 * attributes live in the separate webmcp-jsx.d.ts template.
 */

interface ModelContextToolAnnotations {
  readOnlyHint?: boolean;
  untrustedContentHint?: boolean;
  /** Significant real-world or non-reversible effect; a hint, never enforcement. */
  consequentialHint?: boolean;
}

type ModelContextToolResult =
  | string
  | number
  | boolean
  | Record<string, unknown>
  | unknown[];

interface ModelContext extends EventTarget {
  registerTool(
    tool: ModelContextTool,
    options?: { signal?: AbortSignal; exposedTo?: string[] },
  ): Promise<void>;
  ontoolchange: ((this: ModelContext, ev: Event) => unknown) | null;
  /**
   * Enumerates tools exposed to this document. Added to the CG draft in 2026-07;
   * intended for in-page agents and test harnesses, not application logic.
   */
  getTools(options?: { fromOrigins?: string[] }): Promise<RegisteredTool[]>;
  /**
   * Agent/test execution surface in the CG draft. Current Chrome accepts an
   * object; Chrome 150's JSON-string input remains in the verification adapter.
   */
  executeTool?(
    tool: RegisteredTool,
    inputObject?: unknown,
    options?: { signal?: AbortSignal },
  ): Promise<ModelContextToolResult | null>;
  /** Internal simulation capability used by the vendored Workbench. */
  __webmcpStubObjectMode?: boolean;
}

interface ModelContextTool {
  /** [a-zA-Z0-9_.-]; spec allows up to 128 chars, Google recommends ≤30 */
  name: string;
  /** Optional display label */
  title?: string;
  /** Natural-language capability statement, ≤500 chars recommended */
  description: string;
  /** JSON Schema for the tool's input */
  inputSchema?: object;
  /**
   * Only `input` is passed — there is no client/session argument in the IDL.
   * IDL: `Promise<any>` — WebIDL auto-wraps synchronous returns (and throws) in
   * a promise, so a sync implementation still fulfills this type at runtime;
   * declare it async for type fidelity.
   */
  /** JSON-safe result; bare null/undefined are intentionally excluded. */
  execute(input: Record<string, unknown>): Promise<ModelContextToolResult>;
  annotations?: ModelContextToolAnnotations;
}

/** Shape returned by getTools(). Older Chrome may stringify JSON Schema — handle both forms. */
interface RegisteredTool {
  name: string;
  title?: string;
  description: string;
  inputSchema?: string | object;
  annotations?: ModelContextToolAnnotations;
  /** Registering origin (secure origins only). */
  origin: string;
  /** Owning window (cross-document enumeration). */
  window: Window;
}

interface Document {
  readonly modelContext?: ModelContext;
}

interface Navigator {
  /** Deprecated Chrome 149 origin-trial surface; prefer document.modelContext. */
  readonly modelContext?: ModelContext;
}

/** Declarative form submissions: agent-invoked flag + result bridge. */
interface SubmitEvent {
  readonly agentInvoked?: boolean;
  respondWith?(result: Promise<unknown>): void;
}

/**
 * File-viewer modal — state management only.
 *
 * This module owns:
 * - Open / close state with subscriber notifications
 * - URL hash ↔ modal state sync (#file=path)
 * - Focus restoration to the triggering element on close
 * - Escape-key and hash-change listeners (registered by initModalFromHash)
 *
 * It does NOT own rendering, fetching, search keyboard handling, or debounce.
 * Those live in modal.ts, search-client.ts, and utils.ts respectively.
 *
 * Safe for server-side execution: all DOM access is guarded by IS_CLIENT.
 */

import { getFileHash, setFileHash, clearFileHash } from "./url-state";

const IS_CLIENT = typeof window !== "undefined";

/* ── State ──────────────────────────────────────────────────── */

export interface ModalState {
  open: boolean;
  filePath: string | null;
  /** The element that triggered the modal (for focus restoration). */
  trigger: HTMLElement | null;
}

let state: ModalState = {
  open: false,
  filePath: null,
  trigger: null,
};

/** Subscribers notified on every state change. */
type Listener = (state: ModalState) => void;
const listeners: Set<Listener> = new Set();

/* ── API ────────────────────────────────────────────────────── */

export function getModalState(): ModalState {
  return { ...state };
}

/** Subscribe to state changes. Returns an unsubscribe function. */
export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(): void {
  for (const fn of listeners) {
    fn({ ...state });
  }
}

/**
 * Open the modal for a given file path.
 * Syncs the URL hash and notifies subscribers.
 */
export function openModal(filePath: string, trigger?: HTMLElement): void {
  state = { open: true, filePath, trigger: trigger ?? null };
  if (IS_CLIENT) setFileHash(filePath);
  notify();
}

/**
 * Close the modal and restore keyboard focus to the triggering element.
 */
export function closeModal(): void {
  const triggerEl = state.trigger;
  state = { open: false, filePath: null, trigger: null };

  if (IS_CLIENT) {
    clearFileHash();
    // Defer focus restoration one frame so the modal has time to hide first.
    if (triggerEl && typeof triggerEl.focus === "function") {
      requestAnimationFrame(() => triggerEl.focus());
    }
  }

  notify();
}

/**
 * Initialize modal-from-hash behaviour.
 *
 * Reads the current URL hash on load, then watches for hash changes caused by
 * back/forward navigation. Also registers an Escape-key listener.
 *
 * Call once per page. Returns a cleanup function that removes the listeners —
 * useful in tests or if the page is torn down (e.g. view transitions).
 */
export function initModalFromHash(): () => void {
  if (!IS_CLIENT) return () => {};

  const filePath = getFileHash();
  if (filePath) {
    state = { open: true, filePath, trigger: null };
    notify();
  }

  // Sync modal state when the URL hash changes (browser back/forward).
  const onHashChange = (): void => {
    const hashFile = getFileHash();
    if (hashFile) {
      if (hashFile !== state.filePath) {
        state = { open: true, filePath: hashFile, trigger: null };
        notify();
      }
    } else if (state.open) {
      state = { open: false, filePath: null, trigger: null };
      notify();
    }
  };

  // Escape closes the modal while it is open.
  const onKeydown = (e: KeyboardEvent): void => {
    if (e.key === "Escape" && state.open) {
      e.preventDefault();
      closeModal();
    }
  };

  window.addEventListener("hashchange", onHashChange);
  document.addEventListener("keydown", onKeydown);

  return () => {
    window.removeEventListener("hashchange", onHashChange);
    document.removeEventListener("keydown", onKeydown);
  };
}

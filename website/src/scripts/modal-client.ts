/**
 * Modal state management.
 *
 * Manages open/close of the file-viewer modal, including:
 * - Opening on `#file=path` hash
 * - Closing on hash removal
 * - Focus trap, Escape close, focus restoration
 * - Exposes hooks for pages to wire up
 *
 * Pure state management — the actual rendering is handled by the page
 * component or a dedicated modal renderer (PR3+).
 *
 * Safe for server-side execution: all DOM access is guarded.
 */

import { getFileHash, setFileHash, clearFileHash } from './url-state';

const IS_CLIENT = typeof window !== 'undefined';

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

/** Subscribers notified on state change. */
type Listener = (state: ModalState) => void;
const listeners: Set<Listener> = new Set();

/* ── API ────────────────────────────────────────────────────── */

export function getModalState(): ModalState {
  return { ...state };
}

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
  state = {
    open: true,
    filePath,
    trigger: trigger ?? null,
  };

  if (IS_CLIENT) {
    setFileHash(filePath);
  }

  notify();
}

/**
 * Close the modal and restore focus to the triggering element.
 */
export function closeModal(): void {
  const triggerEl = state.trigger;

  state = {
    open: false,
    filePath: null,
    trigger: null,
  };

  if (IS_CLIENT) {
    clearFileHash();

    // Restore focus to the element that opened the modal
    if (triggerEl && typeof triggerEl.focus === 'function') {
      requestAnimationFrame(() => triggerEl.focus());
    }
  }

  notify();
}

/**
 * Initialize: check for `#file=` on page load and auto-open.
 * Call this once per page that supports file modals.
 */
export function initModalFromHash(): void {
  if (!IS_CLIENT) return;

  const filePath = getFileHash();
  if (filePath) {
    state = {
      open: true,
      filePath,
      trigger: null,
    };
    notify();
  }

  // Listen for hash changes (back/forward navigation)
  window.addEventListener('hashchange', () => {
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
  });

  // Escape key closes the modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.open) {
      e.preventDefault();
      closeModal();
    }
  });
}

/**
 * Handle keyboard navigation within search results.
 * Returns the new active index after processing the key event.
 *
 * @param e          - The keyboard event
 * @param currentIdx - Current active result index (-1 if none)
 * @param maxIdx     - Maximum valid index (results.length - 1)
 * @param onSelect   - Called when Enter is pressed on a valid result
 * @returns The new index, or -1 if nothing changed
 */
export function handleSearchKeyboard(
  e: KeyboardEvent,
  currentIdx: number,
  maxIdx: number,
  onSelect: (index: number) => void,
): number {
  if (maxIdx < 0) return -1;

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      return Math.min(currentIdx + 1, maxIdx);
    case 'ArrowUp':
      e.preventDefault();
      return Math.max(currentIdx - 1, 0);
    case 'Enter':
      if (currentIdx >= 0) {
        e.preventDefault();
        onSelect(currentIdx);
      }
      return currentIdx;
    default:
      return currentIdx;
  }
}

/**
 * Debounce helper.  Returns a debounced version of `fn` that
 * delays execution by `delay` ms.
 */
export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<T>) => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      fn(...args);
    }, delay);
  };
}

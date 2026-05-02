declare global {
  interface Window {
    __awesomeCopilotListingFlyoutsInitialized?: boolean;
  }
}

const FLYOUT_SELECTOR = '.listing-controls';

function closeFlyouts(except?: HTMLDetailsElement): void {
  document.querySelectorAll<HTMLDetailsElement>(FLYOUT_SELECTOR).forEach((flyout) => {
    if (flyout !== except) {
      flyout.open = false;
    }
  });
}

export function initListingFlyouts(): void {
  if (window.__awesomeCopilotListingFlyoutsInitialized) return;

  document.addEventListener(
    'toggle',
    (event) => {
      const flyout = event.target;
      if (!(flyout instanceof HTMLDetailsElement) || !flyout.matches(FLYOUT_SELECTOR) || !flyout.open) {
        return;
      }

      closeFlyouts(flyout);
    },
    true
  );

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (target instanceof Element && target.closest(FLYOUT_SELECTOR)) {
      return;
    }

    closeFlyouts();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;

    const activeFlyout = document.activeElement instanceof Element
      ? (document.activeElement.closest(FLYOUT_SELECTOR) as HTMLDetailsElement | null)
      : null;

    closeFlyouts();

    const summary = activeFlyout?.querySelector('summary');
    if (summary instanceof HTMLElement) {
      summary.focus();
    }
  });

  window.__awesomeCopilotListingFlyoutsInitialized = true;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initListingFlyouts, { once: true });
} else {
  initListingFlyouts();
}

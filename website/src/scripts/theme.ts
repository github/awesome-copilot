/**
 * Theme management for the Awesome Copilot website
 * Supports light/dark mode with user preference storage
 */

const THEME_KEY = 'theme';

/**
 * Get the current theme preference
 */
function getThemePreference(): 'light' | 'dark' {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  // Check system preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'dark';
}

/**
 * Apply theme to the document
 */
function applyTheme(theme: 'light' | 'dark'): void {
  document.documentElement.setAttribute('data-theme', theme);
}

const initialTheme = getThemePreference();
applyTheme(initialTheme);

/**
 * Toggle between light and dark theme
 */
export function toggleTheme(): void {
  const current = document.documentElement.getAttribute('data-theme') as 'light' | 'dark';
  const newTheme = current === 'light' ? 'dark' : 'light';
  applyTheme(newTheme);
  localStorage.setItem(THEME_KEY, newTheme);
}

/**
 * Initialize theme toggle button
 */
export function initThemeToggle(): void {
  const toggleBtn = document.getElementById('theme-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleTheme);
  }

  // Listen for system theme changes
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
      // Only auto-switch if user hasn't set a preference
      const stored = localStorage.getItem(THEME_KEY);
      if (!stored) {
        applyTheme(e.matches ? 'light' : 'dark');
      }
    });
  }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initThemeToggle);

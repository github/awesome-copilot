/**
 * Choices.js wrapper with sensible defaults
 */
import Choices from 'choices.js';
import 'choices.js/public/assets/styles/choices.min.css';

export type { Choices };

/**
 * Get selected values from a Choices instance
 */
export function getChoicesValues(choices: Choices): string[] {
  const val = choices.getValue(true);
  return Array.isArray(val) ? val : (val ? [val] : []);
}

/**
 * Create a new Choices instance with sensible defaults
 */
export function createChoices(selector: string | HTMLSelectElement, options: Partial<Choices['config']> = {}): Choices {
  return new Choices(selector, {
    removeItemButton: true,
    searchPlaceholderValue: 'Search...',
    noResultsText: 'No results found',
    noChoicesText: 'No options available',
    itemSelectText: '',
    shouldSort: false,
    searchResultLimit: 100,
    resetScrollPosition: false,
    ...options,
  });
}

export { Choices };

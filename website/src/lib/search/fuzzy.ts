/**
 * Client-side fuzzy search engine.
 *
 * Features:
 * - Searches across title, description, searchText, and tags fields
 * - Scoring with configurable weights
 * - Case-insensitive matching
 * - All-words-match bonus
 * - Configurable result limit and minimum score
 * - Highlight helper for search terms
 *
 * This is a pure search utility — no DOM access, no side effects.
 * The result objects are sorted by score (descending).
 */

export interface Searchable {
  title: string;
  description?: string;
  searchText?: string;
  tags?: string[];
  [key: string]: unknown;
}

export interface SearchOptions {
  /** Which fields to search. Default: ['title', 'description', 'searchText', 'tags']. */
  fields?: string[];
  /** Max results to return. Default: 50. */
  limit?: number;
  /** Minimum score threshold. Default: 1 (exclude items with no matches). */
  minScore?: number;
}

const DEFAULT_FIELDS = ['title', 'description', 'searchText', 'tags'];
const DEFAULT_LIMIT = 50;

export class FuzzySearch<T extends Searchable> {
  private items: T[] = [];

  setItems(items: T[]): void {
    this.items = [...items];
  }

  /**
   * Search items matching `query`.
   *
   * Scoring:
   *   - Exact match in title: 100 pts
   *   - Title starts with query: 80 pts
   *   - Title contains query: 60 pts
   *   - Description contains query: 30 pts
   *   - searchText contains query: 20 pts
   *   - Tags contain query: 15 pts each matching tag
   *   - Bonus 1.5x if ALL words in the query match
   */
  search(query: string, options?: SearchOptions): T[] {
    const q = query.trim().toLowerCase();
    if (!q) return this.items.slice(0, options?.limit ?? DEFAULT_LIMIT);

    const fields = options?.fields ?? DEFAULT_FIELDS;
    const limit = options?.limit ?? DEFAULT_LIMIT;
    const minScore = options?.minScore ?? 1;
    const words = q.split(/\s+/).filter(Boolean);

    const scored = this.items
      .map(item => ({ item, score: this.score(item, q, words, fields) }))
      .filter(entry => entry.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored.map(entry => entry.item);
  }

  private score(item: T, q: string, words: string[], fields: string[]): number {
    let score = 0;

    for (const field of fields) {
      const value = item[field];
      if (typeof value !== 'string') {
        // Tags array
        if (field === 'tags' && Array.isArray(value)) {
          for (const tag of value) {
            if (typeof tag === 'string' && tag.toLowerCase().includes(q)) {
              score += 15;
            }
          }
        }
        continue;
      }

      const text = value.toLowerCase();

      if (text === q) {
        if (field === 'title') score += 100;
      } else if (text.startsWith(q)) {
        if (field === 'title') score += 80;
      } else if (text.includes(q)) {
        if (field === 'title') score += 60;
        else if (field === 'description') score += 30;
        else if (field === 'searchText') score += 20;
      }
    }

    // All-words bonus: every search word appears somewhere in the text
    if (words.length > 1 && this.allWordsMatch(item, words, fields)) {
      score = Math.round(score * 1.5);
    }

    return score;
  }

  private allWordsMatch(item: T, words: string[], fields: string[]): boolean {
    const corpus = fields
      .map(f => {
        const v = item[f];
        if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string').join(' ');
        return typeof v === 'string' ? v : '';
      })
      .join(' ')
      .toLowerCase();

    return words.every(w => corpus.includes(w));
  }

  /**
   * Wrap matched terms in a string with `<mark>` elements.
   * Safe for use with `textContent`-derived strings (no XSS here —
   * the caller is responsible for escaping the original text if needed).
   */
  highlight(text: string, query: string): string {
    if (!query || !text) return text;

    const words = query.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return text;

    // Build a regex that matches any of the query words (case-insensitive)
    const escaped = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const pattern = new RegExp(`(${escaped.join('|')})`, 'gi');

    return text.replace(pattern, '<mark>$1</mark>');
  }

  /**
   * Return the current item count (for "X of Y" labels).
   */
  get itemCount(): number {
    return this.items.length;
  }
}

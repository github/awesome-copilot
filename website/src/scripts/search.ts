/**
 * Fuzzy search implementation for the Awesome Copilot website
 * Simple substring matching on title and description with scoring
 */

import { escapeHtml, fetchData } from "./utils";

export interface SearchItem {
  title: string;
  description?: string;
  searchText?: string;
  path: string;
  type: string;
  [key: string]: unknown;
}

export interface SearchableItem {
  title: string;
  description?: string;
  [key: string]: unknown;
}

export interface SearchOptions {
  fields?: string[];
  limit?: number;
  minScore?: number;
}

export class FuzzySearch<T extends SearchableItem = SearchItem> {
  private items: T[] = [];

  constructor(items: T[] = []) {
    this.items = items;
  }

  /**
   * Update the items to search
   */
  setItems(items: T[]): void {
    this.items = items;
  }

  /**
   * Search items with fuzzy matching
   */
  search(query: string, options: SearchOptions = {}): T[] {
    const {
      fields = ["title", "description", "searchText"],
      limit = 50,
      minScore = 0,
    } = options;

    if (!query || query.trim().length === 0) {
      return this.items.slice(0, limit);
    }

    const normalizedQuery = query.toLowerCase().trim();
    const queryWords = normalizedQuery.split(/\s+/);
    const results: Array<{ item: T; score: number }> = [];

    for (const item of this.items) {
      const score = this.calculateScore(item, queryWords, fields);
      if (score > minScore) {
        results.push({ item, score });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, limit).map((r) => r.item);
  }

  /**
   * Calculate match score for an item
   */
  private calculateScore(
    item: T,
    queryWords: string[],
    fields: string[]
  ): number {
    let totalScore = 0;

    for (const word of queryWords) {
      let wordScore = 0;

      for (const field of fields) {
        const value = (item as Record<string, unknown>)[field];
        if (!value) continue;

        const normalizedValue = String(value).toLowerCase();

        // Exact match in title gets highest score
        if (field === "title" && normalizedValue === word) {
          wordScore = Math.max(wordScore, 100);
        }
        // Title starts with word
        else if (field === "title" && normalizedValue.startsWith(word)) {
          wordScore = Math.max(wordScore, 80);
        }
        // Title contains word
        else if (field === "title" && normalizedValue.includes(word)) {
          wordScore = Math.max(wordScore, 60);
        }
        // Description contains word
        else if (field === "description" && normalizedValue.includes(word)) {
          wordScore = Math.max(wordScore, 30);
        }
        // searchText (includes tags, tools, etc) contains word
        else if (field === "searchText" && normalizedValue.includes(word)) {
          wordScore = Math.max(wordScore, 20);
        }
      }

      totalScore += wordScore;
    }

    // Bonus for matching all words
    const matchesAllWords = queryWords.every((word) =>
      fields.some((field) => {
        const value = (item as Record<string, unknown>)[field];
        return value && String(value).toLowerCase().includes(word);
      })
    );

    if (matchesAllWords && queryWords.length > 1) {
      totalScore *= 1.5;
    }

    return totalScore;
  }

  /**
   * Highlight matching text in a string
   */
  highlight(text: string, query: string): string {
    if (!query || !text) return escapeHtml(text || "");

    const normalizedQuery = query.toLowerCase().trim();
    const words = normalizedQuery.split(/\s+/);
    let result = escapeHtml(text);

    for (const word of words) {
      if (word.length < 2) continue;
      const regex = new RegExp(
        `(${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
        "gi"
      );
      const parts = result.split(/(<[^>]+>)/g);
      let inMark = false;
      result = parts
        .map((part) => {
          if (part.startsWith("<")) {
            if (part.toLowerCase() === "<mark>") inMark = true;
            if (part.toLowerCase() === "</mark>") inMark = false;
            return part;
          }

          if (inMark) {
            return part;
          }

          return part.replace(regex, "<mark>$1</mark>");
        })
        .join("");
    }

    return result;
  }
}

// Global search instance (uses SearchItem for the global search index)
export const globalSearch = new FuzzySearch<SearchItem>();

/**
 * Initialize global search with search index
 */
export async function initGlobalSearch(): Promise<FuzzySearch<SearchItem>> {
  const searchIndex = await fetchData<SearchItem[]>("search-index.json");
  if (searchIndex) {
    globalSearch.setItems(searchIndex);
  }
  return globalSearch;
}

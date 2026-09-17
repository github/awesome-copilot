import {
  type KeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { FileDirectoryIcon, SearchIcon } from "@primer/octicons-react";
import { clsx } from "clsx";

import { AgentsIcon } from "./AgentsIcon";
import { InstructionsIcon } from "./InstructionsIcon";
import { SkillsIcon } from "./SkillsIcon";
import { PluginsIcon } from "./PluginsIcon";
import { ExtensionsIcon } from "./ExtensionsIcon";
import { LearningHubIcon } from "./LearningHubIcon";
import { currentSearchLocale, searchPagefind } from "./pagefindSearch";
import { pageHref } from "./pageHref";
import {
  CATEGORY_LABELS, filterSearchItemsByLocale, mergeSearchItems,
  type SearchCategory, type SearchItem,
} from "./searchIndex";
import s from "./styles/TopNavSearch.module.css";

const CATEGORY_ORDER: SearchCategory[] = [
  "Pages",
  "Articles",
  "Agents",
  "Instructions",
  "Skills",
  "Plugins",
  "Extensions",
];

const MAX_RESULTS = 8;
const MAX_PER_GROUP = 4;
/** Upper bound on Pagefind hits fetched per query before merge/dedupe. */
const MAX_PAGEFIND_HITS = 12;

const CATEGORY_ICONS = {
  Pages: FileDirectoryIcon,
  Articles: LearningHubIcon,
  Agents: AgentsIcon,
  Instructions: InstructionsIcon,
  Skills: SkillsIcon,
  Plugins: PluginsIcon,
  Extensions: ExtensionsIcon,
};

type ResultGroup = { category: SearchCategory; items: SearchItem[] };

/**
 * Shared top-navigation search. A collapsed magnifier button expands into a
 * search field (also opened with ⌘K / Ctrl+K) and shows a live dropdown of
 * matches drawn from the site-wide index, so a visitor can search the whole
 * library and jump to any page from anywhere. The field, button, and ⌘K hint
 * reuse each page's scoped `styles`; the popover uses this component's module.
 *
 * The term can be controlled via `term`/`onTermChange` so a page that also
 * filters its own catalog (agents, skills, …) keeps narrowing its list as the
 * visitor types; omit them and the component manages its own term.
 */
export function TopNavSearch({
  index = [],
  styles,
  inputAriaLabel = "Search the library",
  term: controlledTerm,
  onTermChange,
  variant = "bar",
}: {
  /** Site-wide search index, injected from build-time data. */
  index?: SearchItem[];
  styles: Record<string, string | undefined>;
  inputAriaLabel?: string;
  term?: string;
  onTermChange?: (value: string) => void;
  /**
   * `"bar"` (default) is the collapsed magnifier that expands in the desktop
   * top bar. `"inline"` is the always-open, full-width field used inside the
   * mobile hamburger menu, where the desktop bar is hidden — so search stays
   * available at every viewport.
   */
  variant?: "bar" | "inline";
}) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [internalTerm, setInternalTerm] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const isControlled = controlledTerm !== undefined;
  const term = isControlled ? controlledTerm : internalTerm;
  const setTerm = (value: string) => {
    if (isControlled) {
      onTermChange?.(value);
    } else {
      setInternalTerm(value);
    }
  };

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  const trimmed = term.trim();
  const locale = currentSearchLocale();

  // Pagefind covers every built HTML page (Learning Hub articles included), which
  // the build-time `index` prop does not. It is only available after a build,
  // so results arrive asynchronously and are merged in when they land.
  const [pagefindResult, setPagefindResult] = useState<{
    term: string; locale: string; items: SearchItem[];
  }>({ term: "", locale, items: [] });

  useEffect(() => {
    if (trimmed.length === 0) {
      return;
    }
    let cancelled = false;
    searchPagefind(trimmed, MAX_PAGEFIND_HITS, locale).then((hits) => {
      if (!cancelled) setPagefindResult({ term: trimmed, locale, items: hits });
    });
    return () => {
      cancelled = true;
    };
  }, [trimmed, locale]);

  const groups = useMemo<ResultGroup[]>(() => {
    const query = trimmed.toLowerCase();
    if (query.length === 0) return [];
    const staticMatches = index.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        CATEGORY_LABELS[item.category].toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query),
    );
    // Static hits win on ties: they carry curated titles and descriptions.
    const matches = mergeSearchItems(filterSearchItemsByLocale([
      ...staticMatches,
      ...(pagefindResult.term === trimmed && pagefindResult.locale === locale
        ? pagefindResult.items : []),
    ], locale, pageHref()));
    // Reserve results in provider relevance order before arranging the groups.
    // Otherwise body-only article hits can push a curated resource match out.
    const selected: SearchItem[] = [];
    const counts = new Map<SearchCategory, number>();
    for (const item of matches) {
      if (selected.length >= MAX_RESULTS) break;
      const count = counts.get(item.category) ?? 0;
      if (count >= MAX_PER_GROUP) continue;
      selected.push(item);
      counts.set(item.category, count + 1);
    }
    return CATEGORY_ORDER.map((category) => ({
      category,
      items: selected.filter((item) => item.category === category),
    })).filter((group) => group.items.length > 0);
  }, [trimmed, index, pagefindResult, locale]);

  const flatResults = useMemo(
    () => groups.flatMap((group) => group.items),
    [groups],
  );

  useEffect(() => {
    setActiveIndex(-1);
  }, [trimmed]);

  const resultsOpen = open && focused && trimmed.length > 0;
  const hasResults = groups.length > 0;
  const activeDescendant =
    activeIndex >= 0 && activeIndex < flatResults.length
      ? `${listboxId}-option-${activeIndex}` : undefined;

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setTerm("");
      setActiveIndex(-1);
      setFocused(false);
      if (variant === "bar") {
        setOpen(false);
        window.requestAnimationFrame(() => triggerRef.current?.focus());
      }
      return;
    }

    if (!hasResults) return;

    const selectResult = (index: number) => {
      setActiveIndex(index);
      document.getElementById(`${listboxId}-option-${index}`)?.scrollIntoView({
        block: "nearest",
        inline: "nearest",
        behavior: "instant",
      });
    };

    if (event.key === "ArrowDown") {
      event.preventDefault();
      selectResult(activeIndex >= flatResults.length - 1 ? 0 : activeIndex + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      selectResult(activeIndex <= 0 ? flatResults.length - 1 : activeIndex - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      selectResult(0);
    } else if (event.key === "End") {
      event.preventDefault();
      selectResult(flatResults.length - 1);
    } else if (event.key === "Enter" && flatResults[activeIndex]) {
      event.preventDefault();
      window.location.assign(flatResults[activeIndex].href);
    }
  };

  const renderGroups = () => {
    if (!hasResults) {
      return (
        <p className={s.empty} role="status">
          No results for “{trimmed}”
        </p>
      );
    }

    let itemIndex = 0;
    return groups.map((group, groupIndex) => {
      const groupLabelId = `${listboxId}-group-${groupIndex}`;
      const Icon = CATEGORY_ICONS[group.category];
      return (
        <div
          className={s.group}
          key={group.category}
          role="group"
          aria-labelledby={groupLabelId}
        >
          <p id={groupLabelId} className={s.groupLabel}>
            <span className={s.groupIcon} aria-hidden="true">
              <Icon size={16} />
            </span>
            {CATEGORY_LABELS[group.category]}
          </p>
          {group.items.map((item) => {
            const index = itemIndex++;
            return (
              <a
                id={`${listboxId}-option-${index}`}
                key={`${item.category}-${item.href}-${item.title}`}
                href={item.href}
                className={clsx(
                  s.result,
                  activeIndex === index && s.resultActive,
                )}
                role="option"
                aria-selected={activeIndex === index}
                onFocus={() => setActiveIndex(index)}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <span className={s.resultContent}>
                  <span className={s.resultText}>{item.title}</span>
                  {item.locale && item.locale !== "en" && (
                    <span className={s.resultContext}>{item.locale}</span>
                  )}
                  {item.description && (
                    <span className={s.resultDescription}>{item.description}</span>
                  )}
                </span>
              </a>
            );
          })}
        </div>
      );
    });
  };

  if (variant === "inline") {
    return (
      <div className={s.inlineWrap} ref={rootRef}>
        <div className={s.inlineField}>
          <SearchIcon size={16} className={s.inlineIcon} />
          <input
            type="text"
            className={s.inlineInput}
            placeholder="Search"
            aria-label={inputAriaLabel}
            role="combobox"
            aria-expanded={trimmed.length > 0}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={activeDescendant}
            autoComplete="off"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            onKeyDown={handleInputKeyDown}
          />
        </div>
        {trimmed.length > 0 && (
          <div
            id={listboxId}
            className={s.inlineResults}
            role="listbox"
            aria-label="Search results"
          >
            {renderGroups()}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={s.wrap}
      ref={rootRef}
      onBlur={(event) => {
        if (event.currentTarget.contains(event.relatedTarget)) return;
        setFocused(false);
        setActiveIndex(-1);
        if (term.trim() === "") setOpen(false);
      }}
    >
      {open ? (
        <div className={styles.searchField}>
          <input
            ref={inputRef}
            type="text"
            className={styles.searchInput}
            placeholder="Search"
            aria-label={inputAriaLabel}
            role="combobox"
            aria-expanded={resultsOpen}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={activeDescendant}
            autoComplete="off"
            value={term}
            onFocus={() => setFocused(true)}
            onChange={(event) => setTerm(event.target.value)}
            onKeyDown={handleInputKeyDown}
          />
          <kbd className={styles.searchKbd}>⌘K</kbd>
        </div>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          className={styles.searchButton}
          aria-label="Search"
          aria-expanded={false}
          onClick={() => setOpen(true)}
        >
          <SearchIcon size={16} />
        </button>
      )}
      {resultsOpen && (
        <div
          id={listboxId}
          className={s.results}
          role="listbox"
          aria-label="Search results"
          onMouseDown={(event) => event.preventDefault()}
        >
          {renderGroups()}
        </div>
      )}
    </div>
  );
}

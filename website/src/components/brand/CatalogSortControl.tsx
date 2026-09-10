import { CheckIcon, ChevronDownIcon } from "@primer/octicons-react";
import { clsx } from "clsx";

type CatalogSortStyles = {
  sortControl: string;
  sortLabel: string;
  sortMenu: string;
  sortTrigger: string;
  sortChevron: string;
  sortOverlay: string;
  sortOption: string;
  sortOptionActive: string;
  sortOptionCheck: string;
};

export type CatalogSortOption<T extends string> = {
  value: T;
  label: string;
};

export const CATALOG_SORT_OPTIONS = [
  { value: "az", label: "A-Z" },
  { value: "newest", label: "Recently updated" },
] as const satisfies readonly CatalogSortOption<"az" | "newest">[];

type CatalogSortControlProps<T extends string> = {
  ariaLabel: string;
  onChange: (value: T) => void;
  options: readonly CatalogSortOption<T>[];
  styles: CatalogSortStyles;
  value: T;
};

export function CatalogSortControl<T extends string>({
  ariaLabel,
  onChange,
  options,
  styles,
  value,
}: CatalogSortControlProps<T>) {
  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? value;

  return (
    <div className={styles.sortControl}>
      <span className={styles.sortLabel}>Sort by:</span>
      <details className={styles.sortMenu}>
        <summary className={styles.sortTrigger} aria-label={ariaLabel}>
          {selectedLabel}
          <ChevronDownIcon size={16} className={styles.sortChevron} />
        </summary>
        <div className={styles.sortOverlay} role="menu">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="menuitemradio"
              aria-checked={value === option.value}
              className={clsx(
                styles.sortOption,
                value === option.value && styles.sortOptionActive,
              )}
              onClick={(event) => {
                onChange(option.value);
                event.currentTarget.closest("details")?.removeAttribute("open");
              }}
            >
              {option.label}
              <CheckIcon
                size={16}
                className={styles.sortOptionCheck}
                aria-hidden={value !== option.value}
              />
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}

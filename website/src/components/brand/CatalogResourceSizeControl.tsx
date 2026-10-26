import { CheckIcon, ChevronDownIcon } from "@primer/octicons-react";
import { clsx } from "clsx";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type SyntheticEvent,
} from "react";

export type CatalogResourceSizeOption<T extends number> = {
  value: T;
  label: string;
};

export const CATALOG_RESOURCE_SIZE_OPTIONS = [
  { value: 6, label: "6" },
  { value: 20, label: "20" },
  { value: 50, label: "50" },
  { value: 100, label: "100" },
] as const satisfies readonly CatalogResourceSizeOption<number>[];

/** A page size the catalogs offer: 6, 20, 50, or 100 items. */
export type CatalogResourceSize =
  (typeof CATALOG_RESOURCE_SIZE_OPTIONS)[number]["value"];

/** How many items a catalog page shows until the reader picks a size. */
export const DEFAULT_CATALOG_RESOURCE_SIZE: CatalogResourceSize = 6;

type CatalogResourceSizeControlProps<T extends number> = {
  ariaLabel: string;
  onChange: (value: T) => void;
  options: readonly CatalogResourceSizeOption<T>[];
  /** The catalog's CSS module. The menu reuses the sort menu's classes so the
   *  two toolbar menus look the same. */
  styles: Record<string, string | undefined>;
  value: T;
};

/**
 * The toolbar's page-size menu. `<details>` only gives a disclosure, so this
 * adds the menu button keyboard pattern on top: opening moves focus to the
 * selected size, arrow keys and Home/End move between sizes, Escape closes the
 * menu and returns focus to the trigger, and Tab or a click outside closes it.
 * Choosing a size closes the menu and lets go of focus, so the trigger does not
 * stay highlighted and Enter, Space, and the arrow keys go back to the page.
 */
export function CatalogResourceSizeControl<T extends number>({
  ariaLabel,
  onChange,
  options,
  styles,
  value,
}: CatalogResourceSizeControlProps<T>) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const triggerRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selectedLabel = options[selectedIndex]?.label ?? String(value);

  const menuItems = () =>
    Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="menuitemradio"]',
      ) ?? [],
    );

  const closeMenu = (restoreFocus: boolean) => {
    if (menuRef.current) menuRef.current.open = false;
    if (restoreFocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      const menu = menuRef.current;
      if (menu && !menu.contains(event.target as Node)) menu.open = false;
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const focusSelectedItem = () =>
    menuItems()[Math.max(selectedIndex, 0)]?.focus();

  const handleToggle = (event: SyntheticEvent<HTMLDetailsElement>) => {
    const isOpen = event.currentTarget.open;
    setOpen(isOpen);
    // The toggle event lands a task after the menu opens, so leave focus alone
    // if an arrow key has already moved it to an item.
    const focusInMenu = menuItems().some(
      (item) => item === document.activeElement,
    );
    if (isOpen && !focusInMenu) focusSelectedItem();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDetailsElement>) => {
    // Enter or Space on the trigger opens the menu. While it is closed, leave
    // the arrow keys to scroll the page, as they do on the Sort by menu.
    if (!event.currentTarget.open) return;

    const items = menuItems();
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    let next: number;
    switch (event.key) {
      case "Escape":
        event.preventDefault();
        closeMenu(true);
        return;
      case "Tab":
        // Let focus move on to the next control; just close behind it.
        closeMenu(false);
        return;
      case "ArrowDown":
        next = (current + 1) % items.length;
        break;
      case "ArrowUp":
        next = current <= 0 ? items.length - 1 : current - 1;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = items.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    items[next]?.focus();
  };

  return (
    <div className={styles.sortControl}>
      <span className={styles.sortLabel}>Resource page size:</span>
      <details
        ref={menuRef}
        className={styles.sortMenu}
        onToggle={handleToggle}
        onKeyDown={handleKeyDown}
      >
        <summary
          ref={triggerRef}
          className={styles.sortTrigger}
          aria-haspopup="menu"
          aria-label={`Resource page size: ${selectedLabel} (${ariaLabel})`}
        >
          {selectedLabel}
          <ChevronDownIcon size={16} className={styles.sortChevron} />
        </summary>
        <div className={styles.sortOverlay} role="menu" aria-label={ariaLabel}>
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
              onClick={() => {
                onChange(option.value);
                // A choice is the end of the menu, so let go of focus: the
                // trigger stops looking active and keys go back to the page.
                // Focusing it first keeps Tab moving on from the menu.
                closeMenu(true);
                triggerRef.current?.blur();
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

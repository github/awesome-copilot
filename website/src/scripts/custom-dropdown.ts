/**
 * Lightweight custom dropdown for select elements.
 * Supports both single-select and multi-select controls.
 */

type DropdownController = {
  container: HTMLElement;
  menu: HTMLElement;
  select: HTMLSelectElement;
  close: () => void;
  open: () => void;
};

const dropdowns: DropdownController[] = [];
let globalListenersReady = false;

export function initCustomDropdowns() {
  document.querySelectorAll<HTMLSelectElement>('.console-select-control select').forEach(select => {
    if (select.dataset.customDropdownReady === 'true') return;

    const container = select.closest<HTMLElement>('.console-select-control');
    if (!container) return;

    select.dataset.customDropdownReady = 'true';
    select.classList.add('native-select-hidden');
    container.classList.add('custom-dropdown-control');
    container.setAttribute('aria-haspopup', 'listbox');
    container.setAttribute('aria-expanded', 'false');
    if (!container.hasAttribute('tabindex')) container.tabIndex = 0;

    const menu = document.createElement('div');
    menu.className = 'custom-dropdown-menu';
    menu.setAttribute('role', 'listbox');
    if (select.multiple) menu.setAttribute('aria-multiselectable', 'true');
    menu.hidden = true;

    Array.from(select.options).forEach(option => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'custom-dropdown-item';
      if (select.multiple) item.classList.add('custom-dropdown-item--multi');
      item.textContent = option.text;
      item.dataset.value = option.value;
      item.setAttribute('role', 'option');
      if (option.selected) item.classList.add('is-selected');

      item.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (select.multiple) {
          if (!option.value) {
            Array.from(select.options).forEach(selectOption => {
              selectOption.selected = false;
            });
          } else {
            option.selected = !option.selected;
            const emptyOption = Array.from(select.options).find(selectOption => !selectOption.value);
            if (emptyOption) emptyOption.selected = false;
          }

          syncSelectedItems(menu, getSelectedValues(select));
        } else {
          select.value = option.value;
          syncSelectedItems(menu, [select.value]);
          closeDropdown(menu, container);
        }

        select.dispatchEvent(new Event('change', { bubbles: true }));
      });

      menu.appendChild(item);
    });

    document.body.appendChild(menu);

    const controller: DropdownController = {
      container,
      menu,
      select,
      close: () => closeDropdown(menu, container),
      open: () => openDropdown(menu, container, select),
    };
    dropdowns.push(controller);

    container.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (menu.hidden) {
        closeAllDropdowns();
        controller.open();
      } else {
        controller.close();
      }
    });

    container.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        controller.close();
        return;
      }

      if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'ArrowDown') return;
      event.preventDefault();
      closeAllDropdowns();
      controller.open();
    });
  });

  if (!globalListenersReady) {
    document.addEventListener('click', (event) => {
      const target = event.target as Node;
      if (dropdowns.some(({ container, menu }) => container.contains(target) || menu.contains(target))) return;
      closeAllDropdowns();
    });

    window.addEventListener('resize', closeAllDropdowns);
    window.addEventListener('scroll', (event) => {
      const target = event.target;
      if (target instanceof Node && dropdowns.some(({ menu }) => menu.contains(target))) return;
      closeAllDropdowns();
    }, true);
    globalListenersReady = true;
  }
}

function openDropdown(menu: HTMLElement, container: HTMLElement, select: HTMLSelectElement): void {
  syncSelectedItems(menu, getSelectedValues(select));
  positionMenu(menu, container);
  menu.hidden = false;
  container.classList.add('custom-dropdown-control--open');
  container.setAttribute('aria-expanded', 'true');
}

function closeDropdown(menu: HTMLElement, container: HTMLElement): void {
  menu.hidden = true;
  container.classList.remove('custom-dropdown-control--open');
  container.setAttribute('aria-expanded', 'false');
}

function closeAllDropdowns(): void {
  dropdowns.forEach(({ close }) => close());
}

function positionMenu(menu: HTMLElement, container: HTMLElement): void {
  const rect = container.getBoundingClientRect();
  menu.style.left = `${rect.left}px`;
  menu.style.top = `${rect.bottom + 4}px`;
  menu.style.minWidth = `${rect.width}px`;
  menu.style.maxWidth = `${Math.max(rect.width, 320)}px`;
}

function syncSelectedItems(menu: HTMLElement, values: string[]): void {
  menu.querySelectorAll<HTMLElement>('.custom-dropdown-item').forEach(item => {
    const itemValue = item.dataset.value ?? '';
    const selected = values.length === 0 ? itemValue === '' : values.includes(itemValue);
    item.classList.toggle('is-selected', selected);
    item.setAttribute('aria-selected', selected ? 'true' : 'false');
  });
}

function getSelectedValues(select: HTMLSelectElement): string[] {
  return Array.from(select.selectedOptions).map(option => option.value).filter(Boolean);
}

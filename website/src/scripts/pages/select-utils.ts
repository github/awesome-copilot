export function getSelectValues(select: HTMLSelectElement | null): string[] {
  if (!select) return [];
  return Array.from(select.selectedOptions).map((option) => option.value);
}

export function setSelectValues(select: HTMLSelectElement | null, values: string[]): void {
  if (!select) return;
  const selected = new Set(values);
  Array.from(select.options).forEach((option) => {
    option.selected = selected.has(option.value);
  });
}

export function clearSelectValues(select: HTMLSelectElement | null): void {
  if (!select) return;
  Array.from(select.options).forEach((option) => {
    option.selected = false;
  });
}

/**
 * InstructionItem → ResultItem adapter.
 */

import type { ResultItem } from '../types';
import type { InstructionItem } from '../upstream-types';
import { stableAccent } from '../../scripts/resource-catalog';
import { rawUrl } from './config';

export function adaptInstruction(item: InstructionItem): ResultItem {
  const tags = buildTags(item);

  const result: ResultItem = {
    id: item.id,
    title: item.title,
    label: 'Instruction',
    description: item.description,
    tags,
    accent: stableAccent(item.id),
    detail: item.path,
    applyTo: resolveApplyTo(item),
    actions: ['install', 'download', 'share', 'github'],
  };

  return result;
}

function resolveApplyTo(item: InstructionItem): string | undefined {
  if (typeof item.applyTo === 'string' && item.applyTo) return item.applyTo;
  if (Array.isArray(item.applyTo) && item.applyTo.length > 0) return item.applyTo.join(', ');
  if (item.applyToPatterns.length > 0) return item.applyToPatterns.join(', ');
  return undefined;
}

function buildTags(item: InstructionItem): string[] {
  const tags: string[] = [];

  if (item.extensions.length > 0) {
    tags.push(...item.extensions);
  } else {
    tags.push('(none)');
  }

  return tags;
}

/** Convenience: adapt an entire array. */
export function adaptInstructions(items: InstructionItem[]): ResultItem[] {
  return items.map(adaptInstruction);
}

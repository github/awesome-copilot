/**
 * SkillItem → ResultItem adapter.
 *
 * Skills have bundled files and a category, which drive the file-switcher
 * modal and the category filter respectively.
 */

import type { ResultItem, ResourceFile } from '../types';
import type { SkillItem } from '../upstream-types';
import { stableAccent } from '../../scripts/resource-catalog';
import { rawUrl } from './config';

export function adaptSkill(item: SkillItem): ResultItem {
  const tags = buildTags(item);

  const result: ResultItem = {
    id: item.id,
    title: item.title,
    label: 'Skill',
    description: item.description,
    tags,
    accent: stableAccent(item.id),
    detail: item.skillFile,
    category: item.category,
    resourceFiles: buildResourceFiles(item),
    items: item.files.length,
    actions: buildActions(item),
  };

  return result;
}

function buildTags(item: SkillItem): string[] {
  const tags: string[] = [];
  if (item.category) tags.push(item.category);
  if (item.hasAssets) tags.push(`${item.assetCount} asset${item.assetCount !== 1 ? 's' : ''}`);
  return tags;
}

function buildResourceFiles(item: SkillItem): ResourceFile[] {
  if (!Array.isArray(item.files) || item.files.length === 0) return [];

  return item.files.map(f => ({
    path: f.path,
    type: classifyFile(f.name),
    description: f.name,
  }));
}

function classifyFile(name: string): ResourceFile['type'] {
  const lower = name.toLowerCase();
  if (lower === 'skill.md') return 'skill';
  if (lower.endsWith('.sh') || lower.endsWith('.py') || lower.endsWith('.js') || lower.endsWith('.ts')) return 'script';
  if (lower.endsWith('.json') || lower.endsWith('.yaml') || lower.endsWith('.yml')) return 'reference';
  if (lower.endsWith('.css') || lower.endsWith('.svg') || lower.endsWith('.png') || lower.endsWith('.jpg')) return 'asset';
  if (lower.endsWith('.eval.md')) return 'eval';
  if (lower.endsWith('.attribution.md') || lower === 'attribution.md') return 'attribution';
  return 'reference';
}

function buildActions(item: SkillItem): string[] {
  const actions = ['download', 'share', 'github'];
  // Only show zip download when there are actually bundled files
  if (item.files.length > 0) actions.unshift('zip');
  return actions;
}

/** Convenience: adapt an entire array in one call. */
export function adaptSkills(items: SkillItem[]): ResultItem[] {
  return items.map(adaptSkill);
}

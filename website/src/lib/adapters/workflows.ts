/**
 * WorkflowItem → ResultItem adapter.
 */

import type { ResultItem } from '../types';
import type { WorkflowItem } from '../upstream-types';
import { rawUrl } from './config';

export function adaptWorkflow(item: WorkflowItem): ResultItem {
  const tags = item.triggers.length > 0 ? [...item.triggers] : [];

  const result: ResultItem = {
    slug: item.id,
    title: item.title,
    label: 'Workflow',
    description: item.description,
    tags,
    accent: 'yellow',
    detail: item.path,
    trigger: item.triggers.length > 0
      ? item.triggers.join(', ')
      : 'No trigger specified',
    actions: ['install', 'download', 'share', 'github'],
  };

  return result;
}

/** Convenience: adapt an entire array. */
export function adaptWorkflows(items: WorkflowItem[]): ResultItem[] {
  return items.map(adaptWorkflow);
}

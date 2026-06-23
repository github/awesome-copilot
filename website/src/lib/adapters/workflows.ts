/**
 * WorkflowItem → ResultItem adapter.
 */

import type { ResultItem } from '../types';
import type { WorkflowItem } from '../upstream-types';
import { stableAccent } from '../../scripts/resource-catalog';
import { rawUrl } from './config';

export function adaptWorkflow(item: WorkflowItem): ResultItem {
  const tags = item.triggers.length > 0 ? [...item.triggers] : [];

  const result: ResultItem = {
    id: item.id,
    title: item.title,
    label: 'Workflow',
    description: item.description,
    tags,
    accent: stableAccent(item.id),
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

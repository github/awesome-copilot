/**
 * Adapter barrel export.
 *
 * Each module exports a function (e.g. `adaptAgent`) and a convenience
 * batch function (e.g. `adaptAgents`).  Everything is a pure function —
 * no DOM access, no side effects.
 */

export { adaptAgent, adaptAgents } from './agents';
export { adaptInstruction, adaptInstructions } from './instructions';
export { adaptSkill, adaptSkills } from './skills';
export { adaptHook, adaptHooks } from './hooks';
export { adaptWorkflow, adaptWorkflows } from './workflows';
export { adaptPlugin, adaptPlugins } from './plugins';
export { adaptTool, adaptTools, adaptToolForSearch } from './tools';
export { adaptSamples } from './samples';
export type { CookbookRecipeEntry, CookbookSummary } from './samples';
export { adaptManifest } from './manifest';
export type { ManifestSummary } from './manifest';
export { adaptSearchIndex } from './search';
export type { SearchResultEntry } from './search';
export { rawUrl, githubBlobUrl, RAW_BASE, GITHUB_BLOB_BASE } from './config';

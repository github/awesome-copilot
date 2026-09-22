/**
 * Registry of Learning Hub slugs that render a bespoke, ported prototype
 * component instead of the generic markdown pipeline (`LearningHubArticle.astro`).
 *
 * These slugs map 1:1 onto a prototype `LearningArticleLayout` page that has
 * been adopted directly (see the "Learning Hub uplift" plan). All other
 * Learning Hub slugs keep using the generic markdown renderer.
 *
 * Bespoke components only render for the unprefixed (English) route; locale
 * routes for these slugs still fall through to the generic English-fallback
 * behavior already used for the rest of the site (no bespoke localization of
 * these pages yet).
 *
 * Astro's `client:*` hydration directives require the component to be
 * statically imported and referenced directly in a template — a dynamic
 * lookup table of components can't be passed through props and hydrated. So
 * `[...slug].astro` branches on this list by name and imports each bespoke
 * component itself; this file is just the shared list of which slugs qualify.
 */
export const BESPOKE_LEARNING_HUB_SLUGS = [
  "github-copilot-app",
  "agents-and-subagents",
  "copilot-configuration-basics",
  "github-copilot-terminology-glossary",
  "using-automations-in-copilot-app",
  "what-are-agents-skills-instructions",
  "working-with-canvas-extensions",
  "cli-for-beginners",
  "cookbook",
] as const;

export type BespokeLearningHubSlug = (typeof BESPOKE_LEARNING_HUB_SLUGS)[number];

export const isBespokeLearningHubArticle = (
  slug: string,
): slug is BespokeLearningHubSlug =>
  (BESPOKE_LEARNING_HUB_SLUGS as readonly string[]).includes(slug);

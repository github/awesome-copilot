/**
 * Local replacement for the prototype's `PrototypePageProps`.
 *
 * The prototype resolved page links through a host-supplied `pageHref` helper.
 * On this site, routes are real URLs, so `pageHref` maps a prototype page slug
 * to the equivalent site route (honouring the configured base path).
 */

const BASE = import.meta.env.BASE_URL ?? "/";

/** Prototype page slug → site route. Slugs not listed fall through as-is. */
const ROUTES: Record<string, string> = {
  "": "",
  agents: "agents/",
  instructions: "instructions/",
  skills: "skills/",
  plugins: "plugins/",
  extensions: "extensions/",
  contributors: "contributors/",
  agent: "agents/",
  "learning-hub-copilot-app": "learning-hub/",
  cookbook: "learning-hub/cookbook/",
  "github-copilot-app": "learning-hub/github-copilot-app/",
  "working-with-canvas-extensions": "learning-hub/working-with-canvas-extensions/",
  "using-automations-in-copilot-app":
    "learning-hub/using-automations-in-copilot-app/",
  "what-are-agents-skills-instructions":
    "learning-hub/what-are-agents-skills-instructions/",
  "agents-and-subagents": "learning-hub/agents-and-subagents/",
  "copilot-configuration-basics": "learning-hub/copilot-configuration-basics/",
  "github-copilot-terminology-glossary":
    "learning-hub/github-copilot-terminology-glossary/",
  "cli-for-beginners": "learning-hub/cli-for-beginners/",
  "dotnet-upgrade": "agent/dotnet-upgrade/",
};

export type PageHref = (page?: string) => string;

const withBase = (path: string) =>
  `${BASE.endsWith("/") ? BASE : `${BASE}/`}${path}`.replace(/\/{2,}/g, "/");

/**
 * Resolve a prototype page slug (or an explicit path) to a site URL.
 * Passing no argument returns the site root.
 */
export const pageHref: PageHref = (page) => {
  if (!page) return withBase("");
  const mapped = ROUTES[page];
  if (mapped !== undefined) return withBase(mapped);
  // Unknown slug: treat as an explicit path so new pages work without a map entry.
  return withBase(page.replace(/^\//, "").replace(/\/?$/, "/"));
};

export type PrototypePageProps = { pageHref: PageHref };

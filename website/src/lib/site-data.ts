/**
 * Build-time accessors for the generated catalog data in `public/data/`.
 *
 * Pages import these rather than reading the JSON directly, so the shape used
 * by the React components is defined in exactly one place and the shell always
 * gets consistent counts and a consistent search index.
 */
import agentsData from "../../public/data/agents.json";
import extensionsData from "../../public/data/extensions.json";
import instructionsData from "../../public/data/instructions.json";
import pluginsData from "../../public/data/plugins.json";
import searchIndexData from "../../public/data/search-index.json";
import skillsData from "../../public/data/skills.json";

import {
  buildSearchIndex,
  type GeneratedSearchRecord,
  type SearchItem,
} from "../components/brand/searchIndex";

const BASE = import.meta.env.BASE_URL ?? "/";

export const agents = agentsData.items;
export const extensions = extensionsData.items;
export const instructions = instructionsData.items;
export const plugins = pluginsData.items;
export const skills = skillsData.items;

/** Live catalog counts, injected into the home page and nav in place of the
 *  prototype's hardcoded figures. */
export const counts = {
  agents: agents.length,
  extensions: extensions.length,
  instructions: instructions.length,
  plugins: plugins.length,
  skills: skills.length,
};

/** Site-wide search index for `TopNavSearch`, shared by every page. */
export const searchIndex: SearchItem[] = buildSearchIndex(
  searchIndexData as GeneratedSearchRecord[],
  BASE,
);

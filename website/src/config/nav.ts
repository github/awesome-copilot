import type { NavItem } from '../lib/types';

/**
 * Primary navigation structure.
 *
 * Matches the routes defined in the spec and the Starlight sidebar
 * (see `astro.config.mjs` for comparison).  The Learning Hub routes
 * are included here so the main nav covers all top-level sections.
 */

export const primaryNav: NavItem[] = [
  { label: 'Agents', href: '/agents/' },
  { label: 'Instructions', href: '/instructions/' },
  { label: 'Skills', href: '/skills/' },
  { label: 'Hooks', href: '/hooks/' },
  { label: 'Workflows', href: '/workflows/' },
  { label: 'Plugins', href: '/plugins/' },
  { label: 'Tools', href: '/tools/' },
  { label: 'Learning Hub', href: '/learning-hub/' },
];

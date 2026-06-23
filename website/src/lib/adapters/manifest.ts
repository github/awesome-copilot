/**
 * Manifest adapter.
 *
 * Converts the build-time manifest into homepage ResourceCards and
 * summary counts used by the landing page.
 */

import type { ResourceCard, Accent } from '../types';
import type { ManifestItem } from '../upstream-types';

export interface ManifestSummary {
  generated: string;
  counts: Record<string, number>;
  cards: ResourceCard[];
}

const SECTION_CONFIG: Record<string, { icon: string; accent: Accent; href: string }> = {
  agents:       { icon: 'agent',       accent: 'purple',  href: '/agents/' },
  instructions: { icon: 'instruction', accent: 'blue',    href: '/instructions/' },
  skills:       { icon: 'skill',       accent: 'blue',    href: '/skills/' },
  hooks:        { icon: 'hook',        accent: 'purple',  href: '/hooks/' },
  workflows:    { icon: 'workflow',    accent: 'purple',  href: '/workflows/' },
  plugins:      { icon: 'plugin',      accent: 'blue',    href: '/plugins/' },
  tools:        { icon: 'tool',        accent: 'purple',  href: '/tools/' },
};

const SECTION_LABELS: Record<string, string> = {
  agents:       'Agents',
  instructions: 'Instructions',
  skills:       'Skills',
  hooks:        'Hooks',
  workflows:    'Workflows',
  plugins:      'Plugins',
  tools:        'Tools',
};

const SECTION_DESCRIPTIONS: Record<string, string> = {
  agents:       'Community-contributed custom agents for GitHub Copilot',
  instructions: 'Custom coding instructions for languages and frameworks',
  skills:       'Agent Skills with bundled resources for specialized tasks',
  hooks:        'Automated hooks triggered by Copilot session events',
  workflows:    'AI-powered repository automations for GitHub Actions',
  plugins:      'Curated plugin bundles of agents and skills',
  tools:        'MCP servers, editor extensions, and CLI tools',
};

export function adaptManifest(manifest: ManifestItem): ManifestSummary {
  const counts = { ...manifest.counts };
  const cards: ResourceCard[] = [];

  for (const [key, config] of Object.entries(SECTION_CONFIG)) {
    const count = counts[key] ?? 0;
    const label = SECTION_LABELS[key] ?? key;
    const description = SECTION_DESCRIPTIONS[key] ?? '';

    cards.push({
      title: count > 0 ? `${label} (${count})` : label,
      label,
      description,
      icon: config.icon,
      accent: config.accent,
      href: config.href,
    });
  }

  // Always add Learning Hub (not in manifest counts)
  cards.push({
    title: 'Learning Hub',
    label: 'Learning Hub',
    description: 'Guides, reference docs, and hands-on cookbook recipes',
    icon: 'docs',
    accent: 'blue',
    href: '/learning-hub/',
  });

  return {
    generated: manifest.generated,
    counts,
    cards,
  };
}

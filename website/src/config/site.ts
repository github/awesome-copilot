/**
 * Site-wide configuration constants.
 *
 * Replacements for `virtual:starlight/user-config` and inline config
 * previously defined in `astro.config.mjs`.
 */

export const SITE = {
  title: 'Awesome GitHub Copilot',
  description:
    'Community-contributed agents, instructions, and skills to enhance your GitHub Copilot experience',
  url: 'https://awesome-copilot.github.com/',
  base: '/',
  favicon: '/images/favicon.svg',
  socialImage: '/images/social-image.png',
  editBaseUrl:
    'https://github.com/github/awesome-copilot/edit/staged/website/',
  themeColor: '#0A0D0D',
} as const;

/** Public repository metadata. */
export const REPO = {
  owner: 'github',
  name: 'awesome-copilot',
  url: 'https://github.com/github/awesome-copilot',
} as const;

# Project Discoveries

A living log of architectural decisions, patterns, and hard-learned lessons for the Awesome GitHub Copilot website.

## [2026-06-15] macOS glass theme direction and reusable glass-card surface

- **What changed:** Introduced a `.glass-card` utility in `website/src/styles/global.css` and simplified the theme toggle to an explicit dark/light toggle while still defaulting first-time visits to the system preference.
- **Why:** We want a consistent, big-tech-grade translucent glass aesthetic across landing and content pages without rebuilding every card component from scratch. Removing the `auto` toggle state reduces UI ambiguity while still respecting the OS default on first paint.
- **Impact:** `website/src/styles/global.css`, `website/src/components/ThemeToggle.astro`, `website/src/components/Head.astro`, plus new `.astro` pages (`how-to-use.astro`, `contribute.astro`) and sidebar entries.
- **Reference:** `feature/website-polish` branch commits around `a27fa743`–`fc354282`.

## [2026-06-15] Landing-page restructure into intent-driven sections

- **What changed:** Rewrote `website/src/pages/index.astro` using new components (`Hero`, `HomeCategoryCard`, `QuickLinks`, `StatsRibbon`) and moved the flat 9-card grid into three clusters: *Code smarter*, *Automate workflows*, and *Extend and learn*.
- **Why:** A directory-style grid surfaces taxonomy before user intent. Grouping cards by what the user wants to do makes the landing page feel like a product destination rather than an awesome-list index.
- **Impact:** `website/src/pages/index.astro`, `website/src/components/home/*`, `website/src/scripts/pages/index.ts`, `website/src/styles/global.css`.
- **Reference:** `feature/website-polish` branch commits around `3bd10087`–`3e724813`.

## [2026-06-15] Extended glass theme to listing pages and completed landing page sections

- **What changed:** Applied the glass-card surface to resource listing pages (resource items, listing toolbar, search/filter inputs, ContributeCTA) and added the final landing-page sections: *How it works*, *Install in seconds*, and *Built by developers, for developers*. Also added an optional `class` prop to the `Icon` component.
- **Why:** Consistency across the site reinforces the product-site aesthetic and gives users a clear path from discovery → installation → contribution.
- **Impact:** `website/src/styles/global.css`, `website/src/components/PageHeader.astro`, `website/src/components/ContributeCTA.astro`, `website/src/components/Icon.astro`, `website/src/components/home/HowItWorks.astro`, `website/src/components/home/InstallCard.astro`, `website/src/components/home/CommunityCTA.astro`, `website/src/pages/index.astro`.
- **Reference:** `feature/website-polish` branch commits around `5a0f0e20`–`a32d148b`.

## [2026-06-15] UI refinements based on feedback

- **What changed:** Removed the hero animated background, simplified the theme toggle to a minimalist icon button, cleaned up button colors (removed purple glow primary), fixed GitHub icon alignment, aligned stats baselines, increased search results height, and redesigned *How it works* as a commit-history timeline.
- **Why:** The first iteration had visual noise (orbs, purple buttons, misaligned icons) and inconsistent card sizing. Simplifying the palette and aligning elements gives the page the calm, big-tech finish requested.
- **Impact:** `website/src/styles/global.css`, `website/src/components/ThemeToggle.astro`, `website/src/components/home/Hero.astro`, `website/src/components/home/HowItWorks.astro`, `website/src/components/home/CommunityCTA.astro`, `website/src/components/home/InstallCard.astro`, `website/src/scripts/pages/index.ts`.
- **Reference:** `feature/website-polish` branch commits around `7b306c03`–`04f7b7c2`.

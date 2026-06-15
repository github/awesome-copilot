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

## [2026-06-15] Final alignment and icon polish

- **What changed:** Fixed stats ribbon alignment so all items line up, bumped the hero GitHub button icon to 22px with proper vertical centering, redesigned *How it works* into a true GitHub-style vertical commit history, aligned the *Install in seconds* icon with its title, and enlarged the GitHub logo in the *Built by developers* CTA.
- **Why:** The previous commit-history timeline was still card-like; a vertical line with connected commit dots reads more authentically like a GitHub history and balances the page.
- **Impact:** `website/src/components/home/StatsRibbon.astro`, `website/src/components/home/Hero.astro`, `website/src/components/home/HowItWorks.astro`, `website/src/components/home/InstallCard.astro`, `website/src/components/home/CommunityCTA.astro`, `website/src/styles/global.css`.
- **Reference:** `feature/website-polish` branch commits around `04809234`–`1c0aaee3`.

## [2026-06-15] Site footer and resource-modal text rendering

- **What changed:** Replaced the minimal Starlight footer with a proper site footer (`website/src/components/Footer.astro`) containing brand links, browse and resource columns, the theme toggle, and copyright/credits. Also fixed resource-listing modal text rendering by styling `.modal-body` (scrollable, flex-fill, proper background) and both raw (`#modal-content pre`) and rendered (`.modal-rendered-content`) markdown views with readable colors, typography, and code blocks.
- **Why:** A custom footer completes the product-site experience and gives users persistent navigation to every resource type. The modal was missing body/content styles entirely, so long files could overflow and rendered markdown had no typography or contrast guarantees.
- **Impact:** `website/src/components/Footer.astro`, `website/src/styles/global.css`.
- **Reference:** `feature/website-polish` branch commits around `6a8aecec`–`e914f6d0`.

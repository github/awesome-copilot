# Project Discoveries

A living log of architectural decisions, patterns, and hard-learned lessons for the Awesome GitHub Copilot website.

## [2026-06-15] macOS glass theme direction and reusable glass-card surface

- **What changed:** Introduced a `.glass-card` utility in `website/src/styles/global.css` and simplified the theme toggle to an explicit dark/light toggle while still defaulting first-time visits to the system preference.
- **Why:** We want a consistent, big-tech-grade translucent glass aesthetic across landing and content pages without rebuilding every card component from scratch. Removing the `auto` toggle state reduces UI ambiguity while still respecting the OS default on first paint.
- **Impact:** `website/src/styles/global.css`, `website/src/components/ThemeToggle.astro`, `website/src/components/Head.astro`, plus new `.astro` pages (`how-to-use.astro`, `contribute.astro`) and sidebar entries.
- **Reference:** `feature/website-polish` branch commits around `a27fa743`–`fc354282`.

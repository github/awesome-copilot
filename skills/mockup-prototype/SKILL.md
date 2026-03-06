---
name: mockup-prototype
description: 'Generate interactive HTML mockups from a description, iterate on them, and deploy to GitHub Pages for sharing. Use this skill when the user wants to create a mockup, prototype, UI exploration, or design comparison, or when they want to deploy or share one.'
---

# Mockup Prototype

End-to-end workflow for creating, iterating, and sharing interactive HTML mockups using Copilot CLI.

## When to Use This Skill

- User asks to "create a mockup" or "prototype a UI"
- User wants to compare design alternatives side by side
- User asks to "deploy" or "share" a mockup with colleagues
- User wants a quick visual exploration of a feature idea

## Phase 1: Generate

Create a **single self-contained HTML file** with all CSS inline. No external dependencies, no build steps.

### Style guide

Match the visual style of the product being mocked up. If the user specifies a product or brand, replicate its look (colors, spacing, typography). If no specific product is mentioned, use a clean dark theme as a sensible default:

| Token | Value |
|-------|-------|
| Background (page) | `#0d1117` |
| Background (surface) | `#161b22` |
| Background (overlay) | `#21262d` |
| Text (primary) | `#e6edf3` |
| Text (secondary) | `#9198a1` |
| Text (muted) | `#7d8590` |
| Border | `#30363d` |
| Blue | `#4493f8` |
| Green | `#3fb950` |
| Red | `#f85149` |
| Yellow | `#d29922` |
| Purple | `#a371f7` |
| Font stack | `-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif` |

Use inline SVGs for icons. Do not reference external icon libraries or CDNs.

### Comparing multiple options

When showing alternatives, use a tabbed layout:

```html
<!-- Sticky nav -->
<div class="option-nav">
  <button class="option-btn active" onclick="show('a')">A. Option name</button>
  <button class="option-btn" onclick="show('b')">B. Option name</button>
</div>

<!-- Each option in its own section -->
<div class="mockup-section active" id="section-a">
  <!-- mockup content -->
  <!-- pros/cons narrative INSIDE this div -->
</div>
<div class="mockup-section" id="section-b">
  <!-- mockup content -->
  <!-- pros/cons narrative INSIDE this div -->
</div>

<script>
function show(id) {
  document.querySelectorAll('.mockup-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('section-' + id).classList.add('active');
  event.target.classList.add('active');
}
</script>
```

Key rules:
- Narrative blocks (pros/cons) go **inside** each `.mockup-section`, not outside
- Only one section visible at a time via CSS (`display:none` / `display:block`)
- Use realistic data, not placeholder text

### Preview locally

```bash
open ~/Desktop/<mockup-name>.html   # macOS
xdg-open ~/Desktop/<mockup-name>.html  # Linux
```

## Phase 2: Iterate

1. Edit the HTML file based on user feedback
2. Reopen in browser after each change
3. Common iteration patterns:
   - Adding/removing/reordering options
   - Adding pros/cons narrative below each option
   - Tweaking layout, spacing, colors
   - Fixing visual bugs reported via screenshots

## Phase 3: Deploy for sharing

### Quick deploy: GitHub Pages

1. **Check for a deploy repo** under the user's account (e.g., `<user>/mockups`). Create if needed:
   ```bash
   gh repo create <user>/mockups --public --clone
   ```

2. **Enable GitHub Pages** with the Actions workflow approach:
   ```bash
   gh api repos/<user>/mockups/pages -X POST -f build_type=workflow
   ```

3. **Add the Pages deploy workflow** (`.github/workflows/pages.yml`):
   ```yaml
   name: Deploy to GitHub Pages
   on:
     push:
       branches: [main]
   permissions:
     contents: read
     pages: write
     id-token: write
   jobs:
     deploy:
       runs-on: ubuntu-latest
       environment:
         name: github-pages
         url: ${{ steps.deployment.outputs.page_url }}
       steps:
         - uses: actions/checkout@v4
         - uses: actions/configure-pages@v4
         - uses: actions/upload-pages-artifact@v3
           with:
             path: '.'
         - id: deployment
           uses: actions/deploy-pages@v4
   ```

4. **Copy the file, commit, push.** For a single mockup use `index.html`. For multiple, use subdirectories:
   ```
   mockups/
     sessions-sidebar/index.html
     deployment-status/index.html
   ```

5. **Return the live URL:**
   ```
   https://<user>.github.io/mockups/
   ```

### Team repo: PR for project context

1. Find the right folder convention in the repo. Look for existing directories like `considerations/`, `docs/mockups/`, `designs/`, `proposals/`, or `product/`. If none exist, use `docs/mockups/`.
2. Use a feature-scoped subdirectory with a `README.md`:
   ```
   docs/mockups/feature-name/
     mockup.html
     README.md
   ```
3. Open a PR with a summary table of options and a link to the live Pages version
4. Always deploy to Pages first so the PR body can link to the live URL

## Guidelines

- Single self-contained HTML file. No build tools, no npm, no frameworks.
- Clean up temp directories (`/tmp/...`) after deployment.
- When updating, push to both the Pages repo and team repo.
- Use descriptive file and folder names (e.g., `sessions-sidebar`, not `mockup-1`).

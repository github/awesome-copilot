---
name: content-management-systems
description: 'Workflow for building and modifying content management systems across WordPress, Shopify, Wix, Squarespace, Drupal, WooCommerce, Joomla, HubSpot CMS Hub, Webflow, Adobe Experience Manager, and similar platforms. Use when working on CMS themes, plugins, apps, modules, admin panels, media uploads, content models, editors, markdown pipelines, or static export workflows.'
---

# Content Management Systems

Use this skill when the user is working on a content management system or on software that behaves like one.

This skill focuses on the seams that matter in CMS work:

- themes and templates
- plugins, apps, modules, and extensions
- admin and editor interfaces
- media and upload handling
- content models, taxonomy, and metadata
- render pipelines and static export flows

## When to Use This Skill

- The user mentions a CMS platform such as WordPress, Shopify, Drupal, Joomla, Webflow, Squarespace, Wix, WooCommerce, HubSpot CMS Hub, or Adobe Experience Manager.
- The task is about theme development, template changes, or design system work inside a CMS.
- The task is about plugins, modules, apps, or extension points.
- The task touches editor UX, previews, taxonomy, slugs, SEO fields, or publishing behavior.
- The task involves uploads, media libraries, authored assets, markdown rendering, or static export.

## First Pass

1. Identify the platform category: self-hosted CMS, SaaS site builder, commerce platform, or hybrid/headless system.
2. Find the owning implementation seam before editing:
   - theme or template layer
   - plugin, app, module, or extension layer
   - admin or editor surface
   - content model or storage layer
   - media pipeline
   - export, deploy, or rendering pipeline
3. Check platform constraints before choosing an approach:
   - what is editable locally
   - what is authored content versus code
   - where media belongs
   - whether the final site is server-rendered, static-exported, or hosted remotely

## CMS Rules

- Follow the platform's naming and folder conventions for themes, modules, template parts, or sections.
- Keep theme assets separate from user-uploaded media unless the platform explicitly combines them.
- Prefer structured content fields over storing important metadata inside presentation markup.
- Treat previews, slugs, taxonomy, excerpts, meta fields, and publish states as first-class CMS concerns.
- Prefer safe defaults and graceful fallback behavior when config, theme selection, or content input is invalid.
- When changing editor or admin behavior, trace the stored field, validation rules, preview path, and final render path together.

## Common Workflows

### Themes and Templates

- Start at the template loader or theme runtime, not at a downstream include.
- Preserve the platform's template hierarchy and partial naming conventions.
- Keep presentation changes close to templates and shared theme helpers.

### Plugins, Apps, and Modules

- Add behavior at the platform's extension seam instead of scattering logic into templates.
- Keep migrations, seed data, and configuration updates explicit and versioned.
- Document the extension's setup assumptions when the platform requires activation or registration.

### Admin and Editor UX

- Keep forms aligned with the stored content model.
- Prefer author-facing previews when content transformations are non-trivial.
- Keep validation, CSRF or equivalent safeguards, and permissions consistent with the surrounding admin code.

### Media and Uploads

- Use a dedicated upload path for authored media.
- Keep decorative or theme-owned imagery in the active theme folder.
- Default to conventional locations like `uploads/` for authored media and `img/` for theme assets unless the platform dictates a stronger convention.
- When a CMS supports configurable media directories, expose the setting with a safe fallback.

### Content Models and Migrations

- Distinguish content entities clearly: pages, posts, products, entries, collections, taxonomies, and settings.
- Prefer migration files or exportable schema definitions over ad hoc runtime mutations.
- Keep slugs, publish dates, excerpts, canonical metadata, and taxonomy relations structured.

### Markdown, HTML, and Static Export

- Decide whether markdown is authored input, intermediate content, or build output before changing the renderer.
- Pair renderer changes with preview or validation when feasible.
- For static-exported CMS systems, validate rewritten permalinks and asset paths after build changes.

## Identifying the Owning Seam

Regardless of platform, locate the owning seam before editing by mapping the codebase to these CMS roles:

- Runtime bootstrap and request routing
- Admin or editor controllers and their view templates
- Theme loading, template hierarchy, and shared template helpers
- Repositories, models, or schema/migration files for content, taxonomy, and settings
- Markdown or content transformation utilities
- Static export, deploy, or render pipeline entry points

Step to the owning seam first, then make the smallest change that preserves the CMS structure.

## Platform Notes

See `references/cms-platform-workflows.md` for a compact mapping of common CMS platforms, extension surfaces, and media conventions.

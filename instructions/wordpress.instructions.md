---
applyTo: 'wp-content/plugins/**,wp-content/themes/**,**/*.php,**/*.inc,**/*.js,**/*.jsx,**/*.ts,**/*.tsx,**/*.css,**/*.scss,**/*.json'
description: 'Coding, security, and testing rules for WordPress plugins and themes'
---

# WordPress Development — Copilot Instructions

**Goal:** Generate WordPress code that is secure, performant, testable, and compliant with official WordPress practices. Prefer hooks, small functions, dependency injection (where sensible), and clear separation of concerns.

## 1) Core Principles
- Never modify WordPress core. Extend via **actions** and **filters**.
- For plugins, always include a header and guard direct execution in entry PHP files.
- Use unique prefixes or PHP namespaces to avoid global collisions.
- Enqueue assets; never inline raw `<script>`/`<style>` in PHP templates.
- Make user‑facing strings translatable and load the correct text domain.

### Minimal plugin header & guard
```php
<?php
defined('ABSPATH') || exit;
/**
 * Plugin Name: Awesome Feature
 * Description: Example plugin scaffold.
 * Version: 0.1.0
 * Author: Example
 * License: GPL-2.0-or-later
 * Text Domain: awesome-feature
 * Domain Path: /languages
 */
```

## 2) Coding Standards (PHP, JS, CSS, HTML)
- Follow **WordPress Coding Standards (WPCS)** and write DocBlocks for public APIs.
- PHP: Prefer strict comparisons (`===`, `!==`) where appropriate. Be consistent with array syntax and spacing as per WPCS.
- JS: Match WordPress JS style; prefer `@wordpress/*` packages for block/editor code.
- CSS: Use BEM‑like class naming when helpful; avoid over‑specific selectors.
- PHP 7.4+ compatible patterns unless the project specifies higher. Avoid using features not supported by target WP/PHP versions.

### Linting setup suggestions
```xml
<!-- phpcs.xml -->
<?xml version="1.0"?>
<ruleset name="Project WPCS">
  <description>WordPress Coding Standards for this project.</description>
  <file>./</file>
  <exclude-pattern>vendor/*</exclude-pattern>
  <exclude-pattern>node_modules/*</exclude-pattern>
  <rule ref="WordPress"/>
  <rule ref="WordPress-Docs"/>
  <rule ref="WordPress-Extra"/>
  <rule ref="PHPCompatibility"/>
  <config name="testVersion" value="7.4-"/>
</ruleset>
```

```json
// composer.json (snippet)
{
  "require-dev": {
    "dealerdirect/phpcodesniffer-composer-installer": "^1.0",
    "wp-coding-standards/wpcs": "^3.0",
    "phpcompatibility/php-compatibility": "^9.0"
  },
  "scripts": {
    "lint:php": "phpcs -p",
    "fix:php": "phpcbf -p"
  }
}
```

```json
// package.json (snippet)
{
  "devDependencies": {
    "@wordpress/eslint-plugin": "^x.y.z"
  },
  "scripts": {
    "lint:js": "eslint ."
  }
}
```

## 3) Security & Data Handling
- **Escape on output, sanitize on input.**
  - Escape: `esc_html()`, `esc_attr()`, `esc_url()`, `wp_kses_post()`.
  - Sanitize: `sanitize_text_field()`, `sanitize_email()`, `sanitize_key()`, `absint()`, `intval()`.
- **Capabilities & nonces** for forms, AJAX, REST:
  - Add nonces with `wp_nonce_field()` and verify via `check_admin_referer()` / `wp_verify_nonce()`.
  - Restrict mutations with `current_user_can( 'manage_options' /* or specific cap */ )`.
- **Database:** always use `$wpdb->prepare()` with placeholders; never concatenate untrusted input.
- **Uploads:** validate MIME/type and use `wp_handle_upload()`/`media_handle_upload()`.

## 4) Internationalization (i18n)
- Wrap user‑visible strings with translation functions using your text domain:
  - `__( 'Text', 'awesome-feature' )`, `_x()`, `esc_html__()`.
- Load translations with `load_plugin_textdomain()` or `load_theme_textdomain()`.
- Keep a `.pot` in `/languages` and ensure consistent domain usage.

## 5) Performance
- Defer heavy logic to specific hooks; avoid expensive work on `init`/`wp_loaded` unless necessary.
- Use transients or object caching for expensive queries; plan invalidation.
- Enqueue only what you need and conditionally (front vs admin; specific screens/routes).
- Prefer paginated/parameterized queries over unbounded loops.

## 6) Admin UI & Settings
- Use **Settings API** for options pages; provide `sanitize_callback` for each setting.
- For tables, follow `WP_List_Table` patterns. For notices, use the admin notices API.
- Avoid direct HTML echoing for complex UIs; prefer templates or small view helpers with escaping.

## 7) REST API
- Register with `register_rest_route()`; always set a `permission_callback`.
- Validate/sanitize request args via the `args` schema.
- Return `WP_REST_Response` or arrays/objects that map cleanly to JSON.

## 8) Blocks & Editor (Gutenberg)
- Use `block.json` + `register_block_type()`; rely on `@wordpress/*` packages.
- Provide server render callbacks when needed (dynamic blocks).
- E2E tests should cover: insert block → edit → save → front‑end render.

## 9) Asset Loading
```php
add_action('wp_enqueue_scripts', function () {
  wp_enqueue_style(
    'af-frontend',
    plugins_url('assets/frontend.css', __FILE__),
    [],
    '0.1.0'
  );

  wp_enqueue_script(
    'af-frontend',
    plugins_url('assets/frontend.js', __FILE__),
    [ 'wp-i18n', 'wp-element' ],
    '0.1.0',
    true
  );
});
```
- Use `wp_register_style/script` to register first if multiple components depend on the same assets.
- For admin screens, hook into `admin_enqueue_scripts` and check screen IDs.

## 10) Testing
### PHP Unit/Integration
- Use **WordPress test suite** with `PHPUnit` and `WP_UnitTestCase`.
- Test: sanitization, capability checks, REST permissions, DB queries, hooks.
- Prefer factories (`self::factory()->post->create()` etc.) to set up fixtures.

```xml
<!-- phpunit.xml.dist (minimal) -->
<?xml version="1.0" encoding="UTF-8"?>
<phpunit bootstrap="tests/bootstrap.php" colors="true">
  <testsuites>
    <testsuite name="Plugin Test Suite">
      <directory suffix="Test.php">tests/</directory>
    </testsuite>
  </testsuites>
</phpunit>
```

```php
// tests/bootstrap.php (minimal sketch)
<?php
$_tests_dir = getenv('WP_TESTS_DIR') ?: '/tmp/wordpress-tests-lib';
require_once $_tests_dir . '/includes/functions.php';
tests_add_filter( 'muplugins_loaded', function () {
  require dirname(__DIR__) . '/awesome-feature.php';
} );
require $_tests_dir . '/includes/bootstrap.php';
```
### E2E
- Use Playwright (or Puppeteer) for editor/front‑end flows.
- Cover basic user journeys and regressions (block insertion, settings save, front‑end render).

## 11) Documentation & Commits
- Keep `README.md` up to date: install, usage, capabilities, hooks/filters, and test instructions.
- Use clear, imperative commit messages; reference issues/tickets and summarize impact.

## 12) What Copilot Must Ensure (Checklist)
- ✅ Unique prefixes/namespaces; no accidental globals.  
- ✅ Nonce + capability checks for any write action (AJAX/REST/forms).  
- ✅ Inputs sanitized; outputs escaped.  
- ✅ User‑visible strings wrapped in i18n with correct text domain.  
- ✅ Assets enqueued via APIs (no inline script/style).  
- ✅ Tests added/updated for new behaviors.  
- ✅ Code passes PHPCS (WPCS) and ESLint where applicable.  
- ✅ Avoid direct DB concatenation; always prepare queries.

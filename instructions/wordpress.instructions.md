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
<?xml version="1.0"?>
<!-- phpcs.xml -->
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

`composer.json` (snippet):

```json
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

`package.json` (snippet):

```json
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
- For WordPress.org plugins, rely on WordPress automatic translation loading since WordPress 4.6. If older WordPress support requires `load_plugin_textdomain()`, call it on `init`.
- Keep a `.pot` in `/languages` and ensure consistent domain usage. Do not ship development or compiled translation artifacts such as `.po`, `.mo`, `.l10n.php`, or compiled `.json` files unless a specific WordPress.org requirement calls for them.

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

<!-- markdownlint-disable MD013 -->

## 12) WordPress.org Directory Review

- Prefix every global symbol and persistent identifier with a distinctive plugin prefix of at least four characters: functions, classes, interfaces, traits, constants, namespaces, options, transients, metadata, hooks, shortcodes, cron events, script/style handles, and localized JavaScript object names. Do not use `wp_`, `_`, `__`, or generic prefixes such as `ai`, `seo`, `wc`, or `woo`. Do not use `function_exists()` or `class_exists()` guards to hide naming collisions; reserve them for genuinely shared libraries. Migrate renamed option keys so existing installations retain their settings.
- Define the main plugin file, directory, and URL from `__FILE__` in prefixed constants; keep the version in the plugin header and expose it through a prefixed constant if needed. Do not use `WP_PLUGIN_DIR`, `WP_CONTENT_DIR`, `WP_CONTENT_URL`, `WPMU_PLUGIN_DIR`, or hard-coded paths to locate plugin files. Resolve upload storage at runtime with `wp_upload_dir()`.
- Store data in the database or media library where appropriate. If filesystem storage is necessary, write only under a plugin-specific directory within the runtime uploads directory, protect non-public files, sanitize user-provided basenames with `sanitize_file_name( basename( $path ) )`, and use `WP_Filesystem`. Never write to the plugin, theme, core, or another plugin's directory, or to an arbitrary user-supplied path.
- Ship only production files in the distribution archive. Exclude development tooling, `node_modules`, tests, demos, caches, CI metadata, release scripts, and compiled translations with `.distignore` or the 10up ignore list. Build with `wp dist-archive` from a clean, preferably `--no-dev`, dependency tree and inspect the resulting ZIP rather than the working tree.
- Keep bundled third-party libraries on current stable releases and verify the versions included in the shipped archive. Do not ship obfuscated or minified-only code when readable source is required for review.
- Do not bundle a self-update checker or contact an external update endpoint in a WordPress.org-hosted plugin. Remove `Update URI` values that point outside WordPress.org and rely on the directory updater.
- Every `register_setting()` call must specify a `sanitize_callback`. Use a dedicated callback for arrays and nested values; scalar sanitizers are not sufficient for structured options.
- In `readme.txt`, make `Contributors:` a case-sensitive, comma-separated list of real WordPress.org usernames and include the account that owns the plugin slug.
- Do not use raw `<script>` or `<style>` tags for executable or stylesheet content. Enqueue files with the WordPress APIs, attach inline content with `wp_add_inline_script()` or `wp_add_inline_style()`, and use `admin_enqueue_scripts` for admin screens. A non-executing data placeholder must be justified and escaped.
- Escape every dynamic value at the point of output with the narrowest context-appropriate function: `esc_url()` for URLs, `esc_attr()` for attributes, `esc_html()` for text, and `wp_kses()` or `wp_kses_post()` for permitted HTML. Do not suppress escaping sniffs without a specific `--` justification.
- Avoid trademarks and other project names in a plugin name or slug when they imply affiliation. Lead with a genuinely distinctive name; if a third-party service is referenced, make the non-affiliation clear.
- For every remote service, disclose in `readme.txt` what service is used, why it is used, what data is sent, when it is sent, and links to its terms and privacy policy. Do not track users without explicit consent, load remote code, or hijack the admin dashboard.
- Verify that `Plugin URI`, `Author URI`, and repository, documentation, terms, and privacy URLs in `readme.txt` are public and resolve successfully. Remove stale or private links.
- Keep `readme.txt` accurate and complete: include `Stable tag`, `Requires at least`, `Requires PHP`, `Tested up to`, `License`, `License URI`, clear setup and usage steps, and the current plugin slug in installation paths.

### WordPress.org self-audit

```bash
grep -rnE --include='*.php' --exclude-dir=vendor --exclude-dir=node_modules "function |^[[:space:]]*((abstract|final|readonly)[[:space:]]+)*(class|trait|interface|enum)[[:space:]]|namespace |define\(|const " .
grep -rnE --include='*.php' --exclude-dir=vendor --exclude-dir=node_modules "update_option\(|get_option\(|add_option\(|set_transient\(|get_transient\(" .
grep -rnE --include='*.php' --exclude-dir=vendor --exclude-dir=node_modules "WP_PLUGIN_DIR|WP_CONTENT_DIR|WP_CONTENT_URL|WPMU_PLUGIN_DIR|ABSPATH|__DIR__" .
grep -rnE --include='*.php' --exclude-dir=vendor --exclude-dir=node_modules "file_put_contents|fopen|fwrite|fputs|mkdir|unlink|rename\(|copy\(" .
grep -rniE --exclude-dir=vendor --exclude-dir=node_modules "plugin-?update-?checker|PucFactory|pre_set_site_transient_update_plugins|puc_" .
grep -rnE --include='*.php' --exclude-dir=vendor --exclude-dir=node_modules "wp_remote_|curl_|file_get_contents\('https?://|https?://" .
grep -rnE --include='*.php' --exclude-dir=vendor --exclude-dir=node_modules "<script|<style" .
grep -rn --exclude-dir=vendor --exclude-dir=node_modules "load_plugin_textdomain\|phpcs:ignore\|phpcs:disable" .
grep -rnE "^(Stable tag|Requires at least|Requires PHP|Tested up to|License|License URI|Contributors):" readme.txt
find . -type f \( -name '*.po' -o -name '*.mo' -o -name '*.l10n.php' -o -name 'phpunit.xml*' -o -name '*.phpunit*' -o -name '*.result.cache' \)
./vendor/bin/phpcs --standard=phpcs.xml .
wp plugin check my-plugin
wp dist-archive . my-plugin.zip
unzip -l my-plugin.zip
```

Review every match, do not treat local silence as approval, and inspect the actual archive for unwanted files and stale bundled dependencies.

## 13) What Copilot Must Ensure (Checklist)

- ✅ Unique prefixes/namespaces; no accidental globals.  
- ✅ Nonce + capability checks for any write action (AJAX/REST/forms).  
- ✅ Inputs sanitized; outputs escaped.  
- ✅ User‑visible strings wrapped in i18n with correct text domain.  
- ✅ Assets enqueued via APIs (no inline script/style).  
- ✅ Tests added/updated for new behaviors.  
- ✅ Code passes PHPCS (WPCS) and ESLint where applicable.  
- ✅ Avoid direct DB concatenation; always prepare queries.
- ✅ WordPress.org metadata, public URLs, contributor ownership, and external-service disclosures are accurate.
- ✅ The shipped archive contains only production files and no self-update checker or unreviewed bundled libraries.
- ✅ Filesystem writes are confined to approved runtime locations and all settings have sanitization callbacks.

<!-- markdownlint-enable MD013 -->

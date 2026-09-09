# Playwright TypeScript Reference

## Framework Detection

Use these signals to detect an existing framework:

- `playwright.config.ts`, `playwright.config.js`, or `playwright.config.mts`
- `@playwright/test` in `package.json`
- spec files under `tests/`, `e2e/`, `specs/`, or feature folders
- existing `pages/`, `page-objects/`, `fixtures/`, `katalon-test-data/`, or `utils/`
- custom test exports such as `fixtures/base.ts`, `test.extend`, or `export const test`

When a framework exists, inspect a few representative specs, page objects, and fixtures before editing. Match imports, file naming, tag style, fixture names, and assertion style.

## New Framework Shape

For a new TypeScript framework, use a small structure:

```text
playwright.config.ts
tests/
  <feature>.spec.ts
pages/
  <page-name>.page.ts
fixtures/
  test.ts
  katalon-test-data.ts
```

Prefer `npm init playwright` or the repository's package manager equivalent. Choose TypeScript, install browser dependencies only when needed, and avoid overwriting existing application files.

## Page Object Model

Page objects should expose business actions and assertions:

```ts
import { expect, type Locator, type Page } from '@playwright/test';

export class ProductCatalogPage {
  readonly page: Page;
  readonly searchInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByRole('searchbox', { name: /search/i });
  }

  async goto(baseURL: string) {
    await this.page.goto(baseURL);
  }

  async searchForPhone(phoneName: string) {
    await this.searchInput.fill(phoneName);
    await this.page.getByRole('button', { name: /search/i }).click();
  }

  async expectPhoneVisible(phoneName: string) {
    await expect(this.page.getByText(phoneName, { exact: false })).toBeVisible();
  }
}
```

Avoid methods named only after low-level mechanics such as `clickButton` or `fillInput` unless they are private helpers. Use names that reflect the Katalon manual step's intent.

## Fixtures

Use fixtures to centralize reusable pages, users, and test data:

```ts
import { test as base } from '@playwright/test';
import { ProductCatalogPage } from '../pages/product-catalog.page';
import { testData } from './katalon-test-data';

type Fixtures = {
  productCatalog: ProductCatalogPage;
  data: typeof testData;
};

export const test = base.extend<Fixtures>({
  productCatalog: async ({ page }, use) => {
    await use(new ProductCatalogPage(page));
  },
  data: async ({}, use) => {
    await use(testData);
  },
});

export { expect } from '@playwright/test';
```

## Spec Mapping

Keep Katalon traceability visible:

```ts
import { test, expect } from '../fixtures/test';

test.describe('Search and filter', () => {
  test('TC-123 Verify phone price and stock search', async ({ productCatalog, data }, testInfo) => {
    testInfo.annotations.push({ type: 'katalonCaseId', description: 'TC-123' });

    await test.step('Open cellphone storefront', async () => {
      await productCatalog.goto(data.baseURL);
    });

    await test.step('Search for an in-stock phone', async () => {
      await productCatalog.searchForPhone(data.phones.inStock.name);
      await productCatalog.expectPhoneVisible(data.phones.inStock.name);
    });
  });
});
```

Each `test.step` should correspond to a meaningful manual action or assertion group, not every tiny Playwright call.

## Human-As-Tool Questions

Ask the human when any of these are missing and cannot be discovered:

- target repository or directory
- permission to modify an existing framework
- AUT URL or environment
- credentials, roles, or setup data
- unique product/order/user records
- selector strategy when the UI cannot be inspected
- whether to scaffold a new framework or use a provided repository

Keep questions short and actionable. Ask only for required values needed to continue.

# TypeScript Lit Web Component Template (lit-element-next)

> A TypeScript web component project template based on `generator-lit-element-next` by
> motss. Produces a modern Lit 3 web component package with TypeScript decorators, Rollup
> bundling, Web Test Runner browser tests, custom element registration, and a publishable
> NPM package structure following open-wc conventions.

## License

MIT License. See [https://github.com/motss/generator-lit-element-next](https://github.com/motss/generator-lit-element-next) for full license terms.

## Source

- [generator-lit-element-next](https://github.com/motss/generator-lit-element-next) by motss

## Project Structure

```
my-lit-component/
├── src/
│   ├── my-counter.ts              # Main component implementation
│   ├── my-counter.styles.ts       # Lit css`` tagged template styles
│   ├── types.ts                   # Shared TypeScript interfaces
│   └── index.ts                   # Package entry point / re-exports
├── test/
│   ├── my-counter.test.ts         # Web Test Runner specs
│   └── helpers.ts                 # Test helpers / fixtures
├── custom-elements.json           # Custom Elements Manifest (CEM)
├── web-test-runner.config.mjs
├── rollup.config.mjs
├── package.json
├── tsconfig.json
└── .eslintrc.cjs
```

## Key Files

### `package.json`

```json
{
  "name": "my-lit-component",
  "version": "1.0.0",
  "description": "A TypeScript Lit web component",
  "type": "module",
  "main": "dist/index.js",
  "module": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "customElements": "custom-elements.json",
  "files": ["dist", "custom-elements.json"],
  "scripts": {
    "build": "tsc && rollup -c",
    "build:watch": "tsc -w",
    "test": "wtr",
    "test:watch": "wtr --watch",
    "lint": "eslint 'src/**/*.ts' 'test/**/*.ts'",
    "format": "prettier --write 'src/**/*.ts'",
    "analyze": "cem analyze --litelement",
    "clean": "rimraf dist"
  },
  "dependencies": {
    "lit": "^3.1.2"
  },
  "devDependencies": {
    "@custom-elements-manifest/analyzer": "^0.9.3",
    "@esm-bundle/chai": "^4.3.4-fix.0",
    "@open-wc/testing": "^4.0.0",
    "@rollup/plugin-node-resolve": "^15.2.3",
    "@rollup/plugin-typescript": "^11.1.6",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "@web/test-runner": "^0.18.1",
    "@web/test-runner-playwright": "^0.11.0",
    "eslint": "^8.56.0",
    "eslint-plugin-lit": "^1.11.0",
    "eslint-plugin-wc": "^2.1.0",
    "prettier": "^3.2.4",
    "rimraf": "^5.0.5",
    "rollup": "^4.9.5",
    "tslib": "^2.6.2",
    "typescript": "^5.3.3"
  }
}
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "ES2020",
    "moduleResolution": "bundler",
    "lib": ["ES2021", "DOM", "DOM.Iterable"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "esModuleInterop": false,
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "experimentalDecorators": true,
    "useDefineForClassFields": false
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "test"]
}
```

### `src/types.ts`

```typescript
export interface CounterChangedDetail {
  /** Current counter value after the change */
  value: number;
  /** Direction of the last change */
  direction: 'increment' | 'decrement' | 'reset';
}
```

### `src/my-counter.styles.ts`

```typescript
import { css } from 'lit';

export const styles = css`
  :host {
    display: inline-block;
    font-family: system-ui, sans-serif;
    --my-counter-bg: #f0f4ff;
    --my-counter-color: #1a1a2e;
    --my-counter-accent: #4361ee;
    --my-counter-radius: 8px;
  }

  :host([hidden]) {
    display: none;
  }

  .container {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: var(--my-counter-bg);
    border-radius: var(--my-counter-radius);
    color: var(--my-counter-color);
  }

  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: 2px solid var(--my-counter-accent);
    border-radius: 50%;
    background: transparent;
    color: var(--my-counter-accent);
    font-size: 1.25rem;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
  }

  button:hover:not([disabled]) {
    background: var(--my-counter-accent);
    color: #fff;
  }

  button[disabled] {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .value {
    min-width: 3ch;
    text-align: center;
    font-size: 1.5rem;
    font-weight: 600;
  }

  .reset {
    font-size: 0.75rem;
    border-radius: 4px;
    width: auto;
    padding: 0 8px;
    height: 28px;
  }
`;
```

### `src/my-counter.ts`

```typescript
import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styles } from './my-counter.styles';
import { CounterChangedDetail } from './types';

/**
 * An accessible counter web component built with Lit and TypeScript.
 *
 * @fires {CustomEvent<CounterChangedDetail>} counter-changed - Fired whenever
 *   the counter value changes.
 *
 * @csspart container - The outer wrapper element.
 * @csspart value     - The element displaying the current count.
 *
 * @cssprop --my-counter-bg      - Background colour (default: #f0f4ff).
 * @cssprop --my-counter-color   - Text colour (default: #1a1a2e).
 * @cssprop --my-counter-accent  - Accent colour for buttons (default: #4361ee).
 * @cssprop --my-counter-radius  - Border radius (default: 8px).
 *
 * @example
 * ```html
 * <my-counter initial-value="5" min="0" max="10"></my-counter>
 * ```
 */
@customElement('my-counter')
export class MyCounter extends LitElement {
  static override styles = styles;

  /** Starting value for the counter */
  @property({ type: Number, attribute: 'initial-value' })
  initialValue = 0;

  /** Minimum allowed value (inclusive) */
  @property({ type: Number })
  min = -Infinity;

  /** Maximum allowed value (inclusive) */
  @property({ type: Number })
  max = Infinity;

  /** Step size for increment / decrement */
  @property({ type: Number })
  step = 1;

  @state()
  private _value = 0;

  override connectedCallback(): void {
    super.connectedCallback();
    this._value = this.initialValue;
  }

  private _emit(direction: CounterChangedDetail['direction']): void {
    this.dispatchEvent(
      new CustomEvent<CounterChangedDetail>('counter-changed', {
        detail: { value: this._value, direction },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _increment(): void {
    if (this._value + this.step <= this.max) {
      this._value += this.step;
      this._emit('increment');
    }
  }

  private _decrement(): void {
    if (this._value - this.step >= this.min) {
      this._value -= this.step;
      this._emit('decrement');
    }
  }

  private _reset(): void {
    this._value = this.initialValue;
    this._emit('reset');
  }

  override render() {
    const atMin = this._value - this.step < this.min;
    const atMax = this._value + this.step > this.max;

    return html`
      <div class="container" part="container">
        <button
          aria-label="Decrement"
          ?disabled=${atMin}
          @click=${this._decrement}
        >−</button>

        <span class="value" part="value" aria-live="polite" aria-atomic="true">
          ${this._value}
        </span>

        <button
          aria-label="Increment"
          ?disabled=${atMax}
          @click=${this._increment}
        >+</button>

        <button
          class="reset"
          aria-label="Reset counter"
          @click=${this._reset}
        >Reset</button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'my-counter': MyCounter;
  }
}
```

### `src/index.ts`

```typescript
export { MyCounter } from './my-counter';
export type { CounterChangedDetail } from './types';
```

### `test/my-counter.test.ts`

```typescript
import { html, fixture, expect } from '@open-wc/testing';
import { MyCounter } from '../src/my-counter';

describe('MyCounter', () => {
  it('renders with default value of 0', async () => {
    const el = await fixture<MyCounter>(html`<my-counter></my-counter>`);
    const value = el.shadowRoot!.querySelector('.value');
    expect(value?.textContent?.trim()).to.equal('0');
  });

  it('respects initial-value attribute', async () => {
    const el = await fixture<MyCounter>(
      html`<my-counter initial-value="5"></my-counter>`,
    );
    const value = el.shadowRoot!.querySelector('.value');
    expect(value?.textContent?.trim()).to.equal('5');
  });

  it('increments on + button click', async () => {
    const el = await fixture<MyCounter>(html`<my-counter></my-counter>`);
    const incBtn = el.shadowRoot!.querySelectorAll('button')[1] as HTMLButtonElement;
    incBtn.click();
    await el.updateComplete;
    const value = el.shadowRoot!.querySelector('.value');
    expect(value?.textContent?.trim()).to.equal('1');
  });

  it('decrements on - button click', async () => {
    const el = await fixture<MyCounter>(html`<my-counter initial-value="3"></my-counter>`);
    const decBtn = el.shadowRoot!.querySelector('button') as HTMLButtonElement;
    decBtn.click();
    await el.updateComplete;
    const value = el.shadowRoot!.querySelector('.value');
    expect(value?.textContent?.trim()).to.equal('2');
  });

  it('fires counter-changed event on increment', async () => {
    const el = await fixture<MyCounter>(html`<my-counter></my-counter>`);
    let eventDetail: { value: number; direction: string } | undefined;
    el.addEventListener('counter-changed', (e) => {
      eventDetail = (e as CustomEvent).detail;
    });
    const incBtn = el.shadowRoot!.querySelectorAll('button')[1] as HTMLButtonElement;
    incBtn.click();
    await el.updateComplete;
    expect(eventDetail).to.deep.equal({ value: 1, direction: 'increment' });
  });

  it('disables decrement button at min boundary', async () => {
    const el = await fixture<MyCounter>(
      html`<my-counter initial-value="0" min="0"></my-counter>`,
    );
    const decBtn = el.shadowRoot!.querySelector('button') as HTMLButtonElement;
    expect(decBtn.disabled).to.be.true;
  });

  it('resets to initial value', async () => {
    const el = await fixture<MyCounter>(
      html`<my-counter initial-value="5"></my-counter>`,
    );
    const incBtn = el.shadowRoot!.querySelectorAll('button')[1] as HTMLButtonElement;
    incBtn.click();
    await el.updateComplete;
    const resetBtn = el.shadowRoot!.querySelectorAll('button')[2] as HTMLButtonElement;
    resetBtn.click();
    await el.updateComplete;
    const value = el.shadowRoot!.querySelector('.value');
    expect(value?.textContent?.trim()).to.equal('5');
  });

  it('passes accessibility audit', async () => {
    const el = await fixture<MyCounter>(html`<my-counter></my-counter>`);
    await expect(el).to.be.accessible();
  });
});
```

### `web-test-runner.config.mjs`

```js
import { playwrightLauncher } from '@web/test-runner-playwright';

export default {
  files: 'test/**/*.test.ts',
  nodeResolve: true,
  browsers: [
    playwrightLauncher({ product: 'chromium' }),
  ],
  plugins: [],
  esbuildTarget: 'auto',
};
```

### `rollup.config.mjs`

```js
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/index.ts',
  output: {
    dir: 'dist',
    format: 'esm',
    sourcemap: true,
    preserveModules: true,
    preserveModulesRoot: 'src',
  },
  plugins: [
    resolve(),
    typescript({ tsconfig: './tsconfig.json' }),
  ],
  external: ['lit', /^lit\//],
};
```

### Usage in HTML

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>My Lit Counter Demo</title>
    <script type="module" src="./dist/index.js"></script>
  </head>
  <body>
    <my-counter initial-value="0" min="0" max="10" step="1"></my-counter>

    <script>
      document.querySelector('my-counter').addEventListener('counter-changed', (e) => {
        console.log('Counter changed:', e.detail);
      });
    </script>
  </body>
</html>
```

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Build the component
npm run build

# 3. Run tests (requires Playwright — installed automatically)
npm test

# 4. Run tests in watch mode during development
npm run test:watch

# 5. Build in watch mode for live TypeScript compilation
npm run build:watch

# 6. Generate the Custom Elements Manifest
npm run analyze

# 7. Lint
npm run lint
```

## Features

- Lit 3 with TypeScript class decorators (`@customElement`, `@property`, `@state`)
- `useDefineForClassFields: false` to ensure Lit decorators work correctly with TypeScript
- Scoped Shadow DOM styles using Lit's `css` tagged template literal
- CSS custom properties (CSS variables) for consumer-side theming
- CSS `part` attributes for structural styling from outside the shadow root
- Accessible ARIA attributes: `aria-live`, `aria-atomic`, descriptive `aria-label` on buttons
- Custom event (`counter-changed`) with typed `CustomEvent<T>` detail
- `HTMLElementTagNameMap` augmentation for correct TypeScript types in consuming projects
- `@open-wc/testing` test utilities with accessibility audit via `axe-core`
- Web Test Runner + Playwright for real-browser testing
- Rollup ESM bundle with `preserveModules` for tree-shakeable output
- Custom Elements Manifest (`custom-elements.json`) for IDE tooling and documentation

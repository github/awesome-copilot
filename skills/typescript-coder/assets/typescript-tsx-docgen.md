# TypeScript TSX Component Library with Documentation (tsx-docgen)

> A TypeScript React component library template based on `generator-tsx-docgen`. Produces a
> publishable NPM component library with Rollup bundling, TypeDoc API documentation
> generation, Storybook interactive component explorer, Jest + React Testing Library tests,
> and strict TypeScript throughout.

## License

See the [generator-tsx-docgen npm package](https://www.npmjs.com/package/generator-tsx-docgen)
for license terms.

## Source

- [generator-tsx-docgen on npm](https://www.npmjs.com/package/generator-tsx-docgen)

## Project Structure

```
my-component-lib/
├── src/
│   ├── components/
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.types.ts
│   │   │   ├── Button.module.css
│   │   │   ├── Button.stories.tsx
│   │   │   ├── Button.test.tsx
│   │   │   └── index.ts
│   │   ├── Input/
│   │   │   ├── Input.tsx
│   │   │   ├── Input.types.ts
│   │   │   ├── Input.test.tsx
│   │   │   └── index.ts
│   │   └── index.ts           # Barrel — re-exports all components
│   ├── hooks/
│   │   └── useDebounce.ts
│   ├── types/
│   │   └── common.types.ts
│   └── index.ts               # Library entry point
├── .storybook/
│   ├── main.ts
│   └── preview.ts
├── docs/                      # Generated TypeDoc output (gitignored)
├── dist/                      # Rollup build output (gitignored)
├── jest.config.ts
├── package.json
├── rollup.config.mjs
├── tsconfig.json
├── tsconfig.build.json
└── typedoc.json
```

## Key Files

### `package.json`

```json
{
  "name": "my-component-lib",
  "version": "1.0.0",
  "description": "TypeScript React component library with documentation generation",
  "main": "dist/cjs/index.js",
  "module": "dist/esm/index.js",
  "types": "dist/types/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.js",
      "types": "./dist/types/index.d.ts"
    }
  },
  "files": ["dist"],
  "sideEffects": false,
  "scripts": {
    "build": "rollup -c",
    "build:types": "tsc --project tsconfig.build.json --emitDeclarationOnly",
    "dev": "rollup -c --watch",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build",
    "docs": "typedoc",
    "lint": "eslint 'src/**/*.{ts,tsx}'",
    "lint:fix": "eslint 'src/**/*.{ts,tsx}' --fix",
    "format": "prettier --write 'src/**/*.{ts,tsx,css}'"
  },
  "peerDependencies": {
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0"
  },
  "devDependencies": {
    "@storybook/addon-actions": "^7.6.7",
    "@storybook/addon-docs": "^7.6.7",
    "@storybook/addon-essentials": "^7.6.7",
    "@storybook/react": "^7.6.7",
    "@storybook/react-vite": "^7.6.7",
    "@testing-library/jest-dom": "^6.2.0",
    "@testing-library/react": "^14.1.2",
    "@testing-library/user-event": "^14.5.2",
    "@types/jest": "^29.5.11",
    "@types/react": "^18.2.48",
    "@types/react-dom": "^18.2.18",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "eslint": "^8.56.0",
    "eslint-plugin-react": "^7.33.2",
    "eslint-plugin-react-hooks": "^4.6.0",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "prettier": "^3.2.4",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "rollup": "^4.9.5",
    "rollup-plugin-dts": "^6.1.0",
    "rollup-plugin-peer-deps-external": "^2.2.4",
    "rollup-plugin-postcss": "^4.0.2",
    "storybook": "^7.6.7",
    "ts-jest": "^29.1.4",
    "typedoc": "^0.25.7",
    "typescript": "^5.3.3",
    "@rollup/plugin-commonjs": "^25.0.7",
    "@rollup/plugin-node-resolve": "^15.2.3",
    "@rollup/plugin-typescript": "^11.1.6"
  }
}
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "outDir": "./dist"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "**/*.stories.tsx", "**/*.test.tsx"]
}
```

### `tsconfig.build.json`

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist/types",
    "declaration": true,
    "emitDeclarationOnly": true
  },
  "exclude": ["node_modules", "dist", "**/*.stories.tsx", "**/*.test.tsx", "**/*.spec.tsx"]
}
```

### `rollup.config.mjs`

```js
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import postcss from 'rollup-plugin-postcss';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import dts from 'rollup-plugin-dts';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default [
  // Main bundle: ESM + CJS
  {
    input: 'src/index.ts',
    output: [
      {
        file: pkg.module,
        format: 'esm',
        sourcemap: true,
        exports: 'named',
      },
      {
        file: pkg.main,
        format: 'cjs',
        sourcemap: true,
        exports: 'named',
      },
    ],
    plugins: [
      peerDepsExternal(),
      resolve(),
      commonjs(),
      typescript({ tsconfig: './tsconfig.json', exclude: ['**/*.test.*', '**/*.stories.*'] }),
      postcss({ modules: true, extract: false }),
    ],
    external: ['react', 'react-dom'],
  },
  // Type declarations
  {
    input: 'dist/types/index.d.ts',
    output: [{ file: 'dist/types/index.d.ts', format: 'esm' }],
    plugins: [dts()],
    external: [/\.css$/],
  },
];
```

### `typedoc.json`

```json
{
  "entryPoints": ["./src/index.ts"],
  "out": "./docs",
  "tsconfig": "./tsconfig.json",
  "name": "My Component Library",
  "readme": "./README.md",
  "plugin": [],
  "excludePrivate": true,
  "excludeProtected": false,
  "excludeExternals": true,
  "categorizeByGroup": true,
  "categoryOrder": ["Components", "Hooks", "Types", "*"],
  "sort": ["alphabetical"]
}
```

### `src/components/Button/Button.types.ts`

```typescript
import { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Props for the Button component.
 * @category Components
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: ButtonVariant;
  /** Size preset */
  size?: ButtonSize;
  /** Show a loading spinner and disable interaction */
  isLoading?: boolean;
  /** Render button as full width */
  fullWidth?: boolean;
  /** Left-aligned icon node */
  leftIcon?: ReactNode;
  /** Right-aligned icon node */
  rightIcon?: ReactNode;
  /** Button label */
  children: ReactNode;
}
```

### `src/components/Button/Button.tsx`

```typescript
import React, { forwardRef } from 'react';
import styles from './Button.module.css';
import { ButtonProps } from './Button.types';

/**
 * Primary UI element for triggering actions.
 *
 * @example
 * ```tsx
 * <Button variant="primary" size="md" onClick={() => console.log('clicked')}>
 *   Click me
 * </Button>
 * ```
 * @category Components
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      className,
      ...rest
    },
    ref,
  ) => {
    const classes = [
      styles.button,
      styles[variant],
      styles[size],
      fullWidth ? styles.fullWidth : '',
      isLoading ? styles.loading : '',
      className ?? '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        {...rest}
      >
        {isLoading && <span className={styles.spinner} aria-hidden="true" />}
        {!isLoading && leftIcon && (
          <span className={styles.iconLeft}>{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && (
          <span className={styles.iconRight}>{rightIcon}</span>
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';
```

### `src/components/Button/Button.test.tsx`

```typescript
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Button } from './Button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('is disabled when isLoading is true', () => {
    render(<Button isLoading>Save</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });

  it('calls onClick when clicked', async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Submit</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', async () => {
    const handleClick = jest.fn();
    render(<Button disabled onClick={handleClick}>Submit</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });
});
```

### `src/components/Button/Button.stories.tsx`

```typescript
import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'danger', 'ghost'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
};

export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: { variant: 'primary', children: 'Button' },
};

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'Button' },
};

export const Loading: Story = {
  args: { isLoading: true, children: 'Loading…' },
};

export const FullWidth: Story = {
  args: { fullWidth: true, children: 'Full Width Button' },
};
```

### `src/index.ts`

```typescript
// Components
export { Button } from './components/Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './components/Button/Button.types';

export { Input } from './components/Input';
export type { InputProps } from './components/Input/Input.types';

// Hooks
export { useDebounce } from './hooks/useDebounce';

// Types
export type { Size, Variant } from './types/common.types';
```

### `jest.config.ts`

```typescript
import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  moduleNameMapper: {
    '\\.module\\.css$': 'identity-obj-proxy',
    '\\.css$': '<rootDir>/__mocks__/styleMock.js',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.stories.tsx',
    '!src/**/index.ts',
    '!src/types/**',
  ],
};

export default config;
```

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Start Storybook for component development
npm run storybook
# Open http://localhost:6006

# 3. Run tests
npm test

# 4. Generate TypeDoc API documentation
npm run docs
# Open docs/index.html

# 5. Build the library for distribution
npm run build

# 6. Build static Storybook site
npm run build-storybook
```

## Features

- Rollup bundling producing both ESM and CJS outputs with source maps
- TypeDoc API documentation generated directly from TSDoc comments and TypeScript types
- Storybook 7 with `autodocs` tag for zero-config component documentation pages
- CSS Modules for scoped component styles, processed by `rollup-plugin-postcss`
- `forwardRef` pattern for all components to support ref forwarding
- Jest + React Testing Library + `@testing-library/user-event` for accessible test queries
- Strict TypeScript with `noUnusedLocals` and `noUnusedParameters`
- Barrel exports from `src/index.ts` for a clean public API surface
- Peer dependency configuration so consumers supply their own React version
- Separate `tsconfig.build.json` for declaration-only emission

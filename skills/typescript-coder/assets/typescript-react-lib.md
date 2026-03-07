# TypeScript React Component Library

> A TypeScript React component library starter with Rollup bundling (CJS + ESM dual output), Jest and React Testing Library for tests, and proper `exports` map for tree-shaking. Produces a publishable npm package with type declarations.

## License

MIT — See [source repository](https://github.com/tanem/generator-typescript-react-lib) for full license text.

## Source

- [tanem/generator-typescript-react-lib](https://github.com/tanem/generator-typescript-react-lib)

## Project Structure

```
my-react-lib/
├── src/
│   ├── index.ts                 (public API re-exports)
│   └── components/
│       ├── Button/
│       │   ├── Button.tsx
│       │   ├── Button.types.ts
│       │   └── __tests__/
│       │       └── Button.test.tsx
│       └── index.ts             (component barrel)
├── dist/                        (generated — do not edit)
│   ├── cjs/
│   │   ├── index.js
│   │   └── index.d.ts
│   └── esm/
│       ├── index.js
│       └── index.d.ts
├── package.json
├── tsconfig.json
├── tsconfig.cjs.json
├── tsconfig.esm.json
├── rollup.config.js
├── jest.config.js
├── babel.config.js
├── .gitignore
└── README.md
```

## Key Files

### `package.json`

```json
{
  "name": "my-react-lib",
  "version": "0.1.0",
  "description": "My TypeScript React component library",
  "license": "MIT",
  "author": "Your Name <you@example.com>",
  "sideEffects": false,
  "main": "./dist/cjs/index.js",
  "module": "./dist/esm/index.js",
  "types": "./dist/esm/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/esm/index.d.ts",
        "default": "./dist/esm/index.js"
      },
      "require": {
        "types": "./dist/cjs/index.d.ts",
        "default": "./dist/cjs/index.js"
      }
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "npm run build:cjs && npm run build:esm",
    "build:cjs": "rollup -c --environment BUILD:cjs",
    "build:esm": "rollup -c --environment BUILD:esm",
    "clean": "rimraf dist",
    "lint": "eslint src --ext .ts,.tsx",
    "prebuild": "npm run clean",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "prepublishOnly": "npm run build"
  },
  "peerDependencies": {
    "react": ">=17.0.0",
    "react-dom": ">=17.0.0"
  },
  "devDependencies": {
    "@babel/core": "^7.24.0",
    "@babel/preset-env": "^7.24.0",
    "@babel/preset-react": "^7.23.0",
    "@babel/preset-typescript": "^7.23.0",
    "@testing-library/jest-dom": "^6.4.0",
    "@testing-library/react": "^15.0.0",
    "@testing-library/user-event": "^14.5.0",
    "@types/jest": "^29.5.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "rimraf": "^5.0.0",
    "rollup": "^4.13.0",
    "@rollup/plugin-node-resolve": "^15.2.0",
    "@rollup/plugin-commonjs": "^25.0.0",
    "rollup-plugin-typescript2": "^0.36.0",
    "typescript": "^5.4.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2018",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2018", "DOM"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### `tsconfig.cjs.json`

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "CommonJS",
    "outDir": "dist/cjs"
  },
  "exclude": ["node_modules", "dist", "**/__tests__/**", "**/*.test.*"]
}
```

### `tsconfig.esm.json`

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "ESNext",
    "outDir": "dist/esm"
  },
  "exclude": ["node_modules", "dist", "**/__tests__/**", "**/*.test.*"]
}
```

### `rollup.config.js`

```javascript
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2';

const isEsm = process.env.BUILD === 'esm';

export default {
  input: 'src/index.ts',
  output: {
    dir: isEsm ? 'dist/esm' : 'dist/cjs',
    format: isEsm ? 'esm' : 'cjs',
    preserveModules: true,
    preserveModulesRoot: 'src',
    sourcemap: true,
  },
  external: ['react', 'react-dom', 'react/jsx-runtime'],
  plugins: [
    resolve(),
    commonjs(),
    typescript({
      tsconfig: isEsm ? './tsconfig.esm.json' : './tsconfig.cjs.json',
      useTsconfigDeclarationDir: true,
    }),
  ],
};
```

### `jest.config.js`

```javascript
/** @type {import('jest').Config} */
export default {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(ts|tsx)$': 'babel-jest',
  },
  setupFilesAfterFramework: ['@testing-library/jest-dom'],
  testMatch: ['**/__tests__/**/*.test.(ts|tsx)'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/__tests__/**'],
};
```

### `babel.config.js`

```javascript
export default {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'automatic' }],
    '@babel/preset-typescript',
  ],
};
```

### `src/components/Button/Button.types.ts`

```typescript
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: ButtonVariant;
  /** Size preset */
  size?: ButtonSize;
  /** Whether the button is in a loading state */
  isLoading?: boolean;
  /** Button content */
  children: ReactNode;
}
```

### `src/components/Button/Button.tsx`

```tsx
import React from 'react';
import type { ButtonProps } from './Button.types.js';

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'btn--sm',
  md: 'btn--md',
  lg: 'btn--lg',
};

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'btn--primary',
  secondary: 'btn--secondary',
  ghost: 'btn--ghost',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  children,
  className = '',
  ...rest
}: ButtonProps): JSX.Element {
  const classes = [
    'btn',
    variantClasses[variant],
    sizeClasses[size],
    isLoading ? 'btn--loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      {...rest}
      className={classes}
      disabled={disabled ?? isLoading}
      aria-busy={isLoading}
    >
      {isLoading ? <span className="btn__spinner" aria-hidden="true" /> : null}
      <span className={isLoading ? 'btn__label--hidden' : ''}>{children}</span>
    </button>
  );
}
```

### `src/components/Button/__tests__/Button.test.tsx`

```tsx
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Button } from '../Button.js';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('applies the primary variant class by default', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn--primary');
  });

  it('is disabled and aria-busy when isLoading is true', () => {
    render(<Button isLoading>Click me</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
  });

  it('calls onClick when clicked', async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### `src/components/index.ts`

```typescript
export { Button } from './Button/Button.js';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button/Button.types.js';
```

### `src/index.ts`

```typescript
export * from './components/index.js';
```

## Getting Started

```bash
# 1. Create project directory
mkdir my-react-lib && cd my-react-lib

# 2. Initialise and copy project files (see structure above)
npm init -y

# 3. Install dependencies
npm install

# 4. Run tests
npm test

# 5. Build library (produces dist/cjs and dist/esm)
npm run build

# 6. Publish (runs build automatically via prepublishOnly)
npm publish
```

## Features

- Dual CJS and ESM build output via Rollup
- TypeScript strict mode with full declaration file emission
- `exports` map for modern Node.js and bundler resolution
- `sideEffects: false` for optimal tree-shaking
- Jest + React Testing Library + jest-dom for component testing
- Babel transform for Jest (separate from the Rollup build pipeline)
- React listed as a peer dependency — consumers supply their own React
- `preserveModules` keeps one output file per source file for fine-grained tree-shaking

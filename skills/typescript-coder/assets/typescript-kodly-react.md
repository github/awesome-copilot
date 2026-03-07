# TypeScript React App (Kodly)

> A TypeScript React application starter with React Router, a component-per-feature folder layout, CSS Modules styling, and Vitest for unit testing. Produces a Vite-powered SPA ready for modern React development.

## License

See [source repository](https://github.com/thepanther-io/kodly-react-yo-generator) for license terms.

## Source

- [thepanther-io/kodly-react-yo-generator](https://github.com/thepanther-io/kodly-react-yo-generator)

## Project Structure

```
my-react-app/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── App.module.css
│   │   └── router.tsx
│   ├── components/
│   │   └── shared/
│   │       ├── Button/
│   │       │   ├── Button.tsx
│   │       │   ├── Button.module.css
│   │       │   └── Button.test.tsx
│   │       └── index.ts
│   ├── features/
│   │   ├── home/
│   │   │   ├── HomePage.tsx
│   │   │   └── HomePage.module.css
│   │   └── about/
│   │       └── AboutPage.tsx
│   ├── hooks/
│   │   └── useLocalStorage.ts
│   ├── types/
│   │   └── global.d.ts
│   ├── main.tsx
│   └── vite-env.d.ts
├── public/
│   └── favicon.svg
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── vitest.config.ts
├── .gitignore
└── README.md
```

## Key Files

### `package.json`

```json
{
  "name": "my-react-app",
  "version": "0.1.0",
  "description": "TypeScript React application",
  "license": "MIT",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext .ts,.tsx",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.23.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.0",
    "@testing-library/react": "^15.0.0",
    "@testing-library/user-event": "^14.5.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "@vitest/coverage-v8": "^1.0.0",
    "eslint": "^8.57.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.0",
    "jsdom": "^24.0.0",
    "typescript": "^5.4.0",
    "vite": "^5.2.0",
    "vitest": "^1.0.0"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### `tsconfig.node.json`

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```

### `vite.config.ts`

```typescript
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});
```

### `vitest.config.ts`

```typescript
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.*', 'src/main.tsx', 'src/vite-env.d.ts'],
    },
  },
});
```

### `src/main.tsx`

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
```

### `src/app/router.tsx`

```tsx
import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { App } from './App';
import { AboutPage } from '@/features/about/AboutPage';
import { HomePage } from '@/features/home/HomePage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'about', element: <AboutPage /> },
    ],
  },
]);
```

### `src/app/App.tsx`

```tsx
import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import styles from './App.module.css';

export function App(): JSX.Element {
  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <nav>
          <Link to="/">Home</Link>
          <Link to="/about">About</Link>
        </nav>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <p>&copy; {new Date().getFullYear()} My App</p>
      </footer>
    </div>
  );
}
```

### `src/features/home/HomePage.tsx`

```tsx
import React from 'react';
import { Button } from '@/components/shared';
import styles from './HomePage.module.css';

export function HomePage(): JSX.Element {
  const [count, setCount] = React.useState(0);

  return (
    <div className={styles.container}>
      <h1>Welcome</h1>
      <p>Count: {count}</p>
      <Button onClick={() => setCount((c) => c + 1)}>Increment</Button>
      <Button variant="secondary" onClick={() => setCount(0)}>
        Reset
      </Button>
    </div>
  );
}
```

### `src/components/shared/Button/Button.tsx`

```tsx
import React, { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
}

export function Button({ variant = 'primary', className = '', children, ...rest }: ButtonProps): JSX.Element {
  return (
    <button
      {...rest}
      className={`${styles.btn} ${styles[variant]} ${className}`.trim()}
    >
      {children}
    </button>
  );
}
```

### `src/components/shared/Button/Button.test.tsx`

```tsx
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with children', () => {
    render(<Button>Click</Button>);
    expect(screen.getByRole('button', { name: 'Click' })).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('applies the secondary class when variant is secondary', () => {
    render(<Button variant="secondary">Click</Button>);
    expect(screen.getByRole('button')).toHaveClass('secondary');
  });
});
```

### `src/components/shared/index.ts`

```typescript
export { Button } from './Button/Button';
export type { ButtonProps } from './Button/Button';
```

### `src/hooks/useLocalStorage.ts`

```typescript
import { useCallback, useState } from 'react';

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item !== null ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const next = value instanceof Function ? value(prev) : value;
        try {
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
          console.warn(`useLocalStorage: failed to persist key "${key}"`);
        }
        return next;
      });
    },
    [key]
  );

  return [storedValue, setValue];
}
```

## Getting Started

```bash
# Prerequisites: Node.js 20+

# 1. Create project directory
mkdir my-react-app && cd my-react-app

# 2. Copy project files (see structure above)

# 3. Install dependencies
npm install

# 4. Start the development server (http://localhost:3000)
npm run dev

# 5. Run unit tests
npm test

# 6. Build for production
npm run build

# 7. Preview the production build locally
npm run preview
```

## Features

- Vite for near-instant dev server startup and hot module replacement
- React Router v6 with `createBrowserRouter` and nested layouts
- CSS Modules for scoped, collision-free component styles
- Path alias `@/` mapped to `src/` for cleaner imports
- Vitest with `jsdom` environment for component testing (uses same Vite config)
- React Testing Library + `@testing-library/user-event` for user-interaction tests
- Vendor chunk splitting in production build for better caching
- Custom `useLocalStorage` hook as an example of composable, typed custom hooks
- Strict TypeScript with `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`

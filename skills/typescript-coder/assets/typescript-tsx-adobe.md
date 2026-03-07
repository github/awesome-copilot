# TypeScript React/TSX Project Template (Adobe Style)

> A TypeScript + React project starter based on patterns from Adobe's `generator-tsx`. Produces a component-library-ready React application using TSX, with Webpack bundling, Jest testing, and Storybook documentation support.

## License

Apache License 2.0 — See source repository for full license terms.

## Source

- [adobe/generator-tsx](https://github.com/adobe/generator-tsx)

## Project Structure

```
my-tsx-app/
├── .storybook/
│   ├── main.ts
│   └── preview.ts
├── src/
│   ├── components/
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.test.tsx
│   │   │   ├── Button.stories.tsx
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── hooks/
│   │   └── useTheme.ts
│   ├── types/
│   │   └── index.ts
│   ├── index.ts
│   └── setupTests.ts
├── public/
│   └── index.html
├── .eslintrc.json
├── .prettierrc
├── babel.config.js
├── jest.config.ts
├── package.json
├── tsconfig.json
├── tsconfig.build.json
└── webpack.config.ts
```

## Key Files

### `package.json`

```json
{
  "name": "my-tsx-app",
  "version": "1.0.0",
  "description": "TypeScript React component library",
  "main": "dist/cjs/index.js",
  "module": "dist/esm/index.js",
  "types": "dist/types/index.d.ts",
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "webpack --config webpack.config.ts",
    "build:types": "tsc --project tsconfig.build.json --emitDeclarationOnly",
    "start": "webpack serve --config webpack.config.ts --mode development",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  },
  "peerDependencies": {
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0"
  },
  "devDependencies": {
    "@babel/core": "^7.23.0",
    "@babel/preset-env": "^7.23.0",
    "@babel/preset-react": "^7.22.15",
    "@babel/preset-typescript": "^7.23.0",
    "@storybook/addon-essentials": "^7.5.0",
    "@storybook/react": "^7.5.0",
    "@storybook/react-webpack5": "^7.5.0",
    "@testing-library/jest-dom": "^6.1.4",
    "@testing-library/react": "^14.1.0",
    "@testing-library/user-event": "^14.5.1",
    "@types/jest": "^29.5.7",
    "@types/react": "^18.2.33",
    "@types/react-dom": "^18.2.14",
    "@typescript-eslint/eslint-plugin": "^6.9.1",
    "@typescript-eslint/parser": "^6.9.1",
    "babel-loader": "^9.1.3",
    "css-loader": "^6.8.1",
    "eslint": "^8.52.0",
    "eslint-plugin-react": "^7.33.2",
    "eslint-plugin-react-hooks": "^4.6.0",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "prettier": "^3.0.3",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "style-loader": "^3.3.3",
    "ts-node": "^10.9.1",
    "typescript": "^5.2.2",
    "webpack": "^5.89.0",
    "webpack-cli": "^5.1.4",
    "webpack-dev-server": "^4.15.1"
  }
}
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["DOM", "DOM.Iterable", "ES2020"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### `tsconfig.build.json`

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "declaration": true,
    "declarationDir": "dist/types",
    "outDir": "dist/esm",
    "rootDir": "src"
  },
  "exclude": ["node_modules", "dist", "**/*.test.tsx", "**/*.stories.tsx"]
}
```

### `webpack.config.ts`

```typescript
import path from "path";
import { Configuration } from "webpack";
import "webpack-dev-server";

const config: Configuration = {
  entry: "./src/index.ts",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
    library: {
      name: "MyTsxApp",
      type: "umd",
    },
    globalObject: "this",
    clean: true,
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: "babel-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  devServer: {
    static: "./public",
    port: 3000,
    hot: true,
  },
};

export default config;
```

### `babel.config.js`

```javascript
module.exports = {
  presets: [
    ["@babel/preset-env", { targets: { node: "current" } }],
    ["@babel/preset-react", { runtime: "automatic" }],
    "@babel/preset-typescript",
  ],
};
```

### `jest.config.ts`

```typescript
import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  setupFilesAfterFramework: ["<rootDir>/src/setupTests.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.(css|less|scss)$": "identity-obj-proxy",
  },
  transform: {
    "^.+\\.(ts|tsx)$": "babel-jest",
  },
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.stories.{ts,tsx}",
    "!src/index.ts",
  ],
};

export default config;
```

### `src/components/Button/Button.tsx`

```tsx
import React, { ButtonHTMLAttributes, forwardRef } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      className = "",
      ...rest
    },
    ref
  ) => {
    const baseClasses = "btn";
    const variantClass = `btn--${variant}`;
    const sizeClass = `btn--${size}`;
    const loadingClass = isLoading ? "btn--loading" : "";

    return (
      <button
        ref={ref}
        className={[baseClasses, variantClass, sizeClass, loadingClass, className]
          .filter(Boolean)
          .join(" ")}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        {...rest}
      >
        {isLoading && <span className="btn__spinner" aria-hidden="true" />}
        {leftIcon && <span className="btn__icon btn__icon--left">{leftIcon}</span>}
        <span className="btn__label">{children}</span>
        {rightIcon && <span className="btn__icon btn__icon--right">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
```

### `src/components/Button/Button.test.tsx`

```tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";

describe("Button", () => {
  it("renders with default props", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("is disabled when isLoading is true", () => {
    render(<Button isLoading>Click me</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
  });

  it("applies variant class", () => {
    render(<Button variant="secondary">Click me</Button>);
    expect(screen.getByRole("button")).toHaveClass("btn--secondary");
  });
});
```

### `src/components/Button/Button.stories.tsx`

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";

const meta: Meta<typeof Button> = {
  title: "Components/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: { type: "select" },
      options: ["primary", "secondary", "ghost", "danger"],
    },
    size: {
      control: { type: "select" },
      options: ["sm", "md", "lg"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    variant: "primary",
    children: "Button",
  },
};

export const Secondary: Story = {
  args: {
    variant: "secondary",
    children: "Button",
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
    children: "Loading...",
  },
};
```

### `src/setupTests.ts`

```typescript
import "@testing-library/jest-dom";
```

### `.storybook/main.ts`

```typescript
import type { StorybookConfig } from "@storybook/react-webpack5";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx|mdx)"],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
  ],
  framework: {
    name: "@storybook/react-webpack5",
    options: {},
  },
  docs: {
    autodocs: "tag",
  },
  typescript: {
    check: true,
  },
};

export default config;
```

## Getting Started

1. Copy this template or clone from the source generator.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```
4. Run tests:
   ```bash
   npm test
   ```
5. Start Storybook for component documentation:
   ```bash
   npm run storybook
   ```
6. Build the library for distribution:
   ```bash
   npm run build && npm run build:types
   ```

## Features

- TypeScript 5.x with strict mode enabled
- React 18 with JSX transform (`react-jsx`) — no need to import React in every file
- Webpack 5 bundling with hot module replacement in development
- Babel transpilation supporting modern JS/TS/TSX
- Jest + React Testing Library for unit and component testing
- Storybook 7 for interactive component documentation
- ESLint + Prettier for code quality and formatting
- `forwardRef` pattern on components for ref forwarding
- Path alias `@/` mapped to `src/` for clean imports
- UMD output for broad compatibility as a distributable library
- CSS Modules support via css-loader

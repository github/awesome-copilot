# TypeScript Aurelia Framework Project Template

> A TypeScript project starter based on patterns from `generator-aurelia-ts` by kristianmandrup. Produces an Aurelia 2 application with TypeScript, component/view model pairs, dependency injection, and `aurelia.json` / Webpack configuration.

## License

MIT License — See source repository for full license terms.

## Source

- [kristianmandrup/generator-aurelia-ts](https://github.com/kristianmandrup/generator-aurelia-ts)

> Note: The original generator targeted Aurelia 1 (Classic). This template reflects Aurelia 2 (`@aurelia/`) conventions, which are the current stable release.

## Project Structure

```
my-aurelia-app/
├── src/
│   ├── components/
│   │   ├── app.ts               ← Root app component
│   │   ├── app.html             ← Root app template
│   │   ├── hello-world.ts       ← Sample component view-model
│   │   └── hello-world.html     ← Sample component template
│   ├── services/
│   │   └── user.service.ts
│   ├── models/
│   │   └── user.ts
│   ├── value-converters/
│   │   └── date-format.ts
│   ├── resources/
│   │   └── index.ts             ← Global resource registration
│   ├── routes/
│   │   └── index.ts             ← Route configuration
│   └── main.ts                  ← Application bootstrap
├── public/
│   └── index.html
├── tests/
│   └── unit/
│       └── hello-world.spec.ts
├── .eslintrc.json
├── .gitignore
├── aurelia.json                  ← Aurelia configuration
├── jest.config.ts
├── package.json
├── tsconfig.json
└── webpack.config.ts
```

## Key Files

### `package.json`

```json
{
  "name": "my-aurelia-app",
  "version": "1.0.0",
  "description": "Aurelia 2 TypeScript application",
  "scripts": {
    "start": "webpack serve --mode development",
    "build": "webpack --mode production",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src --ext .ts",
    "clean": "rimraf dist"
  },
  "dependencies": {
    "@aurelia/fetch-client": "^2.0.0",
    "@aurelia/kernel": "^2.0.0",
    "@aurelia/router": "^2.0.0",
    "@aurelia/runtime": "^2.0.0",
    "@aurelia/runtime-html": "^2.0.0",
    "aurelia": "^2.0.0"
  },
  "devDependencies": {
    "@aurelia/testing": "^2.0.0",
    "@babel/core": "^7.23.0",
    "@babel/preset-env": "^7.23.0",
    "@babel/preset-typescript": "^7.23.0",
    "@types/jest": "^29.5.7",
    "@types/node": "^20.8.10",
    "@typescript-eslint/eslint-plugin": "^6.9.1",
    "@typescript-eslint/parser": "^6.9.1",
    "babel-loader": "^9.1.3",
    "css-loader": "^6.8.1",
    "eslint": "^8.52.0",
    "html-webpack-plugin": "^5.5.3",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "rimraf": "^5.0.5",
    "style-loader": "^3.3.3",
    "ts-loader": "^9.5.0",
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
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM"],
    "strict": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "baseUrl": "src"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

### `aurelia.json`

```json
{
  "name": "my-aurelia-app",
  "type": "app",
  "platform": "web",
  "bundler": "webpack",
  "transpiler": "typescript",
  "cssProcessor": "none",
  "unitTestRunner": "jest",
  "integrationTestRunner": "none",
  "features": {
    "router": true,
    "store": false
  },
  "build": {
    "options": {
      "server": "dev",
      "extract-css": "prod"
    },
    "env": {
      "development": {
        "debug": true,
        "logLevel": "debug"
      },
      "production": {
        "debug": false,
        "logLevel": "warn"
      }
    }
  }
}
```

### `webpack.config.ts`

```typescript
import path from "path";
import HtmlWebpackPlugin from "html-webpack-plugin";
import { Configuration } from "webpack";
import "webpack-dev-server";

const config: Configuration = {
  entry: "./src/main.ts",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].[contenthash].js",
    clean: true,
  },
  resolve: {
    extensions: [".ts", ".js", ".html"],
    alias: { "@": path.resolve(__dirname, "src") },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.html$/i,
        use: "html-loader",
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({ template: "./public/index.html" }),
  ],
  devServer: {
    static: "./dist",
    port: 9000,
    hot: true,
    historyApiFallback: true,
  },
};

export default config;
```

### `src/main.ts`

```typescript
import Aurelia, { RouterConfiguration } from "aurelia";
import { App } from "./components/app";

Aurelia
  .register(RouterConfiguration.customize({ useUrlFragmentHash: false }))
  .app(App)
  .start();
```

### `src/components/app.ts`

```typescript
import { customElement } from "@aurelia/runtime-html";
import template from "./app.html";

@customElement({ name: "app", template })
export class App {
  public message = "Welcome to Aurelia 2!";
}
```

### `src/components/app.html`

```html
<template>
  <h1>${message}</h1>
  <nav>
    <a href="/">Home</a>
    <a href="/about">About</a>
  </nav>
  <au-viewport></au-viewport>
</template>
```

### `src/components/hello-world.ts`

```typescript
import { bindable, customElement } from "@aurelia/runtime-html";
import { inject } from "@aurelia/kernel";
import { UserService } from "../services/user.service";
import template from "./hello-world.html";

@customElement({ name: "hello-world", template })
@inject(UserService)
export class HelloWorld {
  /** The name to display — bindable from outside. */
  @bindable public name = "World";

  /** Track whether the greeting has been acknowledged. */
  public acknowledged = false;

  private userCount = 0;

  constructor(private readonly userService: UserService) {}

  async attached(): Promise<void> {
    const users = await this.userService.getUsers();
    this.userCount = users.length;
  }

  acknowledge(): void {
    this.acknowledged = true;
  }

  get greeting(): string {
    return `Hello, ${this.name}! (${this.userCount} users registered)`;
  }
}
```

### `src/components/hello-world.html`

```html
<template>
  <div class="hello-world">
    <p>${greeting}</p>
    <button
      click.trigger="acknowledge()"
      disabled.bind="acknowledged"
    >
      ${acknowledged ? 'Acknowledged!' : 'Acknowledge'}
    </button>
  </div>
</template>
```

### `src/models/user.ts`

```typescript
export interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "user" | "guest";
}
```

### `src/services/user.service.ts`

```typescript
import { singleton } from "@aurelia/kernel";
import { User } from "../models/user";

@singleton()
export class UserService {
  private users: User[] = [
    { id: 1, name: "Alice", email: "alice@example.com", role: "admin" },
    { id: 2, name: "Bob", email: "bob@example.com", role: "user" },
  ];

  async getUsers(): Promise<User[]> {
    return Promise.resolve(this.users);
  }

  async getUserById(id: number): Promise<User | undefined> {
    return Promise.resolve(this.users.find((u) => u.id === id));
  }
}
```

### `src/value-converters/date-format.ts`

```typescript
import { valueConverter } from "@aurelia/runtime-html";

@valueConverter("dateFormat")
export class DateFormatValueConverter {
  toView(value: string | Date, format = "short"): string {
    if (!value) return "";
    const date = value instanceof Date ? value : new Date(value);
    return date.toLocaleDateString("en-US", {
      dateStyle: format as Intl.DateTimeFormatOptions["dateStyle"],
    });
  }
}
```

### `tests/unit/hello-world.spec.ts`

```typescript
import { createFixture } from "@aurelia/testing";
import { HelloWorld } from "../../src/components/hello-world";
import { UserService } from "../../src/services/user.service";

describe("HelloWorld component", () => {
  it("renders greeting with default name", async () => {
    const { getBy, tearDown } = createFixture(
      `<hello-world></hello-world>`,
      [],
      [HelloWorld, UserService]
    );

    await new Promise((resolve) => setTimeout(resolve, 0)); // tick
    const p = getBy("p");
    expect(p.textContent).toContain("Hello, World!");

    await tearDown();
  });

  it("reflects custom name binding", async () => {
    const { getBy, tearDown } = createFixture(
      `<hello-world name="Aurelia"></hello-world>`,
      [],
      [HelloWorld, UserService]
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    const p = getBy("p");
    expect(p.textContent).toContain("Hello, Aurelia!");

    await tearDown();
  });
});
```

### `jest.config.ts`

```typescript
import type { Config } from "jest";

const config: Config = {
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.ts$": "babel-jest",
    "^.+\\.html$": "<rootDir>/tests/html-transform.js",
  },
  moduleFileExtensions: ["ts", "js", "html", "json"],
  roots: ["<rootDir>/tests"],
};

export default config;
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm start
   ```
   The app will be available at `http://localhost:9000`.
3. Run unit tests:
   ```bash
   npm test
   ```
4. Build for production:
   ```bash
   npm run build
   ```

## Features

- Aurelia 2 (`@aurelia/`) with TypeScript decorator support (`experimentalDecorators`, `emitDecoratorMetadata`)
- Custom element components using the `@customElement` decorator with separate HTML templates
- `@bindable` properties for one-way and two-way data binding between components
- Dependency injection via `@inject` and `@singleton` decorators from `@aurelia/kernel`
- Value converters (e.g. `dateFormat`) for transforming bound values in templates
- Router integration with `<au-viewport>` for single-page navigation
- Webpack 5 build with ts-loader and separate HTML template loading
- Jest + `@aurelia/testing` `createFixture` API for lightweight component unit tests
- `aurelia.json` for project-level configuration and feature flags
- Lifecycle hook `attached()` for async initialisation after DOM insertion

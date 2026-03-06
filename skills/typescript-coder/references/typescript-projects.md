# TypeScript Projects

## TypeScript Configuration

- Reference [Configuration](https://www.w3schools.com/typescript/typescript_config.php)

### Basic Configuration:

```json
{
  "compilerOptions": {
    "target": "es6",
    "module": "commonjs"
  },
  "include": ["src/**/*"]
}
```

### Advanced Configuration:

```json
{
  "compilerOptions": {
    "target": "es2020",
    "module": "esnext",
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@app/*": ["src/app/*"]
    },
    "outDir": "dist",
    "esModuleInterop": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### Initialize Configuration:

```bash
tsc --init
```

## TypeScript Node.js

- Reference [Node.js](https://www.w3schools.com/typescript/typescript_nodejs.php)

### Setting Up Node.js Project:

```bash
mkdir my-ts-node-app
cd my-ts-node-app
npm init -y
npm install typescript @types/node --save-dev
npx tsc --init
```

### Create Project Structure:

```bash
mkdir src
# later add files like: src/server.ts, src/middleware/auth.ts
```

### TypeScript Configuration:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### Install Dependencies:

```bash
npm install express body-parser
npm install --save-dev ts-node nodemon @types/express
```

### Project Structure:

```
my-ts-node-app/
  src/
    server.ts
    middleware/
      auth.ts
    entity/
      User.ts
    config/
      database.ts
  dist/
  node_modules/
  package.json
  tsconfig.json
```

### Basic Express Server Example:

```ts
import express, { Request, Response, NextFunction } from 'express';
import { json } from 'body-parser';

interface User {
  id: number;
  username: string;
  email: string;
}

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(json());

// In-memory database
const users: User[] = [
  { id: 1, username: 'user1', email: 'user1@example.com' },
  { id: 2, username: 'user2', email: 'user2@example.com' }
];

// Routes
app.get('/api/users', (req: Request, res: Response) => {
  res.json(users);
});

app.get('/api/users/:id', (req: Request, res: Response) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

app.post('/api/users', (req: Request, res: Response) => {
  const { username, email } = req.body;

  if (!username || !email) {
    return res.status(400).json({ message: 'Username and email are required' });
  }

  const newUser: User = {
    id: users.length + 1,
    username,
    email
  };

  users.push(newUser);
  res.status(201).json(newUser);
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
```

### Express Middleware with Authentication:

```ts
import { Request, Response, NextFunction } from 'express';

// Extend the Express Request type to include custom properties
declare global {
  namespace Express {
    interface Request {
      user?: { id: number; role: string };
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    /*********************************************************************************************
     IMPORTANT
     An attacker can exploit this by sending any arbitrary token to gain access to protected
     routes that rely on authenticate/authorize, resulting in a complete authentication and
     authorization bypass. Replace the mock decoded assignment with real JWT verification
     (including signature, expiry, and claims checks) and ensure that invalid or missing tokens
     never populate req.user or reach privileged handlers. 
    **********************************************************************************************/
    // In a real app, verify the JWT token here
    const decoded = { id: 1, role: 'admin' }; // Mock decoded token
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    next();
  };
};
```

### Using Middleware in Routes:

```ts
// src/server.ts
import { authenticate, authorize } from './middleware/auth';

app.get('/api/admin', authenticate, authorize(['admin']), (req, res) => {
  res.json({ message: `Hello admin ${req.user?.id}` });
});
```

### Database Integration with TypeORM - Entity:

```ts
import { Entity, PrimaryGeneratedColumn, Column,
 CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ default: 'user' })
  role: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### Database Configuration:

```ts
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from '../entity/User';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'mydb',
  synchronize: process.env.NODE_ENV !== 'production',
  logging: false,
  entities: [User],
  migrations: [],
  subscribers: [],
});
```

### Initialize Database:

```ts
// src/server.ts
import { AppDataSource } from './config/database';

AppDataSource.initialize()
  .then(() => {
   app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
   console.error('DB init error', err);
   process.exit(1);
  });
```

### Package Scripts:

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js",
    "dev": "nodemon --exec ts-node src/server.ts",
    "watch": "tsc -w",
    "test": "jest --config jest.config.js"
  }
}
```

### Development Mode:

```bash
npm run dev
```

### Production Build:

```bash
npm run build
npm start
```

### Run with Source Maps:

```bash
node --enable-source-maps dist/server.js
```
## TypeScript React

- Reference [React](https://www.w3schools.com/typescript/typescript_react.php)

### Getting Started:

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install
npm run dev
```

### TypeScript Configuration for React:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Node",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"]
}
```

### Component Typing:

```tsx
// Greeting.tsx
type GreetingProps = {
  name: string;
  age?: number;
};

export function Greeting({ name, age }: GreetingProps) {
  return (
    <div>
      <h2>Hello, {name}!</h2>
      {age !== undefined && <p>You are {age} years old</p>}
    </div>
  );
}
```

### Event Handlers:

```tsx
// Input change
function NameInput() {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    console.log(e.target.value);
  }
  return <input onChange={handleChange} />;
}

// Button click
function SaveButton() {
  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
  }
  return <button onClick={handleClick}>Save</button>;
}
```

### useState Hook:

```tsx
const [count, setCount] = React.useState<number>(0);
const [status, setStatus] = React.useState<'idle' | 'loading' | 'error'>('idle');

type User = { id: string; name: string };
const [user, setUser] = React.useState<User | null>(null);
```

### useRef Hook:

```tsx
function FocusInput() {
  const inputRef = React.useRef<HTMLInputElement>(null);
  return <input ref={inputRef} onFocus={() => inputRef.current?.select()} />;
}
```

### Children Props:

```tsx
type CardProps = { title: string; children?: React.ReactNode };
function Card({ title, children }: CardProps) {
  return (
    <div>
      <h2>{title}</h2>
      {children}
    </div>
  );
}
```

### Generic Fetch Function:

```tsx
async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Network error');
  return res.json() as Promise<T>;
}

// Usage inside an async function/component effect
async function loadPosts() {
  type Post = { id: number; title: string };
  const posts = await fetchJson<Post[]>("/api/posts");
  console.log(posts);
}
```

### Context API with TypeScript:

```tsx
type Theme = 'light' | 'dark';
const ThemeContext =
  React.createContext<{ theme: Theme; toggle(): void } | null>(null);

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = React.useState<Theme>('light');
  const value =
    { theme, toggle: () => setTheme(t => (t === 'light' ? 'dark' : 'light')) };
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
```

### Vite Environment Types:

```ts
// src/vite-env.d.ts
/// <reference types="vite/client" />
```

### TypeScript Config for Vite Types:

```json
{
  "compilerOptions": {
    "types": ["vite/client"]
  }
}
```

### Path Aliases:

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@utils/*": ["src/utils/*"]
    }
  }
}
```

```ts
// Usage in your code
import { Button } from '@/components/Button';
import { formatDate } from '@utils/date';
```

## TypeScript Tooling

- Reference [Tooling](https://www.w3schools.com/typescript/typescript_tooling.php)

### Install ESLint:

```bash
# Install ESLint with TypeScript support
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

### ESLint Configuration:

```json
// .eslintrc.json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking"
  ],
  "parserOptions": {
    "project": "./tsconfig.json",
    "ecmaVersion": 2020,
    "sourceType": "module"
  },
  "rules": {
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
  }
}
```

### ESLint Scripts:

```json
// package.json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "type-check": "tsc --noEmit"
  }
}
```

### Install Prettier:

```bash
# Install Prettier and related packages
npm install --save-dev prettier eslint-config-prettier eslint-plugin-prettier
```

### Prettier Configuration:

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "printWidth": 100,
  "trailingComma": "es5",
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
```

### Prettier Ignore File:

```
// .prettierignore
node_modules
build
dist
.next
.vscode
```

### Integrate Prettier with ESLint:

```json
// .eslintrc.json
{
  "extends": [
    // ... other configs
    "plugin:prettier/recommended" // Must be last in the array
  ]
}
```

### Setup with Vite:

```bash
# Create a new project with React + TypeScript
npm create vite@latest my-app -- --template react-ts

# Navigate to project directory
cd my-app

# Install dependencies
npm install

# Start development server
npm run dev
```

### Webpack Configuration:

```js
// webpack.config.js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/index.tsx',
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
  ],
  devServer: {
    static: path.join(__dirname, 'dist'),
    compress: true,
    port: 3000,
    hot: true,
  },
};
```

### TypeScript Configuration for Build Tools:

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "es2020",
    "module": "esnext",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

### VS Code Settings:

```json
// .vscode/settings.json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "eslint.validate": ["javascript", "javascriptreact", "typescript", "typescriptreact"],
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.preferences.importModuleSpecifier": "non-relative"
}
```

### VS Code Launch Configuration:

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Launch Chrome against localhost",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}",
      "sourceMaps": true,
      "sourceMapPathOverrides": {
        "webpack:///./~/*": "${workspaceFolder}/node_modules/*",
        "webpack:///./*": "${workspaceFolder}/src/*"
      }
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "runtimeExecutable": "${workspaceRoot}/node_modules/.bin/jest",
      "args": ["--runInBand", "--watchAll=false"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "sourceMaps": true
    }
  ]
}
```

### Install Testing Dependencies:

```bash
# Install testing dependencies
npm install --save-dev jest @types/jest ts-jest @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

### Jest Configuration:

```js
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\\\.tsx?$': 'ts-jest',
  },
  testMatch: ['**/__tests__/**/*.test.(ts|tsx)'],
};
```

### Example Test File:

```tsx
// src/__tests__/Button.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Button from '../components/Button';

describe('Button', () => {
  it('renders button with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

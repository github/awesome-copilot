# TypeScript Project Template (EgoDigital / generator-ego Style)

> A TypeScript project starter based on patterns from EgoDigital's `generator-ego`. Produces an enterprise-grade Node.js/Express API application with structured middleware, logging, environment configuration, and modular route organisation.

## License

MIT License — See source repository for full license terms.

## Source

- [egodigital/generator-ego](https://github.com/egodigital/generator-ego)

## Project Structure

```
my-ego-app/
├── src/
│   ├── controllers/
│   │   ├── health.ts
│   │   └── users.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── errorHandler.ts
│   │   └── logger.ts
│   ├── models/
│   │   └── user.ts
│   ├── routes/
│   │   ├── index.ts
│   │   └── users.ts
│   ├── services/
│   │   └── userService.ts
│   ├── types/
│   │   └── index.ts
│   ├── utils/
│   │   └── env.ts
│   ├── app.ts
│   └── index.ts
├── tests/
│   ├── controllers/
│   │   └── users.test.ts
│   └── services/
│       └── userService.test.ts
├── .env
├── .env.example
├── .eslintrc.json
├── .gitignore
├── jest.config.ts
├── nodemon.json
├── package.json
└── tsconfig.json
```

## Key Files

### `package.json`

```json
{
  "name": "my-ego-app",
  "version": "1.0.0",
  "description": "Enterprise TypeScript Node.js API",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "nodemon",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "clean": "rimraf dist"
  },
  "dependencies": {
    "compression": "^1.7.4",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "express-validator": "^7.0.1",
    "helmet": "^7.0.0",
    "morgan": "^1.10.0",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "@types/compression": "^1.7.5",
    "@types/cors": "^2.8.15",
    "@types/express": "^4.17.20",
    "@types/jest": "^29.5.7",
    "@types/morgan": "^1.9.8",
    "@types/node": "^20.8.10",
    "@types/supertest": "^2.0.15",
    "@typescript-eslint/eslint-plugin": "^6.9.1",
    "@typescript-eslint/parser": "^6.9.1",
    "eslint": "^8.52.0",
    "jest": "^29.7.0",
    "nodemon": "^3.0.1",
    "rimraf": "^5.0.5",
    "supertest": "^6.3.3",
    "ts-jest": "^29.1.1",
    "ts-node": "^10.9.1",
    "typescript": "^5.2.2"
  }
}
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "removeComments": false,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "baseUrl": ".",
    "paths": {
      "@controllers/*": ["src/controllers/*"],
      "@middleware/*": ["src/middleware/*"],
      "@models/*": ["src/models/*"],
      "@routes/*": ["src/routes/*"],
      "@services/*": ["src/services/*"],
      "@types/*": ["src/types/*"],
      "@utils/*": ["src/utils/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### `nodemon.json`

```json
{
  "watch": ["src"],
  "ext": "ts",
  "exec": "ts-node -r tsconfig-paths/register src/index.ts",
  "env": {
    "NODE_ENV": "development"
  }
}
```

### `src/index.ts`

```typescript
import dotenv from "dotenv";
dotenv.config();

import { createApp } from "./app";
import { getEnv } from "./utils/env";
import { createLogger } from "./middleware/logger";

const logger = createLogger("bootstrap");

async function bootstrap(): Promise<void> {
  const port = getEnv("PORT", "3000");
  const app = createApp();

  app.listen(Number(port), () => {
    logger.info(`Server running on port ${port} [${process.env.NODE_ENV ?? "development"}]`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
```

### `src/app.ts`

```typescript
import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import { router } from "./routes";
import { errorHandler } from "./middleware/errorHandler";

export function createApp(): Application {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors());

  // Request parsing
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(compression());

  // Logging
  app.use(morgan("combined"));

  // Routes
  app.use("/api/v1", router);

  // Error handling (must be last)
  app.use(errorHandler);

  return app;
}
```

### `src/utils/env.ts`

```typescript
/**
 * Retrieve a required environment variable, throwing if absent.
 */
export function requireEnv(key: string): string {
  const value = process.env[key];
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Retrieve an optional environment variable with a default fallback.
 */
export function getEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

/**
 * Retrieve a boolean environment variable.
 */
export function getBoolEnv(key: string, defaultValue = false): boolean {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return ["true", "1", "yes"].includes(value.toLowerCase());
}
```

### `src/middleware/logger.ts`

```typescript
import winston from "winston";

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, context, stack }) => {
  const ctx = context ? ` [${context}]` : "";
  return stack
    ? `${timestamp} ${level}${ctx}: ${message}\n${stack}`
    : `${timestamp} ${level}${ctx}: ${message}`;
});

export function createLogger(context?: string): winston.Logger {
  return winston.createLogger({
    level: process.env.LOG_LEVEL ?? "info",
    format: combine(
      colorize(),
      timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      errors({ stack: true }),
      logFormat
    ),
    defaultMeta: context ? { context } : {},
    transports: [
      new winston.transports.Console(),
      new winston.transports.File({
        filename: "logs/error.log",
        level: "error",
      }),
    ],
  });
}
```

### `src/middleware/errorHandler.ts`

```typescript
import { Request, Response, NextFunction } from "express";
import { createLogger } from "./logger";

const logger = createLogger("errorHandler");

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode ?? 500;
  const message = err.isOperational ? err.message : "Internal Server Error";

  logger.error(err.message, { stack: err.stack });

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    },
  });
}
```

### `src/middleware/auth.ts`

```typescript
import { Request, Response, NextFunction } from "express";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    roles: string[];
  };
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: { message: "Unauthorized" } });
    return;
  }

  // TODO: Replace with real JWT verification
  const token = authHeader.substring(7);
  if (!token) {
    res.status(401).json({ success: false, error: { message: "Invalid token" } });
    return;
  }

  next();
}
```

### `src/routes/index.ts`

```typescript
import { Router } from "express";
import { userRouter } from "./users";

export const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

router.use("/users", userRouter);
```

### `.env.example`

```
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
DATABASE_URL=postgres://user:password@localhost:5432/mydb
JWT_SECRET=change-me-in-production
```

## Getting Started

1. Copy the template files into your project directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in real values:
   ```bash
   cp .env.example .env
   ```
4. Run in development mode with hot-reload:
   ```bash
   npm run dev
   ```
5. Build for production:
   ```bash
   npm run build
   npm start
   ```
6. Run tests:
   ```bash
   npm test
   ```

## Features

- TypeScript 5.x with strict mode, decorators, and path aliases
- Express 4 with helmet, cors, compression, and morgan middleware
- Winston structured logging with per-module logger contexts
- Centralised error handler middleware with operational vs. programmer error distinction
- Environment variable utilities (`requireEnv`, `getEnv`, `getBoolEnv`)
- Auth middleware scaffold with Bearer token pattern
- Modular route and controller organisation
- Jest + ts-jest test setup with Supertest for HTTP integration tests
- nodemon-based development workflow with ts-node
- Path aliases (`@controllers/*`, `@services/*`, etc.) for clean imports

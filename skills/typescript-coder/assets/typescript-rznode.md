# TypeScript Node.js REST API (rznode)

> A TypeScript Node.js REST API starter built on Express.js with a clean route/controller separation, typed middleware patterns, environment-based configuration, and Jest for integration testing. Ready to extend with a database layer or additional resource routes.

## License

MIT — See [source repository](https://github.com/odedlevy02/rznode) for full license text.

## Source

- [odedlevy02/rznode](https://github.com/odedlevy02/rznode)

## Project Structure

```
my-node-api/
├── src/
│   ├── controllers/
│   │   └── items.controller.ts
│   ├── routes/
│   │   ├── items.routes.ts
│   │   └── index.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── logger.middleware.ts
│   │   └── validate.middleware.ts
│   ├── models/
│   │   └── item.model.ts
│   ├── services/
│   │   └── items.service.ts
│   ├── config/
│   │   └── env.ts
│   └── app.ts
├── tests/
│   └── items.test.ts
├── package.json
├── tsconfig.json
├── nodemon.json
├── jest.config.ts
├── .env
├── .env.example
├── .gitignore
└── README.md
```

## Key Files

### `package.json`

```json
{
  "name": "my-node-api",
  "version": "1.0.0",
  "description": "TypeScript Node.js REST API",
  "license": "MIT",
  "private": true,
  "main": "dist/app.js",
  "scripts": {
    "build": "tsc",
    "build:watch": "tsc --watch",
    "clean": "rimraf dist",
    "dev": "nodemon",
    "start": "node dist/app.js",
    "lint": "eslint src tests --ext .ts",
    "test": "jest --forceExit",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage --forceExit"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.0",
    "express": "^4.19.0",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.0",
    "@types/morgan": "^1.9.9",
    "@types/node": "^20.12.0",
    "@types/supertest": "^6.0.2",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "eslint": "^8.57.0",
    "jest": "^29.7.0",
    "nodemon": "^3.1.0",
    "rimraf": "^5.0.0",
    "supertest": "^6.3.0",
    "ts-jest": "^29.1.0",
    "ts-node": "^10.9.0",
    "typescript": "^5.4.0"
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
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "lib": ["ES2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": ".",
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### `nodemon.json`

```json
{
  "watch": ["src"],
  "ext": "ts,json",
  "exec": "ts-node -r dotenv/config src/app.ts",
  "env": {
    "NODE_ENV": "development"
  }
}
```

### `.env.example`

```
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=dev
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### `jest.config.ts`

```typescript
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/app.ts'],
  coverageDirectory: 'coverage',
};

export default config;
```

### `src/config/env.ts`

```typescript
import * as dotenv from 'dotenv';

dotenv.config();

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}

export const config = {
  nodeEnv: (process.env['NODE_ENV'] ?? 'development') as 'development' | 'test' | 'production',
  port: parseInt(process.env['PORT'] ?? '3000', 10),
  host: process.env['HOST'] ?? '0.0.0.0',
  corsOrigins: (process.env['CORS_ORIGINS'] ?? '').split(',').filter(Boolean),
} as const;
```

### `src/models/item.model.ts`

```typescript
export interface Item {
  id: string;
  name: string;
  description?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateItemDto {
  name: string;
  description?: string;
  tags?: string[];
}

export interface UpdateItemDto {
  name?: string;
  description?: string;
  tags?: string[];
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
```

### `src/services/items.service.ts`

```typescript
import { randomUUID } from 'crypto';
import type {
  CreateItemDto,
  Item,
  PaginatedResult,
  UpdateItemDto,
} from '../models/item.model';

// In-memory store — swap for a real DB client in production
const items = new Map<string, Item>();

export const ItemsService = {
  findAll(page = 1, pageSize = 10): PaginatedResult<Item> {
    const all = Array.from(items.values());
    const start = (page - 1) * pageSize;
    return {
      data: all.slice(start, start + pageSize),
      total: all.length,
      page,
      pageSize,
    };
  },

  findById(id: string): Item | undefined {
    return items.get(id);
  },

  create(dto: CreateItemDto): Item {
    const now = new Date();
    const item: Item = {
      id: randomUUID(),
      name: dto.name,
      description: dto.description,
      tags: dto.tags ?? [],
      createdAt: now,
      updatedAt: now,
    };
    items.set(item.id, item);
    return item;
  },

  update(id: string, dto: UpdateItemDto): Item | undefined {
    const existing = items.get(id);
    if (!existing) return undefined;
    const updated: Item = {
      ...existing,
      ...dto,
      updatedAt: new Date(),
    };
    items.set(id, updated);
    return updated;
  },

  delete(id: string): boolean {
    return items.delete(id);
  },
};
```

### `src/controllers/items.controller.ts`

```typescript
import { NextFunction, Request, Response } from 'express';
import type { CreateItemDto, UpdateItemDto } from '../models/item.model';
import { ItemsService } from '../services/items.service';

export const ItemsController = {
  getAll(req: Request, res: Response, next: NextFunction): void {
    try {
      const page = parseInt(String(req.query['page'] ?? '1'), 10);
      const pageSize = parseInt(String(req.query['pageSize'] ?? '10'), 10);
      res.json(ItemsService.findAll(page, pageSize));
    } catch (err) {
      next(err);
    }
  },

  getById(req: Request, res: Response, next: NextFunction): void {
    try {
      const item = ItemsService.findById(req.params['id']!);
      if (!item) {
        res.status(404).json({ message: `Item '${req.params['id']}' not found` });
        return;
      }
      res.json(item);
    } catch (err) {
      next(err);
    }
  },

  create(req: Request, res: Response, next: NextFunction): void {
    try {
      const dto = req.body as CreateItemDto;
      if (!dto.name?.trim()) {
        res.status(400).json({ message: 'name is required' });
        return;
      }
      res.status(201).json(ItemsService.create(dto));
    } catch (err) {
      next(err);
    }
  },

  update(req: Request, res: Response, next: NextFunction): void {
    try {
      const item = ItemsService.update(req.params['id']!, req.body as UpdateItemDto);
      if (!item) {
        res.status(404).json({ message: `Item '${req.params['id']}' not found` });
        return;
      }
      res.json(item);
    } catch (err) {
      next(err);
    }
  },

  delete(req: Request, res: Response, next: NextFunction): void {
    try {
      const deleted = ItemsService.delete(req.params['id']!);
      if (!deleted) {
        res.status(404).json({ message: `Item '${req.params['id']}' not found` });
        return;
      }
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
```

### `src/routes/items.routes.ts`

```typescript
import { Router } from 'express';
import { ItemsController } from '../controllers/items.controller';

const router = Router();

router.get('/', ItemsController.getAll);
router.post('/', ItemsController.create);
router.get('/:id', ItemsController.getById);
router.patch('/:id', ItemsController.update);
router.delete('/:id', ItemsController.delete);

export default router;
```

### `src/routes/index.ts`

```typescript
import { Router } from 'express';
import itemsRouter from './items.routes';

const router = Router();

router.use('/items', itemsRouter);

// Health-check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
```

### `src/middleware/error.middleware.ts`

```typescript
import { ErrorRequestHandler } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  errors?: unknown[];
}

export const errorMiddleware: ErrorRequestHandler = (
  err: AppError,
  _req,
  res,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next
) => {
  const statusCode = err.statusCode ?? 500;
  const message = err.message || 'Internal Server Error';

  if (statusCode >= 500) {
    console.error('[ERROR]', err);
  }

  res.status(statusCode).json({
    message,
    ...(err.errors ? { errors: err.errors } : {}),
    ...(process.env['NODE_ENV'] !== 'production' ? { stack: err.stack } : {}),
  });
};
```

### `src/middleware/logger.middleware.ts`

```typescript
import morgan, { StreamOptions } from 'morgan';

const stream: StreamOptions = {
  write: (message: string) => console.info(message.trim()),
};

export const loggerMiddleware = morgan(
  process.env['NODE_ENV'] === 'production' ? 'combined' : 'dev',
  { stream }
);
```

### `src/middleware/auth.middleware.ts`

```typescript
import { NextFunction, Request, Response } from 'express';

// Extend the Express Request type with an authenticated user field
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; roles: string[] };
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Missing or invalid Authorization header' });
    return;
  }

  // Decode/verify your JWT here (e.g. using jsonwebtoken)
  const token = authHeader.slice(7);
  if (!token) {
    res.status(401).json({ message: 'Empty token' });
    return;
  }

  // Attach the decoded user to the request
  req.user = { id: 'placeholder-id', roles: ['user'] };
  next();
}
```

### `src/app.ts`

```typescript
import cors from 'cors';
import * as dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import { config } from './config/env';
import { errorMiddleware } from './middleware/error.middleware';
import { loggerMiddleware } from './middleware/logger.middleware';
import routes from './routes';

dotenv.config();

const app = express();

// Security & parsing
app.use(helmet());
app.use(cors({ origin: config.corsOrigins.length ? config.corsOrigins : '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Logging
app.use(loggerMiddleware);

// Routes
app.use('/api/v1', routes);

// Error handling (must be last)
app.use(errorMiddleware);

if (require.main === module) {
  app.listen(config.port, config.host, () => {
    console.log(`API running at http://${config.host}:${config.port}/api/v1`);
    console.log(`Health check: http://${config.host}:${config.port}/api/v1/health`);
  });
}

export default app;
```

### `tests/items.test.ts`

```typescript
import request from 'supertest';
import app from '../src/app';

describe('Items API', () => {
  describe('GET /api/v1/items', () => {
    it('returns 200 with a paginated result', async () => {
      const res = await request(app).get('/api/v1/items');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ data: expect.any(Array), total: expect.any(Number) });
    });
  });

  describe('POST /api/v1/items', () => {
    it('creates an item and returns 201', async () => {
      const res = await request(app)
        .post('/api/v1/items')
        .send({ name: 'Widget', description: 'A test widget', tags: ['test'] });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ name: 'Widget', tags: ['test'] });
      expect(res.body.id).toBeTruthy();
    });

    it('returns 400 when name is missing', async () => {
      const res = await request(app).post('/api/v1/items').send({ description: 'no name' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/items/:id', () => {
    it('returns 404 for unknown id', async () => {
      const res = await request(app).get('/api/v1/items/does-not-exist');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/health', () => {
    it('returns status ok', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });
});
```

## Getting Started

```bash
# 1. Create project directory
mkdir my-node-api && cd my-node-api

# 2. Copy project files (see structure above)

# 3. Install dependencies
npm install

# 4. Configure environment
cp .env.example .env

# 5. Start in development mode (hot-reload)
npm run dev

# 6. Verify the health endpoint
curl http://localhost:3000/api/v1/health

# 7. Run integration tests
npm test

# 8. Build for production
npm run build

# 9. Start production server
npm start
```

## Features

- Express 4 with full TypeScript types via `@types/express`
- Clean Controller/Service/Route separation — controllers handle HTTP, services handle logic
- Typed middleware: error handler, Morgan logger, CORS, Helmet, and a bearer-token auth stub
- `declare global` augmentation of `Express.Request` for attaching an authenticated user
- `ts-node` + Nodemon for zero-build development hot-reload
- Supertest integration tests running directly against the Express app instance
- `ts-jest` preset for native TypeScript Jest execution without a separate build step
- Environment config loaded via `dotenv` with a helper that throws on missing required variables
- `app.ts` is importable for testing AND runnable as the server entry point via `require.main === module`
- Health-check endpoint at `/api/v1/health` for container liveness probes

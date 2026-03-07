# TypeScript XES BDF Project Template

> A TypeScript project template based on the `generator-xes-bdf` Yeoman generator. Produces
> a structured TypeScript application scaffold with Express-based REST API, dependency
> injection, service/controller layering, and a testing setup. The generator targets teams
> seeking an opinionated, batteries-included TypeScript backend starter.

## License

See the [generator-xes-bdf npm package](https://www.npmjs.com/package/generator-xes-bdf) and
its linked repository for license terms.

## Source

- [generator-xes-bdf on npm](https://www.npmjs.com/package/generator-xes-bdf)

## Project Structure

```
my-xes-bdf-app/
├── src/
│   ├── controllers/
│   │   └── item.controller.ts
│   ├── services/
│   │   └── item.service.ts
│   ├── models/
│   │   └── item.model.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   └── error.middleware.ts
│   ├── config/
│   │   └── app.config.ts
│   ├── types/
│   │   └── index.d.ts
│   ├── app.ts
│   └── server.ts
├── tests/
│   ├── unit/
│   │   └── item.service.spec.ts
│   └── integration/
│       └── item.controller.spec.ts
├── .env
├── .env.example
├── .eslintrc.json
├── .prettierrc
├── package.json
├── tsconfig.json
└── README.md
```

## Key Files

### `package.json`

```json
{
  "name": "my-xes-bdf-app",
  "version": "1.0.0",
  "description": "TypeScript application scaffolded with generator-xes-bdf",
  "main": "dist/server.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js",
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "lint": "eslint 'src/**/*.ts' 'tests/**/*.ts'",
    "lint:fix": "eslint 'src/**/*.ts' 'tests/**/*.ts' --fix",
    "format": "prettier --write 'src/**/*.ts' 'tests/**/*.ts'",
    "test": "jest --coverage",
    "test:watch": "jest --watch",
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration",
    "clean": "rimraf dist"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "express-validator": "^7.0.1",
    "http-status-codes": "^2.3.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.11",
    "@types/node": "^20.11.0",
    "@types/supertest": "^6.0.2",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "eslint": "^8.56.0",
    "eslint-config-prettier": "^9.0.0",
    "eslint-plugin-prettier": "^5.1.3",
    "jest": "^29.7.0",
    "prettier": "^3.2.4",
    "rimraf": "^5.0.5",
    "supertest": "^6.3.4",
    "ts-jest": "^29.1.4",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.3.3"
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
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### `src/app.ts`

```typescript
import express, { Application } from 'express';
import cors from 'cors';
import { json, urlencoded } from 'express';
import { errorMiddleware } from './middleware/error.middleware';
import { ItemController } from './controllers/item.controller';

export function createApp(): Application {
  const app: Application = express();

  // Body parsing
  app.use(json());
  app.use(urlencoded({ extended: true }));

  // CORS
  app.use(cors());

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Routes
  const itemController = new ItemController();
  app.use('/api/items', itemController.router);

  // Global error handler (must be last)
  app.use(errorMiddleware);

  return app;
}
```

### `src/server.ts`

```typescript
import * as dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';
import { AppConfig } from './config/app.config';

const app = createApp();
const config = new AppConfig();

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
});
```

### `src/config/app.config.ts`

```typescript
export class AppConfig {
  readonly port: number;
  readonly nodeEnv: string;
  readonly apiPrefix: string;

  constructor() {
    this.port = parseInt(process.env.PORT ?? '3000', 10);
    this.nodeEnv = process.env.NODE_ENV ?? 'development';
    this.apiPrefix = process.env.API_PREFIX ?? '/api';
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }
}
```

### `src/models/item.model.ts`

```typescript
export interface Item {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateItemDto {
  name: string;
  description: string;
  price: number;
  quantity: number;
}

export interface UpdateItemDto {
  name?: string;
  description?: string;
  price?: number;
  quantity?: number;
}
```

### `src/services/item.service.ts`

```typescript
import { v4 as uuidv4 } from 'uuid';
import { Item, CreateItemDto, UpdateItemDto } from '../models/item.model';

export class ItemService {
  private items: Map<string, Item> = new Map();

  findAll(): Item[] {
    return Array.from(this.items.values());
  }

  findById(id: string): Item | undefined {
    return this.items.get(id);
  }

  create(dto: CreateItemDto): Item {
    const now = new Date();
    const item: Item = {
      id: uuidv4(),
      ...dto,
      createdAt: now,
      updatedAt: now,
    };
    this.items.set(item.id, item);
    return item;
  }

  update(id: string, dto: UpdateItemDto): Item | null {
    const existing = this.items.get(id);
    if (!existing) return null;
    const updated: Item = { ...existing, ...dto, updatedAt: new Date() };
    this.items.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.items.delete(id);
  }
}
```

### `src/controllers/item.controller.ts`

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ItemService } from '../services/item.service';
import { CreateItemDto, UpdateItemDto } from '../models/item.model';

export class ItemController {
  readonly router: Router;
  private readonly service: ItemService;

  constructor() {
    this.router = Router();
    this.service = new ItemService();
    this.initRoutes();
  }

  private initRoutes(): void {
    this.router.get('/', this.getAll.bind(this));
    this.router.get('/:id', this.getById.bind(this));
    this.router.post('/', this.create.bind(this));
    this.router.patch('/:id', this.update.bind(this));
    this.router.delete('/:id', this.remove.bind(this));
  }

  private getAll(_req: Request, res: Response): void {
    res.json(this.service.findAll());
  }

  private getById(req: Request, res: Response): void {
    const item = this.service.findById(req.params.id);
    if (!item) {
      res.status(StatusCodes.NOT_FOUND).json({ message: 'Item not found' });
      return;
    }
    res.json(item);
  }

  private create(req: Request, res: Response): void {
    const dto = req.body as CreateItemDto;
    const item = this.service.create(dto);
    res.status(StatusCodes.CREATED).json(item);
  }

  private update(req: Request, res: Response): void {
    const dto = req.body as UpdateItemDto;
    const item = this.service.update(req.params.id, dto);
    if (!item) {
      res.status(StatusCodes.NOT_FOUND).json({ message: 'Item not found' });
      return;
    }
    res.json(item);
  }

  private remove(req: Request, res: Response): void {
    const deleted = this.service.delete(req.params.id);
    if (!deleted) {
      res.status(StatusCodes.NOT_FOUND).json({ message: 'Item not found' });
      return;
    }
    res.status(StatusCodes.NO_CONTENT).send();
  }
}
```

### `src/middleware/error.middleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';

export interface AppError extends Error {
  statusCode?: number;
}

export function errorMiddleware(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const statusCode = err.statusCode ?? StatusCodes.INTERNAL_SERVER_ERROR;
  res.status(statusCode).json({
    message: err.message ?? 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
```

### `tests/unit/item.service.spec.ts`

```typescript
import { ItemService } from '../../src/services/item.service';

describe('ItemService', () => {
  let service: ItemService;

  beforeEach(() => {
    service = new ItemService();
  });

  it('should return an empty list initially', () => {
    expect(service.findAll()).toHaveLength(0);
  });

  it('should create a new item', () => {
    const dto = { name: 'Test', description: 'Desc', price: 9.99, quantity: 5 };
    const item = service.create(dto);
    expect(item.id).toBeDefined();
    expect(item.name).toBe('Test');
    expect(service.findAll()).toHaveLength(1);
  });

  it('should return undefined for a missing item', () => {
    expect(service.findById('nonexistent')).toBeUndefined();
  });

  it('should update an item', () => {
    const item = service.create({ name: 'Old', description: '', price: 1, quantity: 1 });
    const updated = service.update(item.id, { name: 'New' });
    expect(updated?.name).toBe('New');
  });

  it('should delete an item', () => {
    const item = service.create({ name: 'Del', description: '', price: 1, quantity: 1 });
    expect(service.delete(item.id)).toBe(true);
    expect(service.findAll()).toHaveLength(0);
  });
});
```

### `.env.example`

```
PORT=3000
NODE_ENV=development
API_PREFIX=/api
```

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Copy and configure environment variables
cp .env.example .env

# 3. Start in development mode (hot reload)
npm run dev

# 4. Run tests
npm test

# 5. Build for production
npm run build

# 6. Start production server
npm start
```

## Features

- Express 4 REST API with typed request/response handlers
- Controller/Service/Model layered architecture
- UUID-based entity identity generation
- Global error middleware with environment-aware stack trace output
- Health check endpoint
- CORS and body parsing pre-configured
- `http-status-codes` for readable HTTP status references
- ESLint + Prettier enforced code style
- Jest unit and integration tests with Supertest
- `ts-node-dev` for fast development reloading
- Strict TypeScript compilation with unused-variable enforcement

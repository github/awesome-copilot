# Express No-Stress TypeScript API

> A production-ready Express.js TypeScript API starter with OpenAPI 3.0 request/response validation, Swagger UI, structured logging, helmet security headers, and a clean controller-per-resource layout. Requests are validated automatically against your OpenAPI spec before reaching controller logic.

## License

MIT — See [source repository](https://github.com/cdimascio/generator-express-no-stress-typescript) for full license text.

## Source

- [cdimascio/generator-express-no-stress-typescript](https://github.com/cdimascio/generator-express-no-stress-typescript)

## Project Structure

```
my-api/
├── server/
│   ├── api/
│   │   ├── controllers/
│   │   │   └── examples/
│   │   │       ├── controller.ts
│   │   │       └── router.ts
│   │   ├── middlewares/
│   │   │   └── error.handler.ts
│   │   └── services/
│   │       └── examples.service.ts
│   ├── common/
│   │   └── server.ts
│   ├── routes.ts
│   └── index.ts
├── openapi.yml
├── package.json
├── tsconfig.json
├── nodemon.json
├── .env
├── .gitignore
└── README.md
```

## Key Files

### `package.json`

```json
{
  "name": "my-api",
  "version": "1.0.0",
  "description": "Production-ready Express TypeScript API",
  "license": "MIT",
  "private": true,
  "scripts": {
    "build": "tsc",
    "build:watch": "tsc --watch",
    "clean": "rimraf dist",
    "dev": "nodemon",
    "start": "node dist/server/index.js",
    "lint": "eslint server --ext .ts",
    "test": "jest --forceExit",
    "test:watch": "jest --watch"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.0",
    "express": "^4.19.0",
    "express-openapi-validator": "^5.3.0",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0",
    "swagger-ui-express": "^5.0.0",
    "yaml": "^2.4.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/morgan": "^1.9.9",
    "@types/node": "^20.12.0",
    "@types/swagger-ui-express": "^4.1.6",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "eslint": "^8.57.0",
    "jest": "^29.7.0",
    "nodemon": "^3.1.0",
    "rimraf": "^5.0.0",
    "supertest": "^6.3.0",
    "ts-jest": "^29.1.0",
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
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": ".",
    "resolveJsonModule": true,
    "skipLibCheck": true
  },
  "include": ["server"],
  "exclude": ["node_modules", "dist"]
}
```

### `nodemon.json`

```json
{
  "watch": ["server"],
  "ext": "ts,yml,yaml,json",
  "exec": "ts-node -r dotenv/config server/index.ts",
  "env": {
    "NODE_ENV": "development"
  }
}
```

### `.env`

```
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
REQUEST_LIMIT=100kb
OPENAPI_SPEC=/api/v1/spec
```

### `openapi.yml`

```yaml
openapi: '3.0.3'
info:
  title: My API
  description: A production-ready Express TypeScript API
  version: 1.0.0
servers:
  - url: /api/v1
    description: Local development server

paths:
  /examples:
    get:
      summary: List all examples
      operationId: listExamples
      tags: [examples]
      parameters:
        - in: query
          name: limit
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 10
      responses:
        '200':
          description: A list of examples
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Example'
    post:
      summary: Create an example
      operationId: createExample
      tags: [examples]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateExampleRequest'
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Example'
        '422':
          $ref: '#/components/responses/UnprocessableEntity'

  /examples/{id}:
    get:
      summary: Get an example by ID
      operationId: getExample
      tags: [examples]
      parameters:
        - $ref: '#/components/parameters/IdParam'
      responses:
        '200':
          description: The example
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Example'
        '404':
          $ref: '#/components/responses/NotFound'

components:
  parameters:
    IdParam:
      name: id
      in: path
      required: true
      schema:
        type: string

  schemas:
    Example:
      type: object
      required: [id, name, createdAt]
      properties:
        id:
          type: string
        name:
          type: string
          minLength: 1
          maxLength: 100
        description:
          type: string
        createdAt:
          type: string
          format: date-time

    CreateExampleRequest:
      type: object
      required: [name]
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 100
        description:
          type: string

  responses:
    NotFound:
      description: Resource not found
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    UnprocessableEntity:
      description: Validation error
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'

    ErrorResponse:
      type: object
      required: [message]
      properties:
        message:
          type: string
        errors:
          type: array
          items:
            type: object
```

### `server/common/server.ts`

```typescript
import cors from 'cors';
import * as dotenv from 'dotenv';
import express, { Application } from 'express';
import * as fs from 'fs';
import helmet from 'helmet';
import morgan from 'morgan';
import * as OpenApiValidator from 'express-openapi-validator';
import * as path from 'path';
import swaggerUi from 'swagger-ui-express';
import * as yaml from 'yaml';
import { errorHandler } from '../api/middlewares/error.handler';
import routes from '../routes';

dotenv.config();

export default class Server {
  private readonly app: Application;

  constructor() {
    this.app = express();
    this.middleware();
    this.routes();
    this.swagger();
    this.openApiValidator();
    this.errorHandler();
  }

  private middleware(): void {
    this.app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
    this.app.use(express.json({ limit: process.env.REQUEST_LIMIT ?? '100kb' }));
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(
      helmet({
        contentSecurityPolicy: process.env.NODE_ENV === 'production',
      })
    );
    this.app.use(cors());
  }

  private routes(): void {
    const apiBase = process.env.OPENAPI_SPEC ?? '/api/v1';
    this.app.use(apiBase, routes);
  }

  private swagger(): void {
    const specPath = path.resolve('openapi.yml');
    const specContent = yaml.parse(fs.readFileSync(specPath, 'utf8')) as object;
    this.app.use('/api-explorer', swaggerUi.serve, swaggerUi.setup(specContent));
    this.app.get('/api/v1/spec', (_req, res) => {
      res.sendFile(specPath);
    });
  }

  private openApiValidator(): void {
    const apiSpec = path.resolve('openapi.yml');
    this.app.use(
      OpenApiValidator.middleware({
        apiSpec,
        validateRequests: true,
        validateResponses: process.env.NODE_ENV !== 'production',
        operationHandlers: false,
      })
    );
  }

  private errorHandler(): void {
    this.app.use(errorHandler);
  }

  listen(port: number): Application {
    this.app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
      console.log(`Swagger UI: http://localhost:${port}/api-explorer`);
    });
    return this.app;
  }
}
```

### `server/index.ts`

```typescript
import Server from './common/server';

const port = parseInt(process.env.PORT ?? '3000', 10);
export default new Server().listen(port);
```

### `server/routes.ts`

```typescript
import { Router } from 'express';
import examplesRouter from './api/controllers/examples/router';

const router = Router();

router.use('/examples', examplesRouter);

export default router;
```

### `server/api/controllers/examples/router.ts`

```typescript
import { Router } from 'express';
import controller from './controller';

const router = Router();

router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id', controller.get);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);

export default router;
```

### `server/api/controllers/examples/controller.ts`

```typescript
import { NextFunction, Request, Response } from 'express';
import ExamplesService from '../../services/examples.service';

export class ExamplesController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = Number(req.query['limit'] ?? 10);
      const examples = await ExamplesService.list(limit);
      res.json(examples);
    } catch (err) {
      next(err);
    }
  }

  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const example = await ExamplesService.get(req.params['id']!);
      if (!example) {
        res.status(404).json({ message: `Example ${req.params['id']} not found` });
        return;
      }
      res.json(example);
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const example = await ExamplesService.create(req.body);
      res.status(201).json(example);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const example = await ExamplesService.update(req.params['id']!, req.body);
      res.json(example);
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await ExamplesService.delete(req.params['id']!);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}

export default new ExamplesController();
```

### `server/api/services/examples.service.ts`

```typescript
import { randomUUID } from 'crypto';

export interface Example {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

interface CreateRequest {
  name: string;
  description?: string;
}

// In-memory store (replace with a database in production)
const store = new Map<string, Example>();

const ExamplesService = {
  async list(limit: number): Promise<Example[]> {
    return Array.from(store.values()).slice(0, limit);
  },

  async get(id: string): Promise<Example | undefined> {
    return store.get(id);
  },

  async create(data: CreateRequest): Promise<Example> {
    const example: Example = {
      id: randomUUID(),
      name: data.name,
      description: data.description,
      createdAt: new Date().toISOString(),
    };
    store.set(example.id, example);
    return example;
  },

  async update(id: string, data: Partial<CreateRequest>): Promise<Example | undefined> {
    const existing = store.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data };
    store.set(id, updated);
    return updated;
  },

  async delete(id: string): Promise<void> {
    store.delete(id);
  },
};

export default ExamplesService;
```

### `server/api/middlewares/error.handler.ts`

```typescript
import { ErrorRequestHandler, NextFunction, Request, Response } from 'express';

interface ApiError {
  status?: number;
  message: string;
  errors?: unknown[];
}

export const errorHandler: ErrorRequestHandler = (
  err: ApiError,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  const status = err.status ?? 500;
  const message = err.message ?? 'Internal Server Error';

  if (process.env.NODE_ENV !== 'production') {
    console.error(`[${status}] ${message}`, err.errors ?? '');
  }

  res.status(status).json({
    message,
    ...(err.errors ? { errors: err.errors } : {}),
  });
};
```

## Getting Started

```bash
# 1. Create project directory and initialise
mkdir my-api && cd my-api
npm init -y

# 2. Copy all project files (see structure above)

# 3. Install dependencies
npm install

# 4. Copy .env.example to .env and configure
cp .env .env.local

# 5. Start in development mode (hot-reload via nodemon)
npm run dev

# 6. Browse the Swagger UI
open http://localhost:3000/api-explorer

# 7. Build for production
npm run build

# 8. Start in production mode
npm start
```

## Features

- OpenAPI 3.0 spec-first development — define once, validate automatically
- `express-openapi-validator` rejects invalid requests before they hit controller code
- Response validation in non-production environments catches API contract drift
- Swagger UI served at `/api-explorer` for interactive API exploration
- Helmet security headers enabled by default
- Morgan structured request logging (dev format locally, combined in production)
- Centralised error handler normalises all errors to a consistent JSON shape
- Nodemon with `ts-node` for zero-build development hot-reload
- Controller/Service/Router separation for clean, testable architecture

# TypeScript Bitloops DDD / Clean Architecture Template

> A TypeScript project template based on the `generator-bitloops` Yeoman generator. Produces
> a Domain-Driven Design (DDD) application scaffold following clean/hexagonal architecture
> principles. Organises code into domain, application, and infrastructure layers with bounded
> contexts, strongly typed value objects, domain entities, aggregates, repositories, and
> use cases (application services).

## License

See the [generator-bitloops repository](https://github.com/bitloops/generator-bitloops) for
license terms. Bitloops open-source tooling is generally released under the MIT License.

## Source

- [generator-bitloops](https://github.com/bitloops/generator-bitloops) by Bitloops

## Project Structure

```
my-bitloops-app/
├── src/
│   ├── bounded-contexts/
│   │   └── iam/                         # Identity & Access Management context
│   │       ├── domain/
│   │       │   ├── entities/
│   │       │   │   └── user.entity.ts
│   │       │   ├── value-objects/
│   │       │   │   ├── email.value-object.ts
│   │       │   │   └── user-id.value-object.ts
│   │       │   ├── aggregates/
│   │       │   │   └── user.aggregate.ts
│   │       │   ├── events/
│   │       │   │   └── user-registered.event.ts
│   │       │   ├── errors/
│   │       │   │   └── user.errors.ts
│   │       │   └── repositories/
│   │       │       └── user.repository.ts   # Port (interface)
│   │       ├── application/
│   │       │   └── use-cases/
│   │       │       └── register-user/
│   │       │           ├── register-user.use-case.ts
│   │       │           ├── register-user.request.ts
│   │       │           └── register-user.response.ts
│   │       └── infrastructure/
│   │           ├── persistence/
│   │           │   └── mongo-user.repository.ts  # Adapter
│   │           └── mappers/
│   │               └── user.mapper.ts
│   ├── shared/
│   │   ├── domain/
│   │   │   ├── entity.base.ts
│   │   │   ├── aggregate-root.base.ts
│   │   │   ├── value-object.base.ts
│   │   │   ├── domain-event.base.ts
│   │   │   └── unique-entity-id.ts
│   │   └── result/
│   │       └── result.ts
│   └── main.ts
├── tests/
│   ├── unit/
│   │   └── iam/
│   │       └── user.entity.spec.ts
│   └── integration/
│       └── iam/
│           └── register-user.use-case.spec.ts
├── package.json
├── tsconfig.json
└── .env.example
```

## Key Files

### `package.json`

```json
{
  "name": "my-bitloops-app",
  "version": "1.0.0",
  "description": "DDD / clean architecture TypeScript app via generator-bitloops",
  "main": "dist/main.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/main.js",
    "dev": "ts-node-dev --respawn --transpile-only src/main.ts",
    "test": "jest --coverage",
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration",
    "lint": "eslint 'src/**/*.ts'",
    "clean": "rimraf dist"
  },
  "dependencies": {
    "dotenv": "^16.3.1",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/jest": "^29.5.11",
    "@types/node": "^20.11.0",
    "@types/uuid": "^9.0.7",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "eslint": "^8.56.0",
    "jest": "^29.7.0",
    "rimraf": "^5.0.5",
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
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "paths": {
      "@shared/*": ["src/shared/*"],
      "@iam/*": ["src/bounded-contexts/iam/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### `src/shared/result/result.ts`

```typescript
export type Either<L, R> = Left<L, R> | Right<L, R>;

export class Left<L, R> {
  readonly value: L;

  constructor(value: L) {
    this.value = value;
  }

  isLeft(): this is Left<L, R> {
    return true;
  }

  isRight(): this is Right<L, R> {
    return false;
  }
}

export class Right<L, R> {
  readonly value: R;

  constructor(value: R) {
    this.value = value;
  }

  isLeft(): this is Left<L, R> {
    return false;
  }

  isRight(): this is Right<L, R> {
    return true;
  }
}

export const left = <L, R>(value: L): Either<L, R> => new Left<L, R>(value);
export const right = <L, R>(value: R): Either<L, R> => new Right<L, R>(value);
```

### `src/shared/domain/value-object.base.ts`

```typescript
interface ValueObjectProps {
  [index: string]: unknown;
}

export abstract class ValueObject<T extends ValueObjectProps> {
  protected readonly props: T;

  constructor(props: T) {
    this.props = Object.freeze(props);
  }

  equals(other?: ValueObject<T>): boolean {
    if (other === null || other === undefined) return false;
    if (other.props === undefined) return false;
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }
}
```

### `src/shared/domain/entity.base.ts`

```typescript
import { UniqueEntityId } from './unique-entity-id';

export abstract class Entity<T> {
  protected readonly _id: UniqueEntityId;
  protected readonly props: T;

  constructor(props: T, id?: UniqueEntityId) {
    this._id = id ?? new UniqueEntityId();
    this.props = props;
  }

  get id(): UniqueEntityId {
    return this._id;
  }

  equals(entity?: Entity<T>): boolean {
    if (entity === null || entity === undefined) return false;
    if (!(entity instanceof Entity)) return false;
    return this._id.equals(entity._id);
  }
}
```

### `src/shared/domain/aggregate-root.base.ts`

```typescript
import { Entity } from './entity.base';
import { DomainEvent } from './domain-event.base';
import { UniqueEntityId } from './unique-entity-id';

export abstract class AggregateRoot<T> extends Entity<T> {
  private _domainEvents: DomainEvent[] = [];

  constructor(props: T, id?: UniqueEntityId) {
    super(props, id);
  }

  get domainEvents(): DomainEvent[] {
    return this._domainEvents;
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  clearEvents(): void {
    this._domainEvents = [];
  }
}
```

### `src/shared/domain/unique-entity-id.ts`

```typescript
import { v4 as uuidv4 } from 'uuid';
import { ValueObject } from './value-object.base';

interface UniqueEntityIdProps {
  value: string;
}

export class UniqueEntityId extends ValueObject<UniqueEntityIdProps> {
  constructor(id?: string) {
    super({ value: id ?? uuidv4() });
  }

  get value(): string {
    return this.props.value;
  }

  toString(): string {
    return this.props.value;
  }
}
```

### `src/bounded-contexts/iam/domain/value-objects/email.value-object.ts`

```typescript
import { Either, left, right } from '../../../../shared/result/result';
import { ValueObject } from '../../../../shared/domain/value-object.base';

interface EmailProps {
  value: string;
}

type EmailError = { type: 'INVALID_EMAIL'; message: string };

export class Email extends ValueObject<EmailProps> {
  private static readonly EMAIL_REGEX =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

  private constructor(props: EmailProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  static create(email: string): Either<EmailError, Email> {
    if (!email || !Email.EMAIL_REGEX.test(email)) {
      return left({
        type: 'INVALID_EMAIL',
        message: `"${email}" is not a valid email address`,
      });
    }
    return right(new Email({ value: email.toLowerCase() }));
  }
}
```

### `src/bounded-contexts/iam/domain/aggregates/user.aggregate.ts`

```typescript
import { AggregateRoot } from '../../../../shared/domain/aggregate-root.base';
import { UniqueEntityId } from '../../../../shared/domain/unique-entity-id';
import { Email } from '../value-objects/email.value-object';
import { UserRegisteredEvent } from '../events/user-registered.event';
import { Either, left, right } from '../../../../shared/result/result';

interface UserProps {
  email: Email;
  passwordHash: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
}

type UserCreateError = { type: 'USER_ALREADY_EXISTS' | 'INVALID_EMAIL'; message: string };

export class User extends AggregateRoot<UserProps> {
  private constructor(props: UserProps, id?: UniqueEntityId) {
    super(props, id);
  }

  get email(): Email {
    return this.props.email;
  }

  get name(): string {
    return this.props.name;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  static create(
    props: { email: string; passwordHash: string; name: string },
    id?: UniqueEntityId,
  ): Either<UserCreateError, User> {
    const emailOrError = Email.create(props.email);
    if (emailOrError.isLeft()) {
      return left({ type: 'INVALID_EMAIL', message: emailOrError.value.message });
    }

    const user = new User(
      {
        email: emailOrError.value,
        passwordHash: props.passwordHash,
        name: props.name,
        isActive: true,
        createdAt: new Date(),
      },
      id,
    );

    user.addDomainEvent(
      new UserRegisteredEvent({ userId: user.id.value, email: props.email }),
    );

    return right(user);
  }
}
```

### `src/bounded-contexts/iam/domain/repositories/user.repository.ts`

```typescript
import { User } from '../aggregates/user.aggregate';

// Port — implemented in infrastructure layer
export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<void>;
  delete(id: string): Promise<void>;
}
```

### `src/bounded-contexts/iam/application/use-cases/register-user/register-user.use-case.ts`

```typescript
import { IUserRepository } from '../../../domain/repositories/user.repository';
import { User } from '../../../domain/aggregates/user.aggregate';
import { RegisterUserRequest } from './register-user.request';
import { RegisterUserResponse } from './register-user.response';
import { Either, left, right } from '../../../../../../shared/result/result';

type RegisterUserError =
  | { type: 'USER_ALREADY_EXISTS'; message: string }
  | { type: 'INVALID_EMAIL'; message: string }
  | { type: 'UNEXPECTED_ERROR'; message: string };

export class RegisterUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(
    request: RegisterUserRequest,
  ): Promise<Either<RegisterUserError, RegisterUserResponse>> {
    try {
      const existing = await this.userRepository.findByEmail(request.email);
      if (existing) {
        return left({
          type: 'USER_ALREADY_EXISTS',
          message: `A user with email "${request.email}" already exists`,
        });
      }

      // NOTE: in production, hash with bcrypt before creating the aggregate
      const userOrError = User.create({
        email: request.email,
        passwordHash: request.passwordHash,
        name: request.name,
      });

      if (userOrError.isLeft()) {
        return left({ type: 'INVALID_EMAIL', message: userOrError.value.message });
      }

      const user = userOrError.value;
      await this.userRepository.save(user);

      return right({ userId: user.id.value, email: user.email.value });
    } catch (err) {
      return left({
        type: 'UNEXPECTED_ERROR',
        message: err instanceof Error ? err.message : 'Unexpected error',
      });
    }
  }
}
```

### `src/bounded-contexts/iam/application/use-cases/register-user/register-user.request.ts`

```typescript
export interface RegisterUserRequest {
  name: string;
  email: string;
  passwordHash: string;
}
```

### `src/bounded-contexts/iam/application/use-cases/register-user/register-user.response.ts`

```typescript
export interface RegisterUserResponse {
  userId: string;
  email: string;
}
```

### `src/bounded-contexts/iam/domain/events/user-registered.event.ts`

```typescript
import { DomainEvent } from '../../../../shared/domain/domain-event.base';

interface UserRegisteredProps {
  userId: string;
  email: string;
}

export class UserRegisteredEvent extends DomainEvent {
  readonly userId: string;
  readonly email: string;

  constructor(props: UserRegisteredProps) {
    super({ aggregateId: props.userId, eventName: 'UserRegistered' });
    this.userId = props.userId;
    this.email = props.email;
  }
}
```

### `src/shared/domain/domain-event.base.ts`

```typescript
interface DomainEventProps {
  aggregateId: string;
  eventName: string;
}

export abstract class DomainEvent {
  readonly aggregateId: string;
  readonly eventName: string;
  readonly occurredOn: Date;

  constructor(props: DomainEventProps) {
    this.aggregateId = props.aggregateId;
    this.eventName = props.eventName;
    this.occurredOn = new Date();
  }
}
```

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Run the domain tests
npm run test:unit

# 3. Run integration tests
npm run test:integration

# 4. Build
npm run build

# 5. Start
npm start
```

## Features

- Domain-Driven Design with bounded-context folder layout
- Aggregate roots, domain entities, and immutable value objects
- `Either<L, R>` monad for explicit, type-safe error handling without exceptions
- Domain events attached to aggregates and cleared after persistence
- Repository interfaces (ports) in the domain layer; adapters in infrastructure
- Use cases (application services) orchestrating domain logic
- `UniqueEntityId` value object wrapping UUIDs for identity management
- Strict TypeScript with no implicit `any` and unused-variable enforcement
- Jest unit and integration tests targeting individual layers independently

# TypeScript / JavaScript Devices

What the type system can and cannot enforce, and the constructs that get you to Control.

**Prerequisite**: none of this is load-bearing without `strict: true` in tsconfig and
`tsc --noEmit` as a *required* CI check. A branded type in a repo that doesn't typecheck in CI
is a comment. Start there.

Also enable `noUncheckedIndexedAccess` (array access returns `T | undefined`, which is the
truth) and `exactOptionalPropertyTypes`. Both catch real mistakes that `strict` alone misses.

## Contact, branded types

TypeScript is structurally typed, so `type UserId = string` gives you nothing. Branding adds a
phantom property that exists only at compile time:

```ts
declare const brand: unique symbol;
type Brand<T, B> = T & { readonly [brand]: B };

export type UserId = Brand<string, "UserId">;
export type OrderId = Brand<string, "OrderId">;

export const UserId = (s: string): UserId => s as UserId;

// transfer(orderId, userId) is now a compile error
declare function transfer(from: UserId, to: UserId): void;
```

Zero runtime cost, no wrapper object. Pair the constructor with validation when the string has
a shape worth checking, and it becomes a parse (below) rather than a cast.

## Contact, parse, don't validate

```ts
import { z } from "zod";

const Email = z.string().email().brand<"Email">();
export type Email = z.infer<typeof Email>;

// At the boundary, and only here:
const parsed = Email.safeParse(req.body.email);
if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });

sendWelcome(parsed.data); // sendWelcome(to: Email) cannot receive an unvalidated string
```

Zod's `.brand()` composes validation and branding in one step, which is the ideal shape: short
of an `as` cast, the only way to obtain an `Email` is to have parsed one, which is why the
lint against `as unknown as T` is part of the device, not a style preference.

Apply at every edge: HTTP handlers, queue consumers, `process.env`, third-party responses,
file reads. `JSON.parse` returns `any` and `any` is where guarantees go to die.

## Contact, discriminated unions over optional bags

```ts
// Permits "success with an error", "loading with data", only three combinations are real
type Result = { status: string; data?: User; error?: Error };

// Permits exactly what exists
type Result =
  | { status: "loading" }
  | { status: "success"; data: User }
  | { status: "error"; error: Error };
```

The second version makes `result.data` inaccessible until you've narrowed to `"success"`,
so the check cannot be forgotten: the compiler asks for it.

## Fixed-value, exhaustiveness

```ts
function assertNever(x: never): never {
  throw new Error(`Unhandled variant: ${JSON.stringify(x)}`);
}

switch (result.status) {
  case "loading": return spinner();
  case "success": return view(result.data);
  case "error":   return errorView(result.error);
  default:        return assertNever(result);
}
```

Adding a variant now breaks the build at every switch that must change. Enforce repo-wide with
`@typescript-eslint/switch-exhaustiveness-check`. This is the cheapest high-value device in
the language: one line per switch.

## Motion-step, builders and typestate

Encode required steps in the type so `.delete()` doesn't exist until they've run:

```ts
declare const state: unique symbol;

class QueryBuilder<HasFrom extends boolean = false, HasWhere extends boolean = false> {
  // Load-bearing. TypeScript is structural: a type parameter that no member mentions does
  // not affect assignability, so without this line QueryBuilder<false, false> is assignable
  // to QueryBuilder<true, true> and `delete()` is callable with no where clause -- the exact
  // mistake the class claims to prevent, silently permitted. Verified with tsc 5 --strict.
  private declare readonly [state]: [HasFrom, HasWhere];

  from(t: string): QueryBuilder<true, HasWhere> { /* … */ }
  where(c: Cond): QueryBuilder<HasFrom, true> { /* … */ }

  // Only callable once both have been set
  delete(this: QueryBuilder<true, true>): string { /* … */ }
}
```

The `this` parameter is the key trick: it constrains which instances a method exists on. With
the phantom member present, `new QueryBuilder().delete()` is `TS2684` rather than an incident.

## Motion-step, required idempotency

```ts
// Optional key = suggestion. Required key = device.
function charge(account: AccountId, amount: Money, idempotencyKey: IdempotencyKey): Promise<Charge>
```

Back it with a unique index on `(account_id, idempotency_key)` so the second attempt is
rejected by the database, not by application logic that might be skipped.

## The lint rules that are actually poka-yoke

Style rules are not mistake-proofing. These are, set every one to `error`:

| Rule | Mistake prevented |
|---|---|
| `@typescript-eslint/no-floating-promises` | A write that is never awaited and silently lost |
| `@typescript-eslint/no-misused-promises` | An async function passed where sync is expected |
| `@typescript-eslint/switch-exhaustiveness-check` | New enum variant silently unhandled |
| `@typescript-eslint/no-unnecessary-condition` | A check that is always true, usually a real bug |
| `@typescript-eslint/no-explicit-any` | Type guarantees silently disabled |
| `@typescript-eslint/no-unsafe-assignment` / `-return` / `-argument` | `any` leaking from untyped libraries |
| `no-empty` (with `allowEmptyCatch: false`) | Empty catch blocks |
| `eqeqeq` | `==` coercion surprises |
| `require-atomic-updates` | Read-modify-write races across `await` |
| `no-restricted-syntax` on `it.only` / `describe.only` | A focused test disabling the rest of the suite |

`no-empty` only sees the empty block: a catch holding a comment, or one that logs and carries
on, swallows the error and passes the lint. Catching that shape is a review job.

## Known limits

- **No runtime enforcement.** Types vanish at compile time. Anything crossing a boundary needs
  a runtime schema, and anything reachable from untyped JavaScript needs a runtime check.
- **Structural typing** means every distinct concept needs explicit branding; the compiler
  will not distinguish them for you.
- **`as` casts are unchecked.** Confine them to the inside of parse functions, and lint
  against `as unknown as T` anywhere else.
- **No affine types**, so use-after-move and use-after-close cannot be prevented; scope-bound
  patterns (a `withConnection(fn)` callback rather than `open`/`close`) are the closest you
  get, and they are usually enough.

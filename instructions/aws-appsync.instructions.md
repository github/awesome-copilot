---
description: 'Production-grade guidance for AWS AppSync Event API handlers using APPSYNC_JS runtime restrictions, utilities, modules, and datasource patterns'
applyTo: '**/*.{graphql,gql,vtl,ts,js,mjs,cjs,json,yml,yaml}'
---

# AWS AppSync Event API Instructions

Use these instructions when implementing AWS AppSync **Event API** handlers (`onPublish`, `onSubscribe`) with the `APPSYNC_JS` runtime.

## Scope And Contract

- Design handlers around channel namespace flow: `onPublish` runs before broadcast, `onSubscribe` runs on subscription attempts.
- Keep event contracts explicit and stable. Treat channel path and payload shape as API contracts.
- Prefer additive changes for payload fields and avoid breaking existing subscribers.

## Data Sources Map (Event API)

Use data sources intentionally based on event workflow needs:

- Lambda: custom compute, transformation, orchestration, external AWS/service integrations.
- DynamoDB: low-latency event/state persistence and key-based reads/writes.
- RDS (Aurora): relational checks, joins, and stronger relational integrity use cases.
- EventBridge: route events into broader event-driven architectures.
- OpenSearch: search and analytics over event data.
- HTTP endpoints: external APIs or AWS service APIs over HTTP.
- Bedrock: model inference and AI enrichment in event pipelines.

Prefer combining multiple data sources only when each hop has a clear reason (auth, persistence, enrichment, routing).

## Data Source Setup And IAM (Required)

- Create data sources at the Event API level, then attach them as namespace integrations.
- If using a service role, grant only required actions (least privilege).
- Trust policy principal must allow `appsync.amazonaws.com` to assume the role.
- Restrict trust with conditions when possible:
  - `aws:SourceAccount` to your account.
  - `aws:SourceArn` to a specific AppSync API ARN (or tightly scoped pattern).
- Do not reuse broad, cross-service IAM roles for AppSync data source access.

## Runtime Restrictions (Must Follow)

The `APPSYNC_JS` runtime is a constrained JavaScript subset. Write code for this environment, not for full Node.js.

- Do not use async patterns: no promises, `async/await`, or background async workflows.
- Do not use unsupported statements/operators: `try/catch/finally`, `throw`, `while`, C-style `for(;;)`, `continue`, labels, unsupported unary operators.
- Do not rely on network or file system access from runtime code. Use AppSync data sources for I/O.
- Do not use recursion or pass functions as function arguments.
- Do not rely on classes or advanced runtime features outside documented support.
- Prefer `for-of` / `for-in` loops when iteration is needed.

## Handler Flow Patterns

- For handlers without data source integration, return transformed `ctx.events` directly.
- For handlers with data sources, use object form with `request(ctx)` and `response(ctx)`.
- Use `runtime.earlyReturn(...)` when business logic decides to skip data source invocation and response mapping.
- Use `ctx.info.channel.path`, `ctx.info.channel.segments`, `ctx.info.channelNamespace.name`, and `ctx.info.operation` to drive routing logic.
- For `onPublish` with data source integration, return the event list to broadcast from `response(ctx)`.
- For `onSubscribe` with data source integration, include a `response(ctx)` function (it can be empty when no follow-up mapping is needed).

### `ctx.prev.result` vs `ctx.stash` (Pipeline Guidance)

- If resolver/functions execute step-by-step and the next step depends on the previous step output, use `ctx.prev.result`.
- Use `ctx.prev.result` as the default data handoff mechanism between consecutive pipeline functions.
- Use `ctx.stash` when you need shared data across multiple pipeline stages that is not just the immediate previous result.
- Store only small, intentional metadata in `ctx.stash` (for example flags, IDs, correlation context), not large payload copies.
- Do not duplicate full previous results into `ctx.stash` when `ctx.prev.result` already provides the needed value.

## Error And Authorization Flow

- Do not use `throw` in handlers. Use `util.error(...)` and `util.appendError(...)` patterns supported by AppSync runtime.
- For publish failures, return explicit runtime errors with safe messages (no internals).
- For business-level authorization rejection at handler level, use the documented unauthorized utility in handler code.
- Keep error payloads non-sensitive. Never expose secrets, raw stack traces, or internal identifiers.

## Built-In Utilities

Use `util` for runtime-safe helpers.

- Encoding utilities:
  - `util.urlEncode`, `util.urlDecode`
  - `util.base64Encode`, `util.base64Decode`
- Runtime utility:
  - `runtime.earlyReturn(obj)` to stop current handler execution and skip data source + response evaluation.

## Built-In Modules

Use official modules from `@aws-appsync/utils` and keep code declarative.

- DynamoDB module import:
  - `import * as ddb from '@aws-appsync/utils/dynamodb'`
- RDS module import:
  - `import { ... } from '@aws-appsync/utils/rds'`

### DynamoDB Usage

Prefer module helpers over handwritten request objects where possible.

- Core helpers include: `get`, `put`, `remove`, `update`, `query`, `scan`, `sync`.
- Batch helpers: `batchGet`, `batchPut`, `batchDelete`.
- Transaction helpers: `transactGet`, `transactWrite`.
- For `update`, prefer operation helpers like increment/append/add/remove for safe patch-style mutations.
- Model keys and indexes for query-first access. Avoid `scan` unless justified.
- Use conditions for correctness and optimistic concurrency when needed.
- For bursty publish flows, prefer `batchPut`/`batchDelete` (or `transactWrite` when atomicity is required) over many single-item operations.
- Keep DynamoDB batch sizes within service/API limits and chunk inputs deterministically.

### Lambda Usage

For Event API Lambda data source requests, use:

- `operation: 'Invoke'`
- optional `invocationType: 'RequestResponse' | 'Event'`
- `payload` shaped explicitly for the Lambda contract

Guidance:

- Use `RequestResponse` when handler flow depends on Lambda output.
- Use `Event` only for fire-and-forget side effects.
- Validate `ctx.result` in `response(ctx)` and map to the exact outgoing event shape.
- In Event API handlers, Lambda operation support is `Invoke`; do not rely on GraphQL-style `BatchInvoke` here.
- If you need batching with Lambda in Event API flows, send an array payload in one `Invoke` and implement item-level aggregation/partial-failure handling inside Lambda.

### Direct Lambda Integration (No Handler Code)

You can configure namespace handlers with direct Lambda integrations (`Behavior: DIRECT`) instead of writing `onPublish`/`onSubscribe` code.

- `REQUEST_RESPONSE` mode:
  - `onPublish` Lambda returns `{ events?: OutgoingEvent[], error?: string }`.
  - `onSubscribe` Lambda returns `null` for success or `{ error: string }` for rejection.
- `EVENT` mode:
  - Invocation is asynchronous; AppSync does not wait for a Lambda response.
  - For publish, events continue broadcasting as usual.
- If Lambda returns `error` in request/response mode, it is logged when logging is enabled, and not sent back as a detailed internal error payload.

Prefer direct Lambda integration when the entire namespace behavior can be centralized in Lambda and you do not need APPSYNC_JS request/response mapping logic.

### HTTP/EventBridge/RDS/OpenSearch/Bedrock

When using non-DynamoDB data sources:

- HTTP: return `resourcePath`, `method`, optional `params` (`headers`, `query`, `body`); check `ctx.result.statusCode`, `ctx.result.body`, and `ctx.error`.
- EventBridge: use `operation: 'PutEvents'` and build deterministic event entries from `ctx.events`.
- RDS: prefer SQL helpers and `createPgStatement`/`createMySQLStatement`; do not interpolate unsafe SQL.
- OpenSearch: keep request path/params explicit and map only required fields from `ctx.result`.
- Bedrock: define `operation` (`InvokeModel` or `Converse`) explicitly and include prompt-injection safeguards.

## Batch Operations (Required Guidance)

- Prefer batching where the target data source natively supports it and event semantics allow grouping.
- DynamoDB:
  - Use `batchGet`, `batchPut`, `batchDelete` for non-atomic bulk operations.
  - Use `transactGet`, `transactWrite` when atomic all-or-nothing behavior is required.
  - Validate and cap per-request item counts; chunk large batches.
- Lambda:
  - Event API JS handler requests use `operation: 'Invoke'` with optional `invocationType`.
  - There is no Event API `BatchInvoke` operation in handler request objects.
  - For pseudo-batch Lambda patterns, send list payloads to one invoke and return deterministic per-item result structures.
- Keep ordering guarantees explicit: if downstream consumers depend on order, preserve and document ordering keys.

## Security And Data Safety

- Treat `ctx.identity`, headers, and payload fields as untrusted input.
- Enforce least-privilege IAM per data source.
- Add validation before write operations and before forwarding transformed events.
- Never hardcode secrets in handler code.
- For public usage, keep defaults conservative (deny/unauthorized on invalid states).

## Tooling, TypeScript, And Build

- Use `@aws-appsync/eslint-plugin` (`plugin:@aws-appsync/base` at minimum).
- Use `plugin:@aws-appsync/recommended` when TypeScript tooling is configured.
- TypeScript is not executed directly by AppSync runtime. Transpile to supported JavaScript before deployment.
- Bundle with externalized `@aws-appsync/utils` imports and source maps for debugging.

## Observability And Operations

- Enable CloudWatch logging for handlers and datasource integration.
- Log with structured, low-cardinality fields (channel namespace/path, operation, request id).
- Add alarmable signals: handler errors, datasource errors, latency regression.
- Keep response transformations deterministic and test with multi-event payloads.

## Minimum Quality Checklist

- [ ] Uses only APPSYNC_JS-supported runtime features.
- [ ] No `throw`, no async/promise usage, no unsupported loop/control constructs.
- [ ] Error flow uses runtime-supported utilities and returns non-sensitive messages.
- [ ] `onPublish` and `onSubscribe` behavior is explicit and tested.
- [ ] Data source request/response mapping is deterministic and schema-safe.
- [ ] Lambda/DynamoDB contracts are documented and validated.
- [ ] Linting with `@aws-appsync/eslint-plugin` is enabled.

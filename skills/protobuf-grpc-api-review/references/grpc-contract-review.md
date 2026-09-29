# gRPC Contract Review

Use this reference when a change affects a service, method, request/response behavior, or client/server policy. Apply only the checks relevant to the change.

## Method Identity and Shape

The fully qualified package, service, and method form the RPC identity. Renaming or moving any of them changes the method path and breaks existing clients, routing, authorization policies, observability, and service configuration.

Treat these as breaking contract changes:

- removing or renaming a service or method
- changing request or response message type
- changing unary, client-streaming, server-streaming, or bidirectional-streaming mode
- moving a service to another protobuf package

Prefer adding a new method, migrating callers, deprecating the old method, and removing it only after the compatibility window closes. Review request and response message changes with the protobuf compatibility rules.

## Deadlines and Cancellation

- Clients should set a realistic deadline; gRPC does not set one by default.
- The deadline must cover expected network and processing latency and be validated against production or load-test evidence.
- Servers must stop spawned work when the call is cancelled or its deadline expires.
- Downstream calls should receive the remaining deadline rather than starting a fresh full timeout. Confirm whether propagation is automatic or must be enabled in the implementation language.
- Do not convert a deadline or cancellation into a misleading application status.

Flag new unbounded calls, swallowed cancellation, or downstream work that can outlive the originating request when they create resource or correctness risk.

## Retries and Idempotency

Before recommending or approving a retry policy, answer:

1. Can the operation be repeated without duplicating a state change?
2. If the result is ambiguous, is there an idempotency key or server-side deduplication window?
3. Which status codes are retryable for this method?
4. Are attempts bounded by max attempts, exponential backoff, jitter, throttling, and the overall deadline?
5. Are retry attempts and final call outcomes observable?

Retries are enabled in gRPC implementations, but there is no default general retry policy; transparent retries can still occur in limited cases. A response header commits the RPC and ends gRPC retry attempts. Never treat a mutating RPC as retry-safe merely because it returns `UNAVAILABLE` or `DEADLINE_EXCEEDED`: the server may already have applied the change.

## Status Codes Are Part of the API

Review status changes as observable behavior. Prefer the most specific stable code and keep error details free of secrets.

- `INVALID_ARGUMENT`: invalid regardless of system state
- `FAILED_PRECONDITION`: retry only after state is explicitly fixed
- `ABORTED`: retry the larger transaction or read-modify-write sequence
- `UNAVAILABLE`: transient failure where retrying this call may be appropriate
- `RESOURCE_EXHAUSTED`: quota or capacity exhausted
- `UNAUTHENTICATED`: credentials are missing or invalid
- `PERMISSION_DENIED`: authenticated caller lacks permission
- `NOT_FOUND`: resource does not exist, or deliberate existence hiding is part of the authorization contract

Avoid replacing domain failures with `UNKNOWN` or `INTERNAL`. Check client logic, retry policies, metrics, and alerts before changing an established code.

## Streaming Contracts

For streaming methods, establish and test:

- message ordering and whether duplicates are possible
- half-close and completion semantics
- backpressure and bounded buffering
- per-message and total stream size limits
- cancellation and cleanup on both peers
- authentication lifetime for long-lived streams
- resume, replay, or checkpoint behavior after interruption

Do not add streaming as a default improvement; require a concrete need and an explicit lifecycle contract.

## Security and Resource Boundaries

- Enforce authentication and authorization per method; update policy maps that enumerate paths whenever a method is added.
- Use transport security appropriate to the deployment, and avoid logging credentials or sensitive metadata.
- Bound request size, response size, concurrency, fan-out, and expensive repeated fields where input is untrusted.
- Validate before starting irreversible or costly work.
- Check that reflection, health services, and debug endpoints are exposed only as intended.

## Behavioral Evolution

Schema compatibility does not protect semantic contracts. Review changes to:

- required business fields represented as optional protobuf fields
- pagination tokens, ordering, filters, and consistency guarantees
- idempotency and deduplication keys
- partial success and batch error semantics
- default limits, quotas, and server-side timeouts
- error details and redaction

For a behavioral change, require documentation and tests that cover old clients during rollout and rollback.

## Targeted Verification

- invoke old generated clients against the new server and new clients against the old server when mixed versions are supported
- test the exact method path through proxies, gateways, and authorization middleware
- exercise deadlines, cancellation, and downstream propagation
- inject retryable and non-retryable failures, including an ambiguous failure after a state change
- test streaming cancellation, slow consumers, large messages, and interrupted streams where applicable
- verify metrics distinguish attempts from logical calls

## Primary References

- [gRPC deadlines](https://grpc.io/docs/guides/deadlines/)
- [gRPC retry](https://grpc.io/docs/guides/retry/)
- [gRPC status codes](https://grpc.io/docs/guides/status-codes/)
- [gRPC authentication](https://grpc.io/docs/guides/auth/)

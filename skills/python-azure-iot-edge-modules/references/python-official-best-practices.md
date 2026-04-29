# Python Official References and Best Practices

Use these official Python resources before finalizing module architecture or implementation details.

## Official References

- Python home: <https://www.python.org/>
- Python documentation portal: <https://docs.python.org/3/>
- Python tutorial: <https://docs.python.org/3/tutorial/>
- Python language reference: <https://docs.python.org/3/reference/>
- Python standard library reference: <https://docs.python.org/3/library/>
- Python HOWTOs: <https://docs.python.org/3/howto/>
- Installing modules: <https://docs.python.org/3/installing/>
- Distributing modules: <https://docs.python.org/3/distributing/>
- PEP index: <https://peps.python.org/>
- PyPA packaging guide: <https://packaging.python.org/>

## Coding Best Practices

- Target and pin an explicit Python major/minor runtime for each deployment.
- Prefer explicit, readable code paths over clever compact logic.
- Use type hints for public interfaces and critical data transformations.
- Keep module responsibilities focused; separate protocol, business logic, and transport.
- Validate and sanitize external inputs at boundaries.
- Use structured exceptions with actionable error messages.
- Log with enough context for incident triage (correlation id, module id, message id).

## Reliability and Performance Best Practices

- Avoid blocking operations in high-frequency message paths.
- Enforce timeouts and bounded retries with exponential backoff and jitter.
- Design idempotent handlers for replay and duplicate deliveries.
- Use resource limits and monitor memory growth to prevent edge instability.
- Define graceful shutdown behavior to flush buffered state safely.

## Dependency and Supply Chain Best Practices

- Pin dependencies and document upgrade cadence.
- Prefer actively maintained libraries with clear release history.
- Track vulnerabilities and update dependencies regularly.
- Keep container images minimal and patched.

## Testing Best Practices

- Unit test parsing, validation, and routing logic.
- Add integration tests for module I/O boundaries.
- Add chaos tests for network loss, slow upstream, and restart scenarios.
- Verify rollback behavior and state recovery in deployment tests.

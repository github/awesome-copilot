# Delivery checks

Use the checks that apply to the change; this is a review aid, not an additional
approval gate or a claim of official certification.

- **Behavior:** the requested command/event/tool is implemented, and changed config
  values reach it. Example greeting code is replaced when the requested feature differs.
- **Framework:** entrypoint, decorators, hook signatures, and APIs match the selected
  AstrBot release. Version constraints reflect that evidence.
- **Packaging:** required metadata strings are present; author/repo values are real.
  Runtime and development dependencies are separate. See [packaging](plugin-new-checklist.md).
- **State/lifecycle:** durable files use AstrBot's plugin data directory; session
  keys do not collide across bots. Owned tasks and clients are cleaned up on reload.
- **Network:** async client, timeouts, relevant error paths, and no credential logging.
  OpenAPI parsing uses the actual endpoint's JSON/SSE/binary contract.
- **Tests:** assertions call the real implementation. Run existing relevant checks
  and add regression coverage proportionate to the behavior change.
- **Evidence:** distinguish static checks, offline behavior, actual SDK smoke tests,
  and live loader/adapter checks. State unavailable checks explicitly.
- **Release:** when requested, prepare the authorized PR or publication with a real
  destination and current requirements. Do not infer marketplace approval from a
  local validator.

# Map a request to implementation

For an open-ended plugin request, derive a short behavior contract from the user's
words and the existing repository. Ask only about a missing detail that affects the
outcome; normal choices can be recorded as assumptions.

| Requirement | Concrete implementation question |
| --- | --- |
| Trigger | A command, message filter, LLM tool, lifecycle hook, or recurring job? |
| Input | Typed command arguments, full message chain, file, or config value? |
| Reply/action | Plain text, media, a tool result, or a later message to the saved UMO? |
| State | Per-user/session/plugin state? How is it retained over reloads? |
| Failures | Invalid input, missing configuration/provider, timeout, bad response? |
| Compatibility | Which AstrBot version and adapters are actually needed? |

For a repair, reproduce the reported failure with the current implementation and
follow its existing structure. Preserve metadata identity and configuration keys
unless a migration is necessary.

Example: "a command that fetches status from my service" normally needs one handler,
an async client with a timeout, settings for the service URL/credential, and tests
using mocked service responses. It does not by itself require AstrBot's own HTTP
OpenAPI, an LLM tool, or an AstrBot runtime installation.

Implement the smallest complete behavior. Separate business logic from framework
wiring when this makes offline tests useful; avoid splitting a tiny fix into
unnecessary modules. Use the generated greeting only as an initial scaffold and
replace its example behavior/tests before presenting the requested feature as done.

Verify an observable success case and the relevant failure paths. Report actual
validation and any remaining runtime/platform checks, without turning routine
implementation into a required approval sequence.

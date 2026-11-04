# Workbench regressions

Validated with Node.js 24.18 and `jsdom` 28.1.0 for the DOM tests.
JSDOM 28 requires Node.js 20.19, 22.12, or 24+; the command below also requires
a Node.js release supporting `--test-isolation=none`.
The CLI fixtures use Python 3 and POSIX pseudo-terminals for interactive consent.
Do not install test dependencies without approval. If JSDOM is installed outside
this checkout, set `NODE_PATH` to that installation's `node_modules` directory:

```sh
NODE_PATH=/path/to/existing/node_modules node --test --test-isolation=none skills/webmcpify/tests/*.test.mjs
```

No Playwright package or browser engine is downloaded by these tests. CLI tests
copy the launcher into isolated temporary directories and use a fake npm command,
fake Playwright module and fake browser installer. They verify refusal without
writes and successful interactive/explicit consent for each separate scope.

DOM tests execute the Workbench template, including form events and handlers.
Native transport is modeled; these checks do not claim browser API conformance,
layout/accessibility verification, or GitHub Copilot testing. The test-only source
copy exposes the private dispatch boundary to prove that it also refuses calls
when the UI disabled state is bypassed; the shipped API is unchanged.

# Free and open-source web-interface stack

Read this only after a browser control panel has been justified. The stack is a
default, not a requirement to build a web interface.

## Default production stack

- React with TypeScript for the application.
- Vite for local development and production builds.
- Tailwind CSS for styling.
- shadcn/ui as open-source component source code that remains in the project.
- TanStack Table only when real sorting, filtering, pagination, or dense tabular
  data is required.
- Recharts only when a chart answers a confirmed monitoring question.

Use current stable releases at implementation time. Pin versions in the lockfile
and record licenses of direct interface dependencies. Do not add a package only
because it appears in this list.

## Rapid Python prototype

Use Streamlit when the interface is an internal, low-complexity prototype and the
team is primarily Python-based. Prefer the production stack when the interface
needs precise interaction design, complex approval flows, role-based views, or
long-term front-end maintenance.

## Cost rule

The initial interface must be able to run locally with no paid component library
or mandatory commercial cloud service. Hosting, identity providers, analytics,
and managed databases are separate decisions; estimate their cost before adding
them.

## Required interaction design

If the system can cause an external effect, the interface must distinguish:

1. draft;
2. awaiting approval;
3. approved for exact parameters;
4. executing;
5. succeeded;
6. failed;
7. result unknown;
8. cancelled or expired.

Approval must show the exact target, account, action, content or change, budget or
limit, and what verification will follow. Editing an approved proposal invalidates
that approval.

## Minimum accessibility and safety

- Keyboard access for all critical controls.
- Visible focus and explicit labels.
- Status must not rely on color alone.
- Destructive actions require a distinct confirmation step.
- Secrets must never appear in client bundles, URLs, logs, or screenshots.
- Server-side authorization must enforce permissions; hidden buttons are not a
  security boundary.
- Error messages must say whether an external effect may have occurred.

## Architecture boundary

The browser is a control surface, not the owner of business state. Keep the
authoritative queue, approvals, and execution results on the server or in the
chosen system of record. The interface may cache display data but must make stale
status visible.

## Do not build yet when

- the only confirmed operator is comfortable with conversation or command line;
- the first useful version is still validating the workflow;
- task state has no stable schema;
- approval boundaries remain unknown;
- there is no evidence that a shared overview saves material effort or risk.

In those cases, include an interface specification and review trigger in the kit,
but keep the first implementation simpler.

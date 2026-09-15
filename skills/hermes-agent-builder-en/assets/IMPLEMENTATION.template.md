# Agent system implementation

Implement the system described in this directory through every acceptance
criterion.

## Required procedure

1. Read `manifest.json`, `requirements/`, `architecture/`, `acceptance/`,
   `blueprint/`, `evidence/sources.md`, and `unresolved.md`.
2. Confirm that status is `ready_for_implementation` and `critical_unknowns` is
   empty. Otherwise stop implementation, save any useful analysis, and name the
   one question that must be answered before work can continue.
3. Create the result under `implementation/`. Do not change source requirements
   to hide nonconformance.
4. Implement every selected component: Hermes profiles, skills, tools, processes,
   storage, server, and control panel. Do not add components the architecture
   rejected.
5. Use the free and open-source libraries recorded in the architecture. Verify
   their current versions and licenses.
6. Do not place real keys, passwords, memory, sessions, or production data in the
   project. Create example environment files only.
7. Do not make external changes or enable scheduled tasks without separate,
   exact user approval.
8. Run the automated and end-to-end checks under `acceptance/`. Correct failures
   until checks pass or a demonstrated external blocker appears.
9. Create `implementation/IMPLEMENTATION-RESULT.md` containing implemented
   components, install and run commands, check results, known limitations,
   required credentials, and exact next human actions.

Do not finish with a design, recommendation, or file list. A complete result is
working code, valid Hermes distributions, passed checks, and run instructions.

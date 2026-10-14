---
name: lean-comments
description: 'Audits, writes, and refines maintained first-party source-code comments and declaration-level documentation across languages. Use when adding, editing, reviewing, cleaning up, or auditing comments, doc comments, docstrings, TODO, FIXME, NOTE, suppressions, or other source commentary, including while modifying code and deciding whether a comment is warranted at all. Defaults to no comment unless it preserves meaningful, non-obvious information that cannot reasonably be recovered from the code or nearby repository context.'
---

# Lean Comments

## Goal

Keep the smallest amount of high-value commentary necessary to make a codebase easier and safer to understand and maintain.

The default is **no comment**.

A comment must preserve meaningful information that a competent maintainer cannot reasonably recover from the code, names, types, signatures, structure, tests, configuration, or nearby context.

Comments are not labels, narration, decoration, declaration summaries, change logs, or substitutes for clear code.

## Reader model

Write for a competent maintainer reading the repository at HEAD months later, without access to the current conversation, prompt, diff, pull request, issue discussion, review discussion, or implementation process.

Document the durable state, contract, constraint, or rationale of the code as it exists. Do not assume the reader knows what changed, what came before, or what was discussed unless that context is deliberately preserved in a reliable project source.

## Authority and evidence

Use this skill as the comment-policy authority when it is active.

Use language, framework, library, or infrastructure skills to determine whether a non-obvious constraint is real, not to override this skill's necessity test.

Honor explicit current repository requirements, public API documentation requirements, tooling contracts, and generated-source rules. Do not infer a documentation requirement merely from existing comment density or precedent.

Base retained or newly written rationale on evidence from the repository, tests, configuration, official API behavior, project documentation, issue tracker, ADRs, specifications, or another reliable source.

Never invent a security reason, performance reason, business rule, compatibility requirement, API constraint, historical reason, architectural rationale, or external limitation to justify commentary.

If no supported non-obvious reason exists, remove or omit it.

## Core decision rule

Before retaining or adding ordinary commentary, mentally remove it and ask:

> Would a competent maintainer lose meaningful, non-obvious information if this comment did not exist?

If no, remove or omit it.

If uncertain, prefer no comment unless repository evidence demonstrates that the information matters.

If yes, retain only the minimum information necessary.

Never preserve a comment merely because it is correct, harmless, already present, grammatically polished, written as a warning, related to security or validation, related to internal or public state, or attached to an exported declaration.

The information itself must justify the comment.

## Decision order

Evaluate existing and proposed commentary in this order:

1. **Delete or omit** if the information is already clear without it
2. **Express through code** if a tiny behavior-preserving readability improvement removes the need for it
3. **Shorten** if it is necessary but contains unnecessary information or words
4. **Rewrite** if it is necessary but unclear, inaccurate, stale, awkward, or inconsistent
5. **Use declaration documentation** if the information belongs to the declaration's contract, semantics, or intended usage
6. **Keep unchanged** only if it is already necessary, minimal, accurate, durable, and correctly styled

Always decide necessity before wording.

Do not polish an unnecessary comment or convert one into documentation.

## What deserves an implementation comment

Use an implementation comment when it preserves non-obvious information such as:

- Why intentionally surprising code exists
- An external constraint or compatibility requirement
- An important invariant or subtle edge case
- A meaningful tradeoff or required workaround
- Non-obvious coupling
- An ordering, timing, lifecycle, concurrency, performance, or security constraint
- A reason an apparently simpler implementation would be incorrect

Prefer comments that explain **why** something matters.

Comments that merely explain **what** the code does should normally be removed.

## Remove low-value commentary

Remove comments that merely:

- Restate or translate the code into prose
- Narrate the next statement or obvious control flow
- Explain an obvious guard clause, return, assignment, or branch
- Describe an obvious fetch, validation, transformation, mapping, filtering, creation, update, or deletion
- Repeat a declaration name, property name, type, signature, parameter, or return type
- Label or summarize a declaration
- Repeat information already represented clearly by tests or configuration
- Add generic context that is immediately inferable
- Act as unnecessary section headings or visual separators
- Preserve obsolete change history
- Address the reviewer or justify the current change
- State a bare rule or prohibition without useful non-obvious context
- Add rhetorical emphasis without information

Words such as `Never`, `Always`, `Important`, `Security`, `Internal`, `Public`, or `Required` do not make a comment valuable.

Judge the information, not how serious the wording sounds.

## Prefer self-explanatory code

When a comment compensates for unnecessarily confusing code, consider a tiny local behavior-preserving improvement such as improving a local name, extracting a clearly named boolean, simplifying local control flow, or removing redundant local structure.

Keep such changes minimal and directly related to clarity.

Do not turn comment cleanup into a general refactor or change behavior, architecture, public APIs, dependencies, or unrelated code merely to eliminate comments.

## Comment and documentation forms

Apply the same necessity test across languages and syntaxes.

Relevant forms may include:

- Line and block comments such as `//`, `#`, `--`, and `/* ... */`
- JSDoc, TSDoc, JavaDoc, KDoc, Rust doc comments, Go doc comments, C# XML documentation, and equivalent declaration documentation
- Module, package, and file documentation
- Python docstrings and other declaration documentation represented as runtime-visible strings
- TODO, FIXME, NOTE, HACK, XXX, and similar markers
- Tooling, compiler, formatter, coverage, build, framework, generator, and machine-consumed directives

Do not treat comment-like text inside string literals, regular expressions, URLs, snapshots, fixtures, templates, or test data as source comments merely because it contains comment syntax.

### Implementation comments

Use the language's normal implementation-comment form for brief rationale, constraints, invariants, workarounds, or other non-obvious local context.

Prefer one concise line when one line is sufficient.

### Declaration documentation

Use the language's declaration-documentation form only when the information belongs to the declaration itself and forms part of its contract, semantics, or intended usage.

For TypeScript, use TSDoc-compatible documentation when warranted. For JavaScript, follow intentional repository JSDoc conventions. For other languages, follow the language and repository's real documentation conventions without creating coverage for its own sake.

### Module and file documentation

Add module, package, or file-level documentation only for a durable architectural concept, boundary, invariant, terminology, lifecycle rule, or design rationale that is not apparent from the contents.

Do not add file headers that merely summarize exports or describe an obvious file purpose.

### Runtime-visible documentation

Some documentation forms, especially Python docstrings, can be observable at runtime through introspection or tooling.

Before removing or materially changing runtime-visible documentation, verify that doing so does not change a supported runtime contract, generated documentation surface, or external API expectation.

## Declaration documentation rules

This is not a documentation coverage exercise.

Do not document declarations merely because they are exported or public, and do not assume every language-level export in application code is an intentionally supported external API.

Use declaration documentation when consumers or maintainers need non-obvious information about:

- Behavioral contracts, parameter constraints, return semantics, or special values
- Error behavior, side effects, preconditions, or postconditions
- Ordering, timing, lifecycle, concurrency, or caching behavior
- Security, runtime, server, client, SSR, or environment constraints
- Compatibility requirements or upstream API behavior
- Business rules or invariants
- Units, formats, ranges, encodings, or cross-field relationships
- Deprecation, extension points, or important usage restrictions
- Non-obvious usage that materially benefits from an example

Apply a stronger documentation bias to published libraries, SDKs, packages, plugins, extension APIs, and intentionally external interfaces.

Apply a stronger no-documentation bias to internal helpers, simple CRUD methods, straightforward adapters, composables, plain data shapes, DTOs, and internal utilities.

### Do not repeat the type system

Do not add documentation that merely restates names, types, signatures, obvious values, or structure already expressed by the language.

Do not mechanically add tags such as `@param`, `@returns`, `@throws`, `@example`, `@remarks`, or `@see`. Use a tag only when it contributes information beyond the declaration and type system.

Plain interfaces, records, DTOs, structs, types, and obvious data shapes normally require no documentation unless they contain non-obvious semantics, invariants, formats, units, relationships, external constraints, or compatibility requirements.

## Style

### Single-line prose implementation comments

For a necessary single-line prose implementation comment, regardless of comment delimiter:

- Keep it as short as possible without making it cryptic
- Start normal prose with an uppercase letter unless technically required casing dictates otherwise
- Do not end it with `.`, `!`, `?`, or other terminal sentence punctuation
- Do not use em dashes or en dashes
- Do not use dash-based sentence punctuation
- Do not use semicolons as sentence punctuation
- Prefer a concise clause over unnecessarily complete prose
- Preserve exact casing and punctuation in identifiers, code, commands, URLs, paths, package names, versions, API values, and other technical literals

Example:

```ts
// Preserve source order for positional matching
```

Not:

```ts
// Preserve source order for positional matching.
```

These prose rules do not apply to machine-consumed syntax, technically significant punctuation, or genuine multi-line declaration documentation.

### Declaration documentation

Use normal sentence punctuation for genuine multi-sentence declaration documentation.

Keep it concise and focused on meaningful contract or semantic information. Do not add prose, tags, examples, or sections merely to make documentation appear complete.

## High-value examples

<examples>

<example>
Delete:

```ts
// A watchlist row
export interface FlickWatchlistItem {
  media: FlickMedia;
  added_at: string;
}
```

Correct:

```ts
export interface FlickWatchlistItem {
  media: FlickMedia;
  added_at: string;
}
```

The declaration already communicates the concept. Do not shorten the comment or convert it into declaration documentation.
</example>

<example>
Usually delete:

```ts
// Never copy a raw internal message into the public response
```

Do not preserve this merely because it contains `Never` or concerns a public boundary.

If repository evidence establishes a genuinely non-obvious reason, retain only that supported reason:

```ts
// Keep provider errors private because messages may contain credentials
```

Never invent such rationale to save the original comment.
</example>

<example>
Delete:

```ts
// Return the normalized result
return normalize(result);
```

The code already communicates the action.
</example>

<example>
Keep when supported by the implementation or external contract:

```ts
// Preserve source order because the upstream API matches items by position
```

The comment communicates a non-obvious positional constraint.
</example>

<example>
Useful declaration documentation:

```ts
/**
 * Returns `null` for private profiles instead of propagating the upstream authorization error.
 */
export async function getProfile(): Promise<Profile | null> {
  // ...
}
```

The documentation explains caller-visible behavior that the type alone cannot communicate.
</example>

</examples>

## TODO, FIXME, NOTE, and similar markers

Treat TODO, FIXME, NOTE, HACK, XXX, and equivalent markers as comments, not exceptions.

Verify that each one is still relevant, technically accurate, useful, and actionable when appropriate. Follow repository conventions for issue references or ownership when such conventions actually exist.

Remove stale, completed, meaningless, or superseded markers.

Do not add a marker prefix merely to make an ordinary comment appear important.

Do not implement unrelated work solely to remove a valid marker.

## Commented-out code

Commented-out executable code is normally dead code.

Delete it when version control already preserves the history and there is no current reason for the disabled code to remain.

Retain it only when the disabled form serves a current supported purpose, such as a deliberate copyable example, a semantically significant fixture, a documented compatibility fallback that maintainers are expected to re-enable under a known condition, or tooling/framework syntax that must remain disabled in source form.

Do not preserve commented-out code merely because it might be useful later.

Do not uncomment or execute old code solely to justify keeping it.

## Technically significant directives and headers

Preserve constructs whose presence, position, or exact syntax has technical, tooling, generation, runtime, or legal significance, including applicable:

- Shebangs
- Lint and formatter directives
- Compiler and type-checker directives
- Coverage directives
- Build tags and pragmas
- Framework directives
- Bundler or optimizer annotations
- Source-map and sourceURL directives
- Generated markers
- Required annotations
- Encoding declarations
- Licensing and copyright headers
- Other machine-consumed comments

These are not ordinary prose comments. Do not apply prose formatting rules to their syntax, and preserve technically required punctuation exactly.

### Stale directives

Technically significant directives are protected only while they remain necessary.

When practical, verify whether suppressions and other tooling directives are still required. Remove a directive when repository evidence or the relevant tooling proves it obsolete.

Do not remove or rewrite an unfamiliar directive merely because its purpose is unclear. Verify it first.

Do not broaden a suppression. Only narrow or remove one when the change is clearly safe, directly related to the audit, and does not require unrelated refactoring.

Treat legal headers more conservatively than tooling directives. Do not remove or alter licensing or copyright text without clear project authority.

## Durable references and links

A bare issue, pull request, specification, or documentation URL is not automatically useful commentary.

Retain or add a reference only when it materially preserves non-obvious context that cannot be expressed clearly enough in the code alone.

Prefer concise durable context plus a stable reference when the external source contains important details that would be unreasonable to duplicate.

Do not rely on transient conversation context or an inaccessible review thread as the only explanation for surprising code.

## Editing existing code

Treat existing comments as untrusted. Surviving previous cleanup passes does not make a comment correct or necessary.

When code changes make commentary inaccurate or redundant, update or remove it in the same change.

Do not narrate change history with phrases such as `now`, `previously`, `new approach`, `old behavior`, or `no longer`.

Document the durable state instead.

Do not address the reviewer or refer to the current conversation, prompt, diff, pull request, or implementation process.

## Interaction with prose-refinement skills

When a prose-refinement skill such as `unslop` is available, `lean-comments` remains authoritative.

Use prose refinement only after determining that the commentary deserves to exist.

The order is:

1. Determine necessity
2. Delete if unnecessary
3. Determine the correct comment form
4. Minimize the information
5. Refine the wording

Refinement may improve clarity, naturalness, and readability, but must not introduce personality or voice for its own sake, rhetorical flourish, humor, conversational filler, additional rationale, additional examples, additional claims, increased verbosity, or information that was not already justified.

Prefer the shortest natural wording that preserves the necessary technical meaning.

Do not allow a prose-refinement skill to weaken this skill's requirements for necessity, minimalism, accuracy, durability, or style.

A polished unnecessary comment is still unnecessary.

## Normal implementation work

When adding or modifying code:

- Do not add comments by default
- Add one only when it passes the necessity test
- Apply this skill to commentary directly affected by the implementation
- Remove commentary made obsolete by the change
- Do not perform an unrelated repository-wide comment cleanup unless requested

## Repository-wide audits

When explicitly asked to audit commentary throughout a repository:

1. Inspect enough of the repository to understand its terminology, architecture, languages, tooling, external constraints, and documentation conventions
2. Identify maintained first-party scope and exclude generated, vendored, dependency, third-party, and externally maintained content
3. Search systematically for all relevant comment, documentation, marker, directive, and commented-out-code forms used by the repository's languages
4. Review comments untouched by previous cleanup passes
5. Apply the necessity test before making wording changes
6. Review declaration documentation as critically as ordinary comments
7. Review commentary immediately preceding declarations for redundant labels or summaries
8. Review TODO, FIXME, NOTE, HACK, XXX, tooling directives, suppressions, and commented-out code
9. Inspect the final diff for accidental behavior, formatting, or unrelated changes
10. Search again for likely missed violations
11. Run relevant repository validation when source files or directives changed

For single-line prose comments, specifically inspect remaining comments ending in `.`, `!`, or `?`.

Do not blindly modify matches. Exclude technically significant syntax and comment-like text that is actually data.

For directives and suppressions, use the relevant tool when practical to distinguish required controls from stale ones.

## Scope boundaries

Apply this skill to maintained first-party source content.

Do not modify generated, vendored, dependency, third-party, externally maintained, or machine-generated content unless synchronization with an intentional source change requires it.

Do not introduce unrelated functional, architectural, behavioral, dependency, broad-formatting, or refactoring changes.

Keep the resulting diff focused.

## Final acceptance check

Before completing a repository-wide audit, verify that:

- Every remaining ordinary comment contributes meaningful non-obvious information
- Obvious comments were deleted rather than polished
- Label comments, code narration, and bare warnings are gone
- Comments are as concise as possible without becoming cryptic
- Single-line prose comments follow the style rules above
- Declaration documentation adds genuine contract or semantic information
- Plain data declarations are not decorated with useless documentation
- Types and signatures are not repeated unnecessarily
- No rationale or history was invented
- Stale TODO, FIXME, NOTE, HACK, XXX, and equivalent markers are gone
- Unjustified commented-out code is gone
- Required machine-significant constructs remain intact
- Proven-stale tooling directives and suppressions are gone
- Runtime-visible documentation was not removed without checking its contract
- Comment-like data was not mistaken for source commentary
- No unrelated changes were introduced
- Relevant validation passes

If a repository-wide cleanup still consists mainly of wording or punctuation changes while almost all original comments survive, re-evaluate necessity.

Do not optimize for a target number or percentage of comments.

Stop when further deletion or shortening would remove genuinely useful information rather than merely reduce comment count.

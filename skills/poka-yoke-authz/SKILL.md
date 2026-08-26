---
name: poka-yoke-authz
description: >-
  Multi-tenant isolation, IDOR and row-level security. Use to find every path where one tenant could read or write another tenant data: "we forgot to filter by org_id", "can users see each other data", "audit these endpoints for cross-tenant leaks", "make an unscoped query impossible". Covers scoped repositories, RLS, default-deny routing and the two-tenant test. For what the UI shows use ux.
license: MIT
---

# Poka-Yoke for Authorization

Cross-tenant data leaks are almost never caused by a wrong access-control decision. They are
caused by *no decision at all*: a query that is correct except it lacks `WHERE tenant_id = ?`,
an endpoint that loads by ID without checking who is asking. The developer did not choose
wrongly; they forgot, in one of the two hundred places the check was required.

That is the signature of a poka-yoke problem: a step that must be performed every single time,
by a human, with nothing enforcing it. The fix is never "be more careful in code review," and
it is never a checklist. **The fix is to make the unscoped query unwritable.**

## Building, not reviewing

Most of the time this mode is reached *while someone is building the thing*, not afterwards.
That changes the deliverable. They asked for the scoping, so produce the scoping, working, complete,
in their stack. Do not hand back a severity table when the person is mid-feature; a list of
findings about code they have not written yet is not useful to them.

Then add a short closing note, three or four lines, covering:

- which misuses the shape you chose makes impossible, and at which rung,
- what you left possible on purpose, and why that tradeoff is the right one here.

That closing note is what stops the device being undone in six months by someone who cannot
see why it is there. It is also the difference between mistake-proofing and a code generator:
the reasoning travels with the code.

When the code already exists and they are asking what is wrong with it, switch to the audit
voice, ranked findings with the mistake, the consequence, and the device. Match the mode to
where they are in the work, not to this file's default.

## The one principle: unsafe should be hard to say

Right now, in most codebases, the unsafe form is the *short* form:

```python
user = db.query(User).filter(User.id == user_id).first()          # unscoped: 1 line
user = db.query(User).filter(User.id == user_id,
                             User.tenant_id == current_tenant).first()   # safe: longer
```

Every incentive points at the first line, and it works perfectly in every test, because tests
usually have one tenant. Invert it so the safe form is the default and the unsafe form
requires deliberate, visible effort:

```python
user = tenant_db.users.get(user_id)     # tenant scope baked in; cannot be omitted
user = db.unscoped().users.get(user_id) # possible, greppable, reviewable, rare
```

Everything below is a variation on that inversion. When you audit, the question is not "is
this query scoped?" but "**could an unscoped query even be written here?**"

## Devices, strongest first

### 1. Database row-level security (Control, and the one with the widest reach)

RLS enforces the predicate in the database, so it applies to every query from every service,
every migration, every script, and every engineer with a psql shell. It is the only device
that protects you from code paths you did not write. Its reach stops only at roles that are
exempt from policies: superusers, roles with `BYPASSRLS`, and the table owner unless you force
the policy on.

```sql
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;   -- applies to the table owner too

CREATE POLICY tenant_isolation ON documents
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

The catch that turns this into a false sense of security: the connection must set
`app.tenant_id` reliably, and a pooled connection that carries a previous request's setting is
a cross-tenant leak with extra steps. Set it per-transaction, and make the middleware that sets
it the only path to a connection. `FORCE ROW LEVEL SECURITY` matters too, without it the
table owner bypasses the policy, and your application user is often the owner.

### 2. Scoped repositories (Control at the type level)

Make the tenant a required constructor argument, so no repository exists without one:

```ts
class DocumentRepo {
  // No default. There is no way to construct this without a tenant.
  constructor(private readonly db: Db, private readonly tenant: TenantId) {}

  async byId(id: DocumentId): Promise<Document | null> {
    return this.db.documents.findFirst({ where: { id, tenantId: this.tenant } });
  }
}
```

The raw client is then confined to infrastructure code and lint-banned from handlers. The
device is not the `where` clause. It is that the handler has no way to reach a client that
lacks one.

### 3. Authorization in the type (Control)

Rather than loading an object and then checking it, make the check the only way to obtain it:

```ts
// Handlers accept Owned<Document>. There is no path to one that skips the check.
async function authorizeDocument(user: User, id: DocumentId): Promise<Owned<Document>>
```

A handler that takes `Owned<Document>` cannot receive an unauthorized document, so the check
cannot be forgotten: the compiler asks for it. This is the same move as parse-don't-validate,
applied to permission instead of shape.

### 4. Default-deny at the router (Control, cheap)

Require every route to declare its authorization explicitly, and refuse to start if any route
has not:

- A middleware that denies unless a route declares a policy, with a startup check that
  enumerates routes and fails the boot on any undeclared one. A new endpoint is then secure
  before anyone writes a line of it: the failure mode of forgetting becomes "the service
  won't start" rather than "the data is public."
- Public routes are explicitly marked. Making public the opt-in and private the default means
  forgetting fails closed.

### 5. Unguessable identifiers (defense in depth, not a device)

UUIDs and ULIDs instead of sequential integers raise the cost of enumeration, and they are
worth using. But an ID is not a permission, anyone who has ever seen the resource still has
the ID forever. Never treat unguessability as the control; it is a mitigation layered behind
one.

## Auditing for missing authorization

The high-yield sequence, in order:

1. **Find every path that loads by ID.** For each: where does the tenant or ownership
   constraint come from? If it comes from the request rather than from the session, that is a
   finding on its own, `tenant_id` in a request body is client-controlled.
2. **Grep for raw client use in handlers.** Anywhere the unscoped query builder is reachable
   from request-handling code is a place the mistake is available.
3. **Check the update and delete paths specifically.** Reads get the attention; writes get
   missed, and an unscoped `UPDATE ... WHERE id = ?` lets one tenant modify another's data.
4. **Check every non-primary path**: bulk endpoints, exports, search, webhooks, background
   jobs, admin tools, GraphQL resolvers on nested fields, and anything reached via an
   association (`document.comments` where the comment scope is assumed rather than enforced).
   Nested resolvers are a common blind spot because the parent was checked and the child
   inherits nothing.
5. **Check that admin is scoped too.** "Admin" usually means admin *of a tenant*; a global
   admin query in a tenant-facing endpoint is a leak.
6. **Ask what happens on a missing session**: does the query run with `tenant_id = None`, and
   what does that match? In SQL, `tenant_id = NULL` matches nothing; the dangerous failure is
   a query builder that drops a missing predicate and issues the query unscoped.

## The test that proves it

One test pattern is worth more than any number of unit tests here: **create two tenants, then
attempt every operation from tenant A against tenant B's resources, and assert 404 for all of
them.** Table-drive it over your route list so a new endpoint without a case is visible.

Two details matter. Assert **404, not 403**: a 403 confirms the resource exists, which leaks
membership. And make the test enumerate routes automatically where you can, so adding an
endpoint without isolation coverage fails rather than passes silently.

This is a Detection-rung device, and it is the one that tells you whether your Control-rung
devices actually work. Write it even when RLS is in place, especially then, since RLS failures
are silent and total.

## Reporting

Use the finding structure from `audit`. Blast radius for this class is
near-maximum, cross-tenant exposure is a breach, with disclosure obligations, so findings
here outrank almost everything else in an audit. Propose before changing anything, and be
precise about which device reaches Control: adding a `where` clause to one query fixes one
site, and the whole point is that there are two hundred.

---
name: supabase-rls-policies
description: 'Write, review, and test Supabase Row Level Security (RLS) policies so that one user cannot read or change another user''s rows. Use when creating or changing tables, policies, views, or security definer functions in a Supabase project, when reviewing a migration that touches RLS, or when asked to prove user isolation with pgTAP tests that sign in as two users.'
---

# Supabase RLS Policies

Write Row Level Security (RLS) policies for Supabase tables, then prove them with pgTAP tests that act as two different users. A policy is not finished until a test shows that a second user cannot read, change, delete, or create rows that belong to the first user.

## When to Use This Skill

- Creating a table in an exposed schema (by default `public`)
- Adding or changing a policy, a view, or a `security definer` function
- Reviewing a migration or pull request that touches RLS
- Answering whether users or tenants are isolated from each other

## Workflow

1. **List the access rules first.** For each table, write down which role (`anon` or `authenticated`) may run which operation (`select`, `insert`, `update`, `delete`) on which rows. Confirm the list with the user before writing SQL. Each rule gets one test.
2. **Write the migration.** Enable RLS, add one policy per operation, and index every column the policies filter on.
3. **Write a pgTAP test file** for the table under `supabase/tests/`, using the template below.
4. **Run `supabase test db`** and read every line of output.
5. **Break the policy on purpose, on a local database only.** Copy the test file and add a temporary policy with `using (true)` right after `begin;`, for example `create policy "tmp_open" on public.notes for select to authenticated using (true);`. Run `supabase test db` against the local stack from `supabase start`, confirm at least one test fails, then delete the copy. Do the same with a temporary `for update` and a `for delete` policy. The file ends with `rollback`, so the temporary policy is undone even when the run fails or stops early. Never put a temporary policy in a migration, and never run this against a shared or production database. Do not drop the real policy to do this: with no policy every read is denied, so denial tests still pass and prove nothing.
6. **Do not change a policy just to make a test pass.** Report which assertion failed and which policy it covers, and let the user decide which one is wrong.

## Rules for Every Table

### Enable RLS and name the role

- Run `alter table ... enable row level security` on every table in an exposed schema. Once RLS is on and no policy exists, the API returns no rows.
- Add a `to` clause to every policy. Without it the policy applies to `PUBLIC`, which means every role, including `anon`.
- `auth.uid()` returns `null` when the request has no signed in user. `to authenticated` keeps anonymous requests from reaching the check at all.

### One policy per operation, with the owner checked on writes

```sql
alter table public.notes enable row level security;

create policy "notes_select_own" on public.notes
  for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy "notes_insert_own" on public.notes
  for insert to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "notes_update_own" on public.notes
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "notes_delete_own" on public.notes
  for delete to authenticated
  using ((select auth.uid()) = owner_id);

create index notes_owner_id_idx on public.notes using btree (owner_id);
```

- `using` checks rows that already exist. `with check` checks the row being written. Rows that fail `using` are skipped with no error; a row that fails `with check` raises an error.
- **Bind the owner column in every insert and update check.** A check such as `auth.uid() is not null` only proves the caller is signed in. Any signed in user can then insert a row with another user's id in the owner column.
- A column default such as `default auth.uid()` does not protect the owner column. Postgres uses a default only when the insert does not supply a value, and the client can always supply one.
- An `update` needs a matching `select` policy, or the update will not work as expected.
- Wrap `auth.uid()` and `auth.jwt()` in `(select ...)` so Postgres runs them once per statement instead of once per row.
- Index every column a policy filters on. A column counts as indexed only when it is the first column of a btree index.

### Authorization data in the token

- Never base a policy on `user_metadata` (`raw_user_meta_data`). Signed in users can change it themselves.
- Store roles, teams, and plans in `app_metadata` (`raw_app_meta_data`), which users cannot change, and read it with `auth.jwt()`.
- A change to `app_metadata` reaches `auth.jwt()` only after the user's token is refreshed. A user removed from a team keeps access until then.

### Multi factor authentication

To require a second factor, add a restrictive policy:

```sql
create policy "notes_require_aal2" on public.notes
  as restrictive
  for all to authenticated
  using ((select auth.jwt()->>'aal') = 'aal2');
```

Restrictive policies only narrow access. A table with only restrictive policies returns no rows, so keep the permissive policies above.

### Views

Views bypass RLS by default because they run with the rights of the role that created them. On Postgres 15 and later, create views with `security_invoker = true`:

```sql
create view public.my_notes
  with (security_invoker = true)
  as select id, body from public.notes;
```

On older versions, remove every grant path or keep the view in a schema that is not exposed. Revoking only the direct grants is not enough: a grant to `PUBLIC`, a grant to a role the API roles are members of, or a grant on a single column still lets them read the view. Check the result with `has_any_column_privilege`, which counts all three; `relacl` lists only direct table grants.

```sql
revoke all on public.my_notes from public, anon, authenticated;
select has_any_column_privilege('anon', 'public.my_notes', 'select'),
       has_any_column_privilege('authenticated', 'public.my_notes', 'select');  -- both must be false
```

### Security definer functions

- A `security definer` function runs as its owner. If the owner is `postgres`, it bypasses RLS.
- Never create one in an exposed schema. It can be called over the Data API with the owner's rights.
- Set `search_path = ''` and schema qualify every name inside the function.

### Keys

- Secret keys (and the legacy `service_role` key) bypass RLS. Use them only on a server, never in a browser or mobile app.
- A secret key bypasses RLS only when the request has no user access token. If the request carries one, that user's policies apply.

## Two User pgTAP Test Template

Save as `supabase/tests/notes_rls_test.sql` and adapt the table, columns, and ids. The file runs in one transaction and rolls back, so test data never persists.

```sql
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

-- Two users, created before switching roles.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'user1@test.com'),
  ('22222222-2222-2222-2222-222222222222', 'user2@test.com');

insert into public.notes (id, owner_id, body) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'user 1 note');

-- As user 1: the owner can read and change their own row.
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select results_eq(
  $$select body from public.notes where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  $$values ('user 1 note'::text)$$,
  'user 1 reads their own note'
);

select results_eq(
  $$update public.notes set body = 'edited' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' returning body$$,
  $$values ('edited'::text)$$,
  'user 1 updates their own note'
);

-- As user 2: every attempt on user 1's row must fail.
-- User 2 owns no rows yet, so the write probes need no where clause.
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select is_empty(
  $$select 1 from public.notes where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  'user 2 cannot read user 1 note'
);

select is_empty(
  $$update public.notes set body = 'changed' returning 1$$,
  'user 2 cannot update user 1 note'
);

select is_empty(
  $$delete from public.notes returning 1$$,
  'user 2 cannot delete user 1 note'
);

select throws_ok(
  $$insert into public.notes (owner_id, body) values ('11111111-1111-1111-1111-111111111111', 'forged')$$,
  '42501', null,
  'user 2 cannot create a note owned by user 1'
);

select results_eq(
  $$insert into public.notes (owner_id, body) values ('22222222-2222-2222-2222-222222222222', 'user 2 note') returning owner_id$$,
  $$values ('22222222-2222-2222-2222-222222222222'::uuid)$$,
  'user 2 creates their own note'
);

-- No where clause: the update policy alone picks user 2's row,
-- so only its with check can stop the transfer.
select throws_ok(
  $$update public.notes set owner_id = '11111111-1111-1111-1111-111111111111'$$,
  '42501', null,
  'user 2 cannot hand their note to user 1'
);

select * from finish();
rollback;
```

Notes on the template:

- Use `returning` on writes. An update or delete that RLS filters out succeeds with zero rows, so only the returned rows show what happened.
- In user 2's update and delete probes, do not filter on a column or return one. When an update or delete reads a column, Postgres applies the `select` policy as well, so a correct `select` policy can hide an `update` or `delete` policy that is too open. Return the constant `1` and rely on user 2 owning no rows yet.
- Filter reads by the ids the test inserted. A count over the whole table breaks once other data exists.
- Error `42501` is the code Postgres raises when a written row fails a `with check` expression.
- Add an `anon` case for any table that anonymous visitors must not read, and add one to the plan count. Replace the claims first: changing the role does not clear them, so `auth.uid()` would still return user 2's id.

  ```sql
  set local request.jwt.claims = '{"role": "anon"}';
  set local role anon;
  select is_empty(
    $$select 1 from public.notes where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
    'an anonymous visitor cannot read user 1 note'
  );
  ```

  If your project does not grant table privileges to `anon`, the read raises `42501` instead, so use `throws_ok`.

## Testing Policies That Read Other Claims

The template sets the whole claims object in `request.jwt.claims`, the setting PostgREST fills from the token. `auth.uid()` and `auth.jwt()` both read it. If a test sets only `request.jwt.claim.sub`, `auth.uid()` still works but `auth.jwt()` returns `null`, so a policy that compares a claim such as `aal` or a value in `app_metadata` sees `null`. The `aal2` policy above denies every user in that state, so a test that expects a denial passes for the wrong reason.

For a table with the restrictive `aal2` policy, add `"aal": "aal2"` to the claims at both user switches in the template, so the owner checks still pass. Then test the other side before `select * from finish();`, and add these two assertions to the plan count:

```sql
-- If the anon case ran first, the SQL role is still anon. The role claim in the JSON does not change it.
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "aal": "aal1"}';
select is_empty(
  $$select 1 from public.notes where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  'an aal1 session cannot read user 1 note'
);

set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "aal": "aal2"}';
select isnt_empty(
  $$select 1 from public.notes where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  'an aal2 session reads user 1 note'
);
```

## Review Checklist

- [ ] RLS is enabled on every table in an exposed schema
- [ ] Every policy names a role with `to`
- [ ] Insert and update checks bind the owner column to `(select auth.uid())`
- [ ] No policy reads `user_metadata`
- [ ] Views use `security_invoker = true`, or are not exposed
- [ ] Security definer functions live outside exposed schemas and set `search_path = ''`
- [ ] Each policy column has an index that leads with that column
- [ ] Each user data table has a two user test covering read, update, delete, and insert
- [ ] The second user's update and delete probes read no column
- [ ] Tests set the full `request.jwt.claims` object at each user switch, and replace it before the `anon` case
- [ ] The suite fails when a temporary `using (true)` policy is added inside the test transaction on a local database

## References

- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security), Supabase docs
- [Test Row Level Security policies with pgTAP](https://supabase.com/docs/guides/database/postgres/testing-row-level-security), Supabase docs
- [Multi-Factor Authentication](https://supabase.com/docs/guides/auth/auth-mfa), Supabase docs
- [CREATE POLICY](https://www.postgresql.org/docs/current/sql-createpolicy.html), PostgreSQL docs
- [Transactions](https://docs.postgrest.org/en/stable/references/transactions.html), PostgREST docs (`request.jwt.claims`)
- [CREATE TABLE](https://www.postgresql.org/docs/current/sql-createtable.html), PostgreSQL docs (column defaults)
- [auth.uid() source](https://github.com/supabase/auth/blob/35307ce6c1ca59016fd820f1d77d9b6201dc2e15/migrations/20220224000811_update_auth_functions.up.sql) and [auth.jwt() source](https://github.com/supabase/auth/blob/35307ce6c1ca59016fd820f1d77d9b6201dc2e15/migrations/20220531120530_add_auth_jwt_function.up.sql), Supabase Auth

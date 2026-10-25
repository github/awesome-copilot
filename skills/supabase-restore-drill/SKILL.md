---
name: supabase-restore-drill
description: 'Check that a Supabase Postgres backup actually restores. Restores a pg_dump archive into a throwaway local Postgres container with the Supabase roles, auth helper functions and extensions schema stubbed in, compares tables, row counts and schema objects with the live project, and sorts every restore error into expected or real. Use when someone asks whether their Supabase backups work, wants a restore test or restore drill, or is about to rely on a dump for recovery.'
---

# Supabase restore drill

A dump that has never been restored is a guess. This skill restores a Supabase database dump into a disposable Postgres container, checks what came back against the live project, and lists what a real recovery would still have to do by hand.

It never writes to the Supabase project. The only database it changes is a container it starts for the drill.

## Ground rules

- Restore only into the container started in step 4, bound to `127.0.0.1`. Never point `pg_restore` or `psql -f` at the user's Supabase project or at any database that already existed.
- The dump and the sandbox hold production data. Keep them on this machine and delete both at the end.
- Keep passwords off the command line and out of files. Read them with `read -rs` into `PGPASSWORD`.
- Don't judge the drill by pg_restore's exit code or by the fact that it finished. By default pg_restore carries on after an error, so a run that ends normally can still be missing whole tables and their data. Every `ERROR:` line in the log has to be explained.

## 1. Work out what kind of backup it is

| What the user has | What to do |
|---|---|
| A file for which `pg_restore --list FILE` prints a table of contents (custom format from `pg_dump -Fc`; the extension varies: `.dump`, `.pgcustom`, `.backup`) | Steps 2 to 7 |
| A plain SQL file. `pg_restore --list` answers `input file appears to be a text format dump. Please use psql.` | Steps 2 to 7, restoring with `psql` (step 5) |
| `roles.sql`, `schema.sql` and `data.sql` from `supabase db dump` | These expect Supabase's own roles and schemas, so a bare Postgres is the wrong target. Start a local stack with `supabase start` (database at `postgresql://postgres:postgres@localhost:54322/postgres`), load the files with the `psql --single-transaction --variable ON_ERROR_STOP=1 ...` command from Supabase's "Backup and Restore using the CLI" guide, then do steps 6 and 7 |
| `db_cluster.backup` downloaded from the dashboard | Supabase's documented local route: `supabase init`, write the Postgres version shown after `PG:` on the backups page into `supabase/.temp/postgres-version`, then `supabase db start --from-backup db_cluster.backup`. Then steps 6 and 7 |
| Only Supabase's own daily backups | These can only be restored inside Supabase (in place, or into a new project). Projects on the physical backup process (Postgres 15.8.1.079 and newer, or with PITR) can't download them at all. Take a dump first (step 2) |

## 2. Record the source and take a dump

Use the Session pooler connection string from the dashboard (Connect, then Session pooler). The direct `db.<ref>.supabase.co` host needs IPv6 unless the project has the IPv4 add-on.

pg_dump must be at least the server's major version. Check both first:

```bash
read -rs PGPASSWORD && export PGPASSWORD   # database password, kept out of shell history
SOURCE_URL="postgresql://postgres.<project-ref>@<pooler-host>:5432/postgres"
psql "$SOURCE_URL" -Atc 'show server_version'
pg_dump --version
```

An older pg_dump stops with `aborting because of server version mismatch`.

If the user has no dump yet:

```bash
pg_dump "$SOURCE_URL" --format=custom --schema=public --file=public.dump
```

`--schema=public` is what most app backups contain, and the rest of this skill assumes it. It leaves out `auth`, `storage` and `extensions`, and it never includes `CREATE EXTENSION`. If the app keeps tables in other schemas of its own, add one `--schema=` per schema and check those as well.

Save these two queries as `rowcounts.sql` and `objects.sql`. Run them against the source right after the dump, so writes made later don't show up as differences:

```sql
-- rowcounts.sql: exact row count per table (estimates from pg_class are not good enough here)
select table_schema || '.' || table_name,
       (xpath('/row/c/text()', query_to_xml(
          format('select count(*) as c from %I.%I', table_schema, table_name),
          false, true, '')))[1]::text::bigint
from information_schema.tables
where table_schema = 'public' and table_type = 'BASE TABLE'
order by 1;
```

```sql
-- objects.sql: schema objects by kind; extension-owned functions are left out
select 'tables', count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p')
union all select 'views', count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('v', 'm')
union all select 'functions', count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and not exists (
    select 1 from pg_depend d
    where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
union all select 'indexes', count(*) from pg_indexes where schemaname = 'public'
union all select 'constraints', count(*) from pg_constraint k join pg_namespace n on n.oid = k.connamespace
  where n.nspname = 'public'
union all select 'policies', count(*) from pg_policies where schemaname = 'public'
union all select 'triggers', count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and not t.tgisinternal;
```

```bash
psql "$SOURCE_URL" -AtF ' ' -f rowcounts.sql > source-rows.txt
psql "$SOURCE_URL" -AtF ' ' -f objects.sql > source-objects.txt
```

If the dump is older than today, compare anyway and expect drift on tables that have changed since. A missing table, or a table that is empty in the restore but has rows at the source, is still a failure.

## 3. Check the file before restoring

```bash
shasum -a 256 public.dump    # compare with the checksum recorded at backup time, if there is one
pg_restore --file=/dev/null public.dump && echo "archive reads to the end"
```

`pg_restore --list` is not an integrity check. It only reads the table of contents at the start of the file, so it succeeds on a truncated archive. Writing the whole archive to `/dev/null` reads every data block and fails with `could not read from input file: end of file` when the file is cut short.

Next, find what the dump needs from outside `public`:

```bash
pg_restore --schema-only --file=- public.dump \
  | grep -oE '\b(auth|extensions|storage|supabase_functions|vault|net|cron)\.[A-Za-z_]+' \
  | sort | uniq -c
```

Typical output names `auth.uid`, `auth.users`, `extensions.gen_random_uuid`, `extensions.vector` and `extensions.gin_trgm_ops`. List the source's extensions so you know which ones to install:

```sql
select e.extname, n.nspname as schema, e.extversion
from pg_extension e join pg_namespace n on n.oid = e.extnamespace
order by 1;
```

## 4. Start and prepare the sandbox

Use the source's major version. If the dump uses `vector`, use an image that ships pgvector.

```bash
docker run -d --name restore-drill -e POSTGRES_PASSWORD=drill \
  -p 127.0.0.1:55432:5432 postgres:17        # or pgvector/pgvector:pg17
until docker exec restore-drill pg_isready -h 127.0.0.1 -U postgres -q; do sleep 1; done
DRILL_URL="postgresql://postgres:drill@127.0.0.1:55432/postgres"
```

Keep the `-h 127.0.0.1` on `pg_isready`. On first start the image runs a temporary server that only listens on a Unix socket, and a plain `pg_isready` can report ready before the real server is up.

Save this as `sandbox-prep.sql` and run it once with `psql "$DRILL_URL" -v ON_ERROR_STOP=1 -f sandbox-prep.sql`:

```sql
-- Fresh container only. The dump recreates public; dropping it first gets rid of the
-- "schema public already exists" error that would otherwise sit in every log.
drop schema public cascade;

-- Supabase platform roles that policies and grants refer to.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

-- Auth helpers used in policies and column defaults. Returning null is enough
-- for the objects that use them to be created.
create schema auth;
create function auth.uid()   returns uuid  language sql stable as $$ select null::uuid $$;
create function auth.role()  returns text  language sql stable as $$ select null::text $$;
create function auth.jwt()   returns jsonb language sql stable as $$ select null::jsonb $$;
create function auth.email() returns text  language sql stable as $$ select null::text $$;

-- Supabase puts extensions in a schema called "extensions", and dumps refer to them
-- by that name (extensions.gen_random_uuid(), extensions.vector(1536)).
-- Create the ones step 3 found, in that same schema.
create schema extensions;
create extension pgcrypto with schema extensions;
create extension pg_trgm  with schema extensions;
-- create extension vector with schema extensions;   -- needs the pgvector image
```

What happens without this, from a Supabase-shaped dump restored into a bare `postgres:17` container: a table whose column default calls `auth.uid()`, or whose column type is `extensions.vector`, is never created, so its `COPY` fails and its rows are skipped. Policies `TO authenticated` fail, and indexes on `extensions.gin_trgm_ops` fail. In that test pg_restore reported 18 ignored errors and two of the five tables were missing.

Don't create `auth.users`. A public-only dump has no users, so an empty `auth.users` would only make the foreign key check fail on every row. Leaving the table out keeps it to one known error (step 6).

## 5. Restore and time it

```bash
time pg_restore --dbname="$DRILL_URL" --no-owner --no-privileges public.dump 2> restore.log
grep -c 'ERROR:' restore.log
```

`--no-owner --no-privileges` is needed because the dump's owners and grants name roles such as `supabase_admin` that the sandbox doesn't have. It also means this drill doesn't test grants. For a big dump add `--jobs=4`. The errors then come out interleaved, and the "errors ignored on restore" total at the end can differ from the number of `ERROR:` lines, so go by the lines.

For a plain SQL dump: `psql "$DRILL_URL" -f public.sql 2> restore.log`. Without `-v ON_ERROR_STOP=1`, psql exits 0 even when statements fail, so the log is the only record of what went wrong.

## 6. Check what came back

### Sort every error

Read each `ERROR:` line in `restore.log` together with the `Command was:` text that follows it (pg_restore leaves it out for some statements, such as `CREATE TABLE`) and place it in one of these rows. Anything that fits no row is a real failure until someone explains it.

| Error | Statement | What it means | Verdict |
|---|---|---|---|
| `relation "auth.users" does not exist` | `ALTER TABLE ... ADD CONSTRAINT ... REFERENCES auth.users` | Foreign key to Supabase Auth users. The table and its rows restored; only the constraint is missing | Expected in the sandbox. A real restore needs the users first (step 7) |
| `relation "auth.users" does not exist` | `CREATE VIEW`, or `CREATE FUNCTION ... BEGIN ATOMIC` | The object reads `auth.users` and can't exist without it | Expected in the sandbox, but the object is missing. Name it in the report |
| `schema "supabase_functions" does not exist` | `CREATE TRIGGER ... supabase_functions.http_request(...)` | A Database Webhook trigger | Expected in the sandbox. In a new project, turn on Database Webhooks before restoring |
| `schema "auth" does not exist`, `function auth.uid() does not exist`, `role "authenticated" does not exist`, `role "anon" does not exist` | Any | The stubs from step 4 are missing | Fix the sandbox and run the drill again |
| `schema "extensions" does not exist`, `type "extensions.vector" does not exist`, `function extensions.gen_random_uuid() does not exist`, `operator class "extensions.gin_trgm_ops" does not exist for access method "gin"` | Any | An extension isn't installed in the sandbox | Install it into `extensions` and run again |
| `relation "public.<table>" does not exist` | `COPY`, `ALTER TABLE`, `CREATE INDEX`, `CREATE POLICY`, `CREATE TRIGGER` | Knock-on error: that table's `CREATE TABLE` failed earlier, usually for one of the reasons above | Find the first error for that table |

### Compare with the source

```bash
psql "$DRILL_URL" -AtF ' ' -f rowcounts.sql > drill-rows.txt
psql "$DRILL_URL" -AtF ' ' -f objects.sql > drill-objects.txt
diff source-rows.txt drill-rows.txt
diff source-objects.txt drill-objects.txt
```

The drill passes only if:

- every source table exists in the sandbox, with the same row count (allow drift only on tables written to after the dump);
- no table that has rows at the source is empty in the sandbox;
- each difference in `objects.sql` matches an object named in an expected error. In the test fixture the sandbox had one view, one function, one constraint and one trigger fewer than the source: three `auth.users` errors and one Database Webhook trigger.

### Functions that will fail later

Dumps run with `check_function_bodies = false`, so a function whose body reads `auth.users` (or any other table the dump doesn't have) restores without an error and fails the first time it's called. `BEGIN ATOMIC` bodies are the exception: Postgres checks them at creation, so they already show up in the log. Find the rest:

```sql
select p.oid::regprocedure
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosrc ~ '\mauth\.users\M';
```

List them in the report, and call the ones the app depends on.

### App checks

Ask the user for two or three things that must be true of their data, and query them in the sandbox: no orphaned rows, a total that should match, the newest row being recent. You are connected as a superuser, which bypasses row-level security, so these checks cover data, not policies.

## 7. Report and clean up

Report in this shape:

```text
Restore drill, <date>
Dump:     public.dump, <size>, sha256 <first 12 hex>, taken <time>
Source:   Postgres <version>, <n> tables, <n> rows
Restore:  <seconds> s into postgres:<major>; <n> errors (<n> expected, <n> real)
Checks:   tables present  PASS/FAIL
          row counts      PASS/FAIL
          non-empty       PASS/FAIL
          objects         PASS/FAIL (missing objects and why)
          app checks      PASS/FAIL
Not covered: <list below>
```

Always include what this drill doesn't cover, and what a real restore into a new Supabase project has to do by hand:

- Auth users live in the `auth` schema, not in a public dump. Copy `auth.users` and `auth.identities` into the new project before restoring `public`, or every foreign key to `auth.users` fails.
- Triggers on `auth.users`, such as one that inserts a profile row on sign-up, belong to that table, so they aren't in the dump. Recreate them after the restore.
- Storage files aren't in the database; Supabase's own backups only keep their metadata. They need a backup of their own.
- Also outside this drill: grants and revokes (skipped by `--no-privileges`), row-level security behavior, Edge Functions, secrets, Auth settings, Realtime publications, and the passwords of custom roles.
- Restore into an empty new project, and don't use `pg_restore --clean` there. Dropping and recreating `public` on Supabase loses its default grants to `anon` and `authenticated`, and the API returns 401 until they are granted again.

Then remove everything the drill created:

```bash
docker rm -f -v restore-drill
rm -f public.dump restore.log source-*.txt drill-*.txt
```

## Running it on a schedule

A single drill proves a single dump. For a recurring check, the MIT-licensed [backupdrill](https://github.com/backupdrill/cli) CLI (`npm install -g backupdrill`; needs Node.js 20 or newer and Docker) automates steps 3 to 6 for backups it takes itself. `backupdrill backup` writes a dump and a checksummed manifest to your own S3, R2 or B2 bucket, and `backupdrill drill` restores the latest snapshot into a throwaway container with the same Supabase stubs and checks it against the manifest. It doesn't drill dump files made by other tools. Disclosure: the author of this skill maintains that CLI.

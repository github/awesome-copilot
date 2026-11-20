# FlowStudio MCP: Recovering from a Broken Head

The failure: an authoring or validation session saves a near-empty app (one
placeholder screen, the real controls gone) as an `Autosaved` head. The
published app keeps running, Studio would open the empty draft, and every push
is refused with base-moved. Seen on a real app in August 2026; the recovery
below worked then.

---

## 1. Find Out What Was Damaged (Read Only)

- `list_canvas_app_versions`: the damage is draft-only if the `isLive: true`
  row is an older, healthy version.
- Note the newest healthy version, usually the refusal's `sessionBasedOn`.
  It may be newer than the live one (unpublished drafts sit in between), and
  restoring the live one instead would drop those drafts. Check it with a diff
  against the broken head.
- `get_canvas_app_files` at the broken head's version: a collapsed app has far
  fewer `Controls/<n>.json` files than the good version.
- `diff_canvas_app from=<good> to=<broken>`: read `screensRemoved` and the
  file list as well as the summary counts. Controls inside a removed screen
  may not be counted, and a warning about unreadable screens means the diff
  is incomplete.

---

## 2. Do Not Overwrite, Replay, Push or Publish

An overwrite push rebuilds from the current head and applies your staged
files on top. With a broken head, every file you did not stage comes from the
broken app, so pushing "just my screen" this way deletes the rest of it. A
replay is no better: a session opened on the broken head builds on it. And
`publish_canvas_app` publishes the newest version, so it would make the broken
head live. Overwrite is only safe when the head is good: it keeps the head's
content in every file you did not stage, and replaces the head's copy of any
file you did stage.

---

## 3. Put the Good Version Back as the Head

The canvas tools have no restore operation (checked 2026-11-20). The platform
API can do it:

```http
POST https://api.powerapps.com/providers/Microsoft.PowerApps/apps/{appId}/versions/{goodVersionId}/promote?api-version=2021-02-01
Authorization: Bearer <token for resource https://service.powerapps.com/>
```

What this call does is not settled. Earlier work on a real app saw it make a
new head with the good version's content. The server's own design notes say
promote moves the live pointer instead, without making a new version, which
would also change what users run. So ask the person before calling it, and
say that it may change the version their users run. If they say no, they
restore the good version themselves (below). After the call, list versions
and confirm both that the head holds the good content and which row has
`isLive: true` before step 4.

If you have no token for that tenant, stop and ask the person to restore the
good version themselves, with Studio closed, then continue at step 4.

Things that go wrong:

- The token must come from the app's own tenant. A token from another tenant
  returns `ApplicationNotFound`, which reads like a bad app id.
- Old api-versions fail with `AppDataSetsNotEditable`; use 2021-02-01 or
  later.
- `409 AppLeaseActive` means something holds the app's edit lease: an open
  Studio tab, or a leftover authoring or validation tool (for example a local
  canvas authoring tool or Microsoft's canvas authoring MCP server). The lease
  keeps renewing while its holder runs and can outlive its documented expiry.
  Ask the person to close Studio and those tools; do not end processes
  yourself. Then retry about every 90 seconds; it usually clears within
  minutes of the last holder closing.
- Success returns 200. Check by listing versions and reading the head's file
  list, as above.

---

## 4. Rebuild and Ship

`discard_canvas_app_session`, then `get_canvas_app` to open a session on the
restored head. Send your edits again, push, publish, read back. Then tell the
person what caused or prolonged it (an authoring or validation tool left
running, an open Studio tab; see
[studio-coexistence.md](studio-coexistence.md)) without blaming them; the
tools should cope with normal Studio behavior.

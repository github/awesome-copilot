# Selection evidence and execution plans

Read this reference immediately before `create-plan` or when diagnosing a refused selection.

## Selection JSON

Create this file only in a system temporary directory after the read-only scan. All paths must exactly match `scan.json`; do not construct paths from globs or unresolved variables.

```json
{
  "baseline": "upstream/main",
  "branch_action": "keep",
  "backup_orphans": false,
  "targets": [
    {
      "path": "/absolute/path/to/repo-worktree-123",
      "ignored_paths_approved": false,
      "risk_acknowledged": false,
      "evidence": {
        "mapping_confidence": "strong",
        "harness_state": "inactive",
        "issue": {
          "provider": "github",
          "repository_url": "https://github.com/owner/repo",
          "url": "https://github.com/owner/repo/issues/123",
          "number": 123,
          "kind": "issue",
          "state": "closed"
        },
        "linked_change": {
          "kind": "pull_request",
          "number": 456,
          "url": "https://github.com/owner/repo/pull/456",
          "state": "merged"
        }
      }
    }
  ]
}
```

### Required semantics

- `baseline`: the matched remote's verified default or relevant target branch. It is mandatory when `branch_action` is `delete`.
- `branch_action`: `keep` or `delete`. Ask every time; recommend `keep`.
- `backup_orphans`: set true only when the user explicitly approved creation of deterministic backup branches for detached orphan commits.
- `mapping_confidence`: use `strong` only for the evidence types in `SKILL.md`. Other mappings require `risk_acknowledged: true` after the user selects the review item.
- `harness_state`: `inactive`, `not_managed`, `unknown`, or `active`. Active is always refused. Unknown requires explicit risk acknowledgement.
- `ignored_paths_approved`: true only after the user reviewed sensitive/unknown ignored paths.
- `risk_acknowledged`: records an explicit user choice for a reported review condition. It is not a bypass for dirty, active, locked, main/current, symlinked, or broad paths.
- `issue.kind`: `issue`, `pull_request`, or `merge_request`. An issue must be closed; a PR/MR must be merged.
- `linked_change`: optional. A non-merged linked change requires explicit risk acknowledgement and remains a review item.

## Plan lifecycle

`create-plan` rescans the repository, enforces local invariants, and writes a snapshot containing:

- repository common-dir identity;
- resolved baseline identity;
- exact path and resolved path;
- HEAD and branch/detached state;
- ignored-path fingerprint;
- branch action and any backup branch;
- estimated reclaimable bytes;
- a random `plan_id`.

Show the user the exact targets, branch behavior, backup operations, estimate, and `plan_id` before execution. The later execution call must repeat the exact ID with `--confirm-plan`.

`execute` rescans the whole batch before its first write. Any changed path, HEAD, branch, status, ignored-path set, retaining refs, baseline, lock/prunable state, or repository identity refuses the entire batch. Once execution begins, a mid-batch Git failure stops immediately; Git worktree removal is not atomic.

## Branch deletion

`branch_action: "delete"` is allowed only when each target HEAD is an ancestor of the selected baseline. Execution still uses `git branch -d`; a refusal is a safe failure. Never change the script to use `-D` as a convenience.

## Detached orphan backup

With explicit approval and `backup_orphans: true`, the plan assigns:

```text
worktree-cleanup/backup-YYYYMMDD-<12-char-sha>
```

The branch is created before removal and the command refuses to overwrite an existing ref.

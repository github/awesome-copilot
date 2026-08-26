# Claude Code hooks as poka-yoke devices

Instructions to an agent are rung zero: a line in CLAUDE.md saying "never force-push" is
training, and training degrades under long contexts, compaction, and subagents that never read
the file. A hook that denies the push is a device.

Rule of thumb for what to gate: **irreversible and outward-facing**. Git makes ordinary code
changes cheap to undo, so gating them produces an agent that spends its turns fighting the
harness and a user who switches the rules off. A rotated credential and a dropped table are
the real targets.

## 1. Deny rules, start here

The cheapest device, no scripting required. In `.claude/settings.json` (committed, so the rule
exists for everyone rather than only on the machine of whoever set it up):

```jsonc
{
  "permissions": {
    "deny": [
      "Bash(git push --force:*)",
      "Bash(git push -f:*)",
      "Bash(git commit --no-verify:*)",
      "Bash(git reset --hard:*)",
      "Read(./.env)",
      "Read(./.env.*)",
      "Edit(./.env)",
      "Read(./**/credentials)",
      "Edit(./migrations/**)",
      "Bash(terraform apply:*)",
      "Bash(terraform destroy:*)",
      "Bash(npm publish:*)",
      "Bash(gh repo delete:*)"
    ]
  }
}
```

Personal additions go in `.claude/settings.local.json`, which is gitignored.

## 2. Conditional guards, when the rule needs logic

Deny rules match patterns. When the decision depends on the *content* of the command: a
`DELETE` without a `WHERE`, a connection string pointing at production, use a hook script.

`guard_dangerous_commands.py` in this directory covers the common irreversible cases. Wire it
up in `.claude/settings.json`:

```jsonc
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash|Edit|Write|Read",
        "hooks": [
          {
            "type": "command",
            "command": "python3 \"${CLAUDE_PROJECT_DIR}\"/.claude/hooks/guard_dangerous_commands.py"
          }
        ]
      }
    ]
  }
}
```

Copy the script to `.claude/hooks/` in the target repo, hooks resolve against the project, not
against this plugin's cache directory, which changes on every plugin update.

**The deny message is the device, not the denial.** The agent reads the reason and acts on it,
so "denied" produces a creative workaround, often worse than the original command, while a
message naming the safe alternative produces the right action. Write them as you would write
an error message for a colleague.

## 3. Verification gates, make "done" mean something

An agent's characteristic failure is reporting success it did not achieve: "all tests pass"
when the suite was never run. A `Stop` hook converts the claim into a fact:

```jsonc
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'npm run typecheck && npm test || exit 2'"
          }
        ]
      }
    ]
  }
}
```

Only exit code 2 blocks. It stops the agent and feeds the hook's stderr back as the reason,
which is why the check is wrapped rather than run bare, `npm test` exits 1 on failure, and
any non-zero exit other than 2 is surfaced to the user as a hook error while the agent stops
anyway. Claude Code caps consecutive Stop-hook blocks at eight, so a check that can never pass
eventually releases instead of looping. This is usually the single highest-value hook in a
repo.

## 4. Test your hooks

Untested hooks fail open more often than you would expect: a regex that does not match the
real command string is a hook that does nothing while looking like protection, which is worse
than no hook at all because it creates confidence.

For each rule: run the blocked action and confirm both the denial *and* the message, then run
the legitimate neighbouring action and confirm it still works.

```bash
echo '{"tool_name":"Bash","tool_input":{"command":"git push --force origin main"}}' \
  | python3 guard_dangerous_commands.py
# expect: permissionDecision "deny" with a reason mentioning --force-with-lease

echo '{"tool_name":"Bash","tool_input":{"command":"git push origin main"}}' \
  | python3 guard_dangerous_commands.py
# expect: no output; the ordinary push is unaffected
```

## 5. Move CLAUDE.md rules into devices

Anything in CLAUDE.md that *can* be a check should be one. What remains should be facts the
agent needs, not rules you hope it follows.

| CLAUDE.md line | Device |
|---|---|
| "Always run `make fmt` before committing" | pre-commit hook |
| "Never use `any`" | lint rule at error, in a required check |
| "Don't edit generated files" | deny rule + a header in the generated file |
| "Use `pnpm`, not `npm`" | `PreToolUse` hook denying `npm install`, message naming pnpm |
| "Run tests before saying you're done" | Stop hook |
| "Never commit to main directly" | branch protection |

What legitimately stays as prose: architecture, domain vocabulary, where things live, why past
decisions were made. Facts, not commands.

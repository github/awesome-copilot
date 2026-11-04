---
name: npm-trusted-publishing
description: Set up or fix npm trusted publishing (OIDC) in GitHub Actions and remove NPM_TOKEN. Use for ENEEDAUTH, E404 on PUT, E422 repository.url, or migrating off 2FA-bypass tokens before January 2027.
---

# npm Trusted Publishing

Moves a GitHub Actions release from a stored `NPM_TOKEN` to npm [trusted publishing](https://docs.npmjs.com/trusted-publishers). GitHub signs a short-lived OIDC token for the run, and npm exchanges it for a publish token. It also diagnoses the misleading errors a half-finished migration produces. From January 2027, granular tokens that bypass 2FA can no longer publish directly ([npm docs](https://docs.npmjs.com/about-access-tokens/)).

## When to Use This Skill

- The user wants to remove `NPM_TOKEN` / `NODE_AUTH_TOKEN` from a release workflow or set up OIDC or provenance publishing.
- A CI publish fails with `ENEEDAUTH`, `404 Not Found - PUT https://registry.npmjs.org/...` or `E422 ... repository.url`.
- Release logs show `npm notice npm tokens that bypass 2FA are being restricted`.

## Checklist (all must hold)

Work through every item. Missing any one of them produces the errors above.

1. **OIDC permission:** the publishing job has `permissions: id-token: write`. If the job had no `permissions` block, keep the scopes it needs, such as `contents: write` for tags and releases or `pull-requests: write` for changesets. Adding a block drops every scope you don't list.
2. **npm 11.5.1 or newer** runs the publish. Node 24 ships it. Node 22 ships npm 10, so add `npm install -g npm@^11.5.1` (or a newer pinned major) before publishing. pnpm 10 hands the publish to npm, so the same rule applies. Yarn Berry needs 4.10.3+.
3. **No token reaches the publish step.** Remove `NODE_AUTH_TOKEN`, `NPM_TOKEN` and `YARN_NPM_AUTH_TOKEN` from the step, the job and the workflow `env`, and delete script lines that write `_authToken` or `npmAuthToken`. npm tries OIDC first but falls back to a configured token, so a leftover token keeps the old credential in use. Keep a **read-only** token only on install steps that need private packages.
4. **`actions/setup-node` has `registry-url: https://registry.npmjs.org`.**
5. **`package.json` `repository.url` names the same GitHub repo**, for example `git+https://github.com/OWNER/REPO.git`, plus `directory` for workspace packages. A mismatch gives E422.
6. **A trusted publisher exists on npm for each package** (npmjs.com → package → Settings → Trusted publishing), or with npm 11.15+:
   `npm trust github <pkg> --repo OWNER/REPO --file release.yml --allow-publish --yes`
   - The workflow **file name** must match exactly; it is case-sensitive and includes `.yml`.
   - For a **reusable workflow**, use the *calling* workflow's file name, and grant `id-token: write` in the caller too.
   - If the job uses `environment:`, set the same environment on the publisher.
   - A package that doesn't exist yet must be published once by hand first.
7. **GitHub-hosted runner.** Self-hosted runners can't use trusted publishing.

## Security Rules

- **Untrusted triggers:** never add `id-token: write` to a job in a workflow triggered by `pull_request_target`, `issue_comment`, `workflow_run` or `discussion`. It would let outsiders exchange an OIDC token and publish. Move publishing to `release`, `push` (tags) or `workflow_dispatch`.
- **Dry runs:** `npm publish --dry-run` and `npm pack` jobs don't publish, so they need no `id-token` and no trusted publisher.
- **The old token:** delete the secret (`gh secret delete NPM_TOKEN`) and revoke it on npmjs.com only after the first tokenless release succeeds.

## Error Guide

| Error | Usual cause |
|---|---|
| `ENEEDAUTH` | No `id-token: write`, npm older than 11.5.1, or a workflow file name that doesn't match the trusted publisher |
| `404 Not Found - PUT https://registry.npmjs.org/<pkg>` | Same as above, a mismatched `environment`, no trusted publisher yet, or an expired token still being used |
| `E422 ... repository.url` | `repository` is missing in `package.json` or names another repo |
| Publish still uses the token | A token remains in env, `.npmrc` or `.yarnrc.yml` (checklist item 3) |

## Example

```yaml
jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v6
        with:
          node-version: 24
          registry-url: https://registry.npmjs.org
      - run: npm ci
      - run: npm publish --access public   # no NODE_AUTH_TOKEN
```

## Automating It

[go-tokenless](https://github.com/Continuous-Actions/go-tokenless) (MIT) applies this checklist to an existing repository. Use it when the user wants the edits made for them.
- `npx go-tokenless` prints a read-only diff of the workflow and `package.json` changes, plus the `npm trust` commands.
- `npx go-tokenless apply` writes the changes.
- It refuses the unsafe cases above instead of guessing.

## Limitations

- The npm side (adding the trusted publisher, deleting the old token) needs the user's npm login with 2FA. Hand those steps to the user.
- Trusted publishing covers GitHub Actions, GitLab.com and CircleCI cloud only.

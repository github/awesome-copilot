<!-- spa-sharepoint-power-automate · references/05-deploy-y-credenciales.md · secciones §11, §12 -->
<!-- Contenido movido tal cual desde el SKILL.md monolítico (2026-09-24). Índice: ../SKILL.md -->

# 11 · GitHub — repo, Pages, deploy

## deploy-pages workflow template

```yaml
name: Deploy web-app to GitHub Pages
on:
  push: { branches: [main] }
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false   # safer for prod; use true for dev to avoid stuck queue

jobs:
  build:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: web-app } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm, cache-dependency-path: web-app/package-lock.json }
      - run: npm ci
      - name: Build
        env:
          VITE_BASE: /<repo-name>/
          VITE_POWER_AUTOMATE_URL: ${{ secrets.VITE_POWER_AUTOMATE_URL }}
          VITE_APP_KEY:         ${{ secrets.VITE_APP_KEY }}
        run: npm run build
      - name: SPA fallback
        run: cp dist/index.html dist/404.html
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with: { path: web-app/dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: ${{ steps.deployment.outputs.page_url }} }
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
        env:
          FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true   # for v3-action Node-20 deprecation warning
```

Reminder: `VITE_POWER_AUTOMATE_URL` and `VITE_APP_KEY` are stored as GitHub *secrets* for convenience, but once built they are **public in the bundle** — see §1 Security model. The "secret" storage just keeps them out of the repo source, not out of the shipped JS.

## Stuck Pages deployment

Sometimes a Pages deployment gets stuck "in_progress" in GitHub's internal infrastructure. Symptoms:
- New deploys fail with: `"Deployment request failed for <SHA-A> due to in progress deployment. Please cancel <SHA-B> first or wait for it to complete"`
- The blocking deployment (SHA-B) doesn't appear in the regular Deployments API list

**Fix sequence**:
1. **Cancel via Pages API**: `POST /repos/{owner}/{repo}/pages/deployments/<SHA-B>/cancel` → expect 204 No Content
2. Trigger a new run: `POST /repos/{owner}/{repo}/actions/workflows/<file>.yml/dispatches` with `{"ref":"main"}`
3. If still stuck: **delete + recreate Pages site**:
   - `DELETE /repos/{owner}/{repo}/pages`
   - `POST /repos/{owner}/{repo}/pages` with `{"build_type": "workflow"}`
4. Retrigger workflow

The `cancel-in-progress: false` concurrency makes this worse — old runs are not auto-killed. Consider `cancel-in-progress: true` if you want each push to supersede prior runs.

## Auto-README conflict on first push

When you create a repo on github.com with "Initialize with README" checked, then try to push your local repo:

```
hint: Updates were rejected because the remote contains work that you do not have locally.
```

Fix:
```bash
git pull origin main --allow-unrelated-histories --no-edit
# resolve README conflict (keep yours)
git checkout --ours README.md
git add README.md
git commit --no-edit
git push origin main
```

To avoid: when creating the repo on GitHub, leave "Initialize with README" UNCHECKED.

## Verifying a deploy is actually live

Before debugging suspected client-side bugs, prove the new code reached production:
```bash
# Find the hashed asset URL
curl -s https://<user>.github.io/<repo>/ | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js'

# Grep the bundle for a unique string from your change
curl -s https://<user>.github.io/<repo>/assets/index-XXXXXX.js | grep -oE "Fotos de la unidad|YourFeatureFlag|etc"
```

If the string is present → deploy is live, user-visible problem is browser-side (SW cache, localStorage stale, etc.). If absent → workflow hasn't deployed yet or built from a stale ref. This saves hours: never debug a "the fix didn't work" complaint without first proving the fix is even live.

---

# 12 · Credentials & device code auth

## Reading credentials from Windows Credential Manager

When git-cli/gh isn't available but git itself works (HTTPS push works via Windows credential), extract the token via Win32 API:

```powershell
$sig = @'
[DllImport("advapi32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
public static extern bool CredRead(string target, int type, int flags, out IntPtr credential);
[StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
public struct CRED {
    public uint Flags; public int Type; public string TargetName;
    public string Comment; public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
    public uint CredentialBlobSize; public IntPtr CredentialBlob;
    public uint Persist; public uint AttributeCount; public IntPtr Attributes;
    public string TargetAlias; public string UserName;
}
'@
Add-Type -MemberDefinition $sig -Name "CredAPI" -Namespace "Win32"
$ptr = [IntPtr]::Zero
[Win32.CredAPI]::CredRead("git:https://github.com", 1, 0, [ref]$ptr) | Out-Null
$c = [System.Runtime.InteropServices.Marshal]::PtrToStructure($ptr, [type][Win32.CredAPI+CRED])
$bytes = New-Object byte[] $c.CredentialBlobSize
[System.Runtime.InteropServices.Marshal]::Copy($c.CredentialBlob, $bytes, 0, $c.CredentialBlobSize)
$token = [System.Text.Encoding]::Unicode.GetString($bytes)
```

For GitHub API: `Authorization = "Basic <base64(user:token)>"` works. `Bearer $token` may fail with `gho_*` OAuth tokens — use Basic auth as fallback.

## Device code flow: cannot be automated

The Microsoft device code flow requires a human to open `https://microsoft.com/devicelogin` in a browser and enter the code. **There is no API to programmatically supply the code** — this is the whole point of the security barrier. AI agents and CI pipelines cannot complete it. (The polling/token URLs the script uses — `verification_url`, `/oauth2/token` — are returned by the API; the human-facing URL is `https://microsoft.com/devicelogin`.)

Practical implications:
- **Always allow ample time**: 15-minute polling timeout is reasonable, 5 minutes is too short for a busy user
- **Print the code prominently**: stdout with bright color, mention "open URL in browser, paste this code"
- **Save the refresh token**: so subsequent runs don't re-prompt. `Save-RefreshToken` / `Read-RefreshToken` pattern. Token TTL is typically 90 days.
- **Service principal alternative**: for fully autonomous flows, register an app in Entra ID with appropriate scopes and use client_credentials. Adds setup complexity (admin consent, secrets management, secret rotation).

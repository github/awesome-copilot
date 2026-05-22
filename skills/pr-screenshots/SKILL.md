---
name: pr-screenshots
description: 'Embed before/after screenshots and annotated images in pull request descriptions. Covers PR description patterns, image upload for Azure DevOps and GitHub, and sizing best practices.'
---

# PR Screenshots

Embed before/after screenshots in pull request descriptions so reviewers can see the visual change without checking out the branch.

## When to Use This Skill

Use this skill when a PR changes something visible:

- Layout, styling, CSS
- Charts, dashboards, data visualizations
- UI components, forms, modals
- Error messages, CLI output, log formatting

## PR Description Pattern

Place screenshots directly in the PR description body. Avoid wrapping them in `<details>` collapse — reviewers are more likely to look at images they can see without clicking.

```markdown
**Before** — brief description of the problem:

![before](url-to-before-image)

**After** — brief description of the fix:

![after](url-to-after-image)
```

Keep the text brief. A sentence or two per image describing what the reader should notice. Let the image carry most of the communication.

### Multiple changes

For PRs with several visual changes, use separate before/after pairs with headings:

```markdown
## Filter bar alignment

**Before** — 1px border clash between adjacent buttons:

![before-filters](url)

**After** — borders overlap cleanly, hover tint added:

![after-filters](url)

## Chart tooltip

**Before** — tooltip clipped at container edge:

![before-tooltip](url)

**After** — tooltip repositions to stay visible:

![after-tooltip](url)
```

## Image Sizing

- **Take screenshots at native 1x resolution** — don't resize with PIL (creates artifacts)
- **Control display size in HTML** when images are too large:
  ```html
  <img src="url" width="600" alt="description">
  ```
- **Before/after pairs must use the same viewport width and crop** — otherwise the comparison is meaningless

## Uploading Images

### Azure DevOps

Upload images as PR attachments via the REST API:

```powershell
$token = az account get-access-token `
    --resource "499b84ac-1321-427f-aa17-267ca6975798" `
    --query accessToken -o tsv

$base = "https://{org}.visualstudio.com/{projectId}/_apis/git/repositories/{repoId}"
$url = "$base/pullRequests/{prId}/attachments/screenshot.png?api-version=7.1-preview.1"

# Use HttpClient — Invoke-RestMethod can corrupt binary data
$client = New-Object System.Net.Http.HttpClient
$client.DefaultRequestHeaders.Authorization = `
    New-Object System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", $token)
$content = New-Object System.Net.Http.ByteArrayContent(
    , [System.IO.File]::ReadAllBytes("screenshot.png")
)
$content.Headers.ContentType = `
    [System.Net.Http.Headers.MediaTypeHeaderValue]::new("application/octet-stream")
$resp = $client.PostAsync($url, $content).Result
```

Reference in the PR description:

```markdown
![description](https://{org}.visualstudio.com/{projectId}/_apis/git/repositories/{repoId}/pullRequests/{prId}/attachments/screenshot.png)
```

**Azure DevOps gotchas:**

- **Use `{org}.visualstudio.com` NOT `dev.azure.com/{org}`** — AzDO's markdown renderer uses `.visualstudio.com`. The `dev.azure.com` format loads noticeably slower
- Use `POST` not `PUT` (PUT returns 405)
- API version must be `7.1-preview.1`
- Can't re-upload with the same filename — use a new name (e.g. `screenshot-v2.png`)
- Use `HttpClient` not `Invoke-RestMethod` — IRM can corrupt binary data
- Repo-relative paths don't work in PR descriptions — must use full URLs
- Don't commit images to the branch just for PR screenshots

### GitHub

> **⚠️ Work in progress.** GitHub's drag-and-drop image upload uses internal endpoints that require browser cookies. There's no clean public API for uploading images to PR descriptions yet.

**Current workaround:** Commit images to a `pr-assets` orphan branch and reference via blob URLs (`github.com/{owner}/{repo}/blob/pr-assets/{file}?raw=true`). It works but is clunky — contributions for a better approach are welcome.

## Guidelines

1. **Capture before state BEFORE making changes** — it's easy to forget, and reconstructing the original state later is slow and error-prone
2. **Keep descriptions brief** — a sentence or two per image pointing out what changed is enough
3. **Prefer visible images over collapsed sections** — screenshots behind `<details>` tags are easy to skip
4. **Annotate when the change is subtle** — use the `image-annotations` skill to add callouts when the difference isn't immediately obvious
5. **Match viewport and crop** between before/after pairs so the comparison is meaningful

## Limitations

- GitHub image upload requires workarounds (no public API for PR description images)
- Azure DevOps attachment filenames can't be reused — plan naming ahead
- Very large images (>10MB) may not render inline on some platforms

# ax Profile Setup

Consult this when authentication fails (401, missing profile, missing API key). Do NOT run these checks proactively.

Use this when there is no profile, or a profile has incorrect settings (wrong API key, wrong region, etc.).

## 1. Inspect the current state

```bash
ax profiles show
```

Look at the output to understand what's configured:
- `API Key: (not set)` or missing → key needs to be created/updated
- No profile output or "No profiles found" → no profile exists yet
- Connected but getting `401 Unauthorized` → key is wrong or expired
- Connected but wrong endpoint/region → region needs to be updated

## 2. Fix a misconfigured profile

If a profile exists but one or more settings are wrong, patch only what's broken.

**Never pass a raw API key value as a flag.** Always reference it via the `ARIZE_API_KEY` environment variable. If the variable is not already set in the shell, instruct the user to set it first, then run the command:

```bash
# If ARIZE_API_KEY is already exported in the shell:
ax profiles update --api-key $ARIZE_API_KEY

# Fix the region (no secret involved — safe to run directly)
ax profiles update --region us-east-1b

# Fix both at once
ax profiles update --api-key $ARIZE_API_KEY --region us-east-1b
```

`update` only changes the fields you specify — all other settings are preserved. If no profile name is given, the active profile is updated.

## 3. Create a new profile

If no profile exists, or if the existing profile needs to point to a completely different setup (different org, different region):

**Always reference the key via `$ARIZE_API_KEY`, never inline a raw value.**

```bash
# Requires ARIZE_API_KEY to be exported in the shell first
ax profiles create --api-key $ARIZE_API_KEY

# Create with a region
ax profiles create --api-key $ARIZE_API_KEY --region us-east-1b

# Create a named profile
ax profiles create work --api-key $ARIZE_API_KEY --region us-east-1b
```

To use a named profile with any `ax` command, add `-p NAME`:
```bash
ax spans export PROJECT -p work
```

## 4. Getting the API key

**Never ask the user to paste their API key into the chat. Never log, echo, or display an API key value.**

If `ARIZE_API_KEY` is not already set, instruct the user to export it in their shell:

```bash
export ARIZE_API_KEY="..."   # user pastes their key here in their own terminal
```

They can find their key at https://app.arize.com by navigating to the settings page. Recommend they create a **scoped service key** (not a personal user key) — service keys are not tied to an individual account and are safer for programmatic use. Keys are space-scoped — make sure they copy the key for the correct space.

Once the user confirms the variable is set, proceed with `ax profiles create --api-key $ARIZE_API_KEY` or `ax profiles update --api-key $ARIZE_API_KEY` as described above.

## 5. Verify

After any create or update:

```bash
ax profiles show
```

Confirm the API key and region are correct, then retry the original command.

## Space

There is no profile flag for space. Save it as an environment variable — accepts a space **name** (e.g., `my-workspace`) or a base64 space **ID** (e.g., `U3BhY2U6...`). Find yours with `ax spaces list -o json`.

**macOS/Linux** — add to `~/.zshrc` or `~/.bashrc`:
```bash
export ARIZE_SPACE="my-workspace"    # name or base64 ID
```
Then `source ~/.zshrc` (or restart terminal).

**Windows (PowerShell):**
```powershell
[System.Environment]::SetEnvironmentVariable('ARIZE_SPACE', 'my-workspace', 'User')
```
Restart terminal for it to take effect.

## Save Credentials for Future Use

At the **end of the session**, if the user manually provided any credentials during this conversation **and** those values were NOT already loaded from a saved profile or environment variable, offer to save them.

**Skip this entirely if:**
- The API key was already loaded from an existing profile or `ARIZE_API_KEY` env var
- The space was already set via `ARIZE_SPACE` env var
- The user only used base64 project IDs (no space was needed)

**How to offer:** Use **AskQuestion**: *"Would you like to save your Arize credentials so you don't have to enter them next time?"* with options `"Yes, save them"` / `"No thanks"`.

**If the user says yes:**

1. **API key** — Run `ax profiles show` to check the current state. Then run `ax profiles create --api-key $ARIZE_API_KEY` or `ax profiles update --api-key $ARIZE_API_KEY` (the key must already be exported as an env var — never pass a raw key value).

2. **Space** — See the Space section above to persist it as an environment variable.

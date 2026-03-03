# Azure Context (Subscription & Location)

Detect and confirm Azure subscription and location before generating artifacts.

---

## Step 1: Check for Existing AZD Environment

If the project already uses AZD, check for an existing environment with values already set:

```bash
azd env list
```

**If an environment is selected** (marked with `*`), check its values:

```bash
azd env get-values
```

If `AZURE_SUBSCRIPTION_ID` and `AZURE_LOCATION` are already set, use `ask_user` to confirm reuse:

```
Question: "I found an existing AZD environment with these settings. Would you like to continue with them?"

  Environment: {env-name}
  Subscription: {subscription-name} ({subscription-id})
  Location: {location}

Choices: [
  "Yes, use these settings (Recommended)",
  "No, let me choose different settings"
]
```

If user confirms → skip to **Record in Plan**. Otherwise → continue to Step 2.

---

## Step 2: Detect Defaults

Check for user-configured defaults:

```bash
azd config get defaults
```

Returns JSON with any configured defaults:
```json
{
  "subscription": "25fd0362-aa79-488b-b37b-d6e892009fdf",
  "location": "eastus2"
}
```

Use these as **recommended** values if present.

If no defaults, fall back to az CLI:
```bash
az account show --query "{name:name, id:id}" -o json
```

## Step 3: Confirm Subscription with User

Use `ask_user` with the **actual subscription name and ID**:

✅ **Correct:**
```
Question: "Which Azure subscription would you like to deploy to?"
Choices: [
  "Use current: jongdevdiv (25fd0362-aa79-488b-b37b-d6e892009fdf) (Recommended)",
  "Let me specify a different subscription"
]
```

❌ **Wrong** (never do this):
```
Choices: [
  "Use default subscription",  // ← Does not show actual name
  "Let me specify"
]
```

If user wants a different subscription:
```bash
az account list --output table
```

---

## Step 4: Confirm Location with User

1. Consult [Region Availability](region-availability.md) for services with limited availability
2. Present only regions that support ALL selected services
3. Use `ask_user`:

```
Question: "Which Azure region would you like to deploy to?"
Based on your architecture ({list services}), these regions support all services:
Choices: [
  "eastus2 (Recommended)",
  "westus2",
  "westeurope"
]
```

⚠️ Do NOT include regions that don't support all services — deployment will fail.

---

## Record in Plan

After confirmation, record in `.azure/plan.md`:

```markdown
## Azure Context
- **Subscription**: jongdevdiv (25fd0362-aa79-488b-b37b-d6e892009fdf)
- **Location**: eastus2
```

---

## Step 5: Apply to AZD Environment

> **⛔ CRITICAL for Aspire and azd projects**: After user confirms subscription and location, you **MUST** set these values in the azd environment immediately after running `azd init` or `azd env new`.
>
> **DO NOT** wait until validation or deployment. The Azure CLI and azd maintain separate configuration contexts.

**For Aspire projects using `azd init --from-code`:**

```bash
# 1. Run azd init
azd init --from-code -e <environment-name>

# 2. IMMEDIATELY set the user-confirmed subscription
azd env set AZURE_SUBSCRIPTION_ID <subscription-id>

# 3. Set the location
azd env set AZURE_LOCATION <location>

# 4. Verify
azd env get-values
```

**For non-Aspire projects using `azd env new`:**

```bash
# 1. Create environment
azd env new <environment-name>

# 2. IMMEDIATELY set the user-confirmed subscription
azd env set AZURE_SUBSCRIPTION_ID <subscription-id>

# 3. Set the location
azd env set AZURE_LOCATION <location>

# 4. Verify
azd env get-values
```

**Why this is critical:**
- `az account show` returns the Azure CLI's default subscription
- `azd` maintains its own configuration with potentially different defaults
- If you don't set `AZURE_SUBSCRIPTION_ID` explicitly, azd will use its own default
- This can result in deploying to the wrong subscription despite user confirmation

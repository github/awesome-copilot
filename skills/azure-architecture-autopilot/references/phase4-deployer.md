# Phase 4: Deployment Agent

This file contains detailed instructions for Phase 4. Read and follow this file when the user approves deployment after Phase 3 (code review) is complete.

---

**🚨🚨🚨 Phase 4 Mandatory Execution Order — Never Skip Any Step 🚨🚨🚨**

The following 5 steps must be executed **strictly in order**. No step may be omitted or skipped.
Even if the user requests deployment with "deploy it", "go ahead", "do it", etc., always proceed from Step 1 in order.

```
Step 1: Verify prerequisites (az login, subscription, resource group)
    ↓
Step 2: What-if validation (az deployment group what-if) ← Must execute
    ↓
Step 3: Generate preview diagram (02_arch_diagram_preview.html) ← Must generate
    ↓
Step 4: Actual deployment after user final confirmation (az deployment group create)
    ↓
Step 5: Generate deployment result diagram (03_arch_diagram_result.html)
```

**Never do the following:**
- Execute `az deployment group create` directly without What-if
- Skip generating the preview diagram (`02_arch_diagram_preview.html`)
- Proceed with deployment without showing What-if results to the user
- Only provide `az` commands for the user to run manually

---

### Step 1: Verify Prerequisites

```powershell
# Verify az CLI installation and login
az account show 2>&1
```

If not logged in, ask the user to run `az login`.
The agent must never enter or store credentials directly.

Create resource group:
```powershell
az group create --name "<RG_NAME>" --location "<LOCATION>"  # Location confirmed in Phase 1
```
→ Proceed to next step after confirming success

### Step 2: Validate → What-if Validation — 🚨 Mandatory

**Do not skip this step. Always execute it no matter how urgently the user requests deployment.**

**Step 2-A: Run Validate First (Quick Pre-validation)**

`what-if` can **hang indefinitely without error messages** when there are Azure policy violations, resource reference errors, etc.
To prevent this, **always run `validate` first**. Validate returns errors quickly.

```powershell
# validate — Quickly catches policy violations, schema errors, parameter issues
az deployment group validate `
  --resource-group "<RG_NAME>" `
  --parameters main.bicepparam
```

- **Validate succeeds** → Proceed to Step 2-B (what-if)
- **Validate fails** → Analyze error messages, fix Bicep, recompile, re-validate
  - Azure Policy violation (`RequestDisallowedByPolicy`) → Reflect policy requirements in Bicep (e.g., `azureADOnlyAuthentication: true`)
  - Schema error → Fix API version/properties
  - Parameter error → Fix parameter file

**Step 2-B: Run What-if**

Run what-if after validate passes.

**Choose parameter passing method:**
- If all `@secure()` parameters have default values → Use `.bicepparam`
- If `@secure()` parameters require user input → Use `--template-file` + JSON parameter file

```powershell
# Method 1: Use .bicepparam (when all @secure() parameters have defaults)
az deployment group what-if `
  --resource-group "<RG_NAME>" `
  --parameters main.bicepparam

# Method 2: Use JSON parameter file (when @secure() parameters require user input)
az deployment group what-if `
  --resource-group "<RG_NAME>" `
  --template-file main.bicep `
  --parameters main.parameters.json `
  --parameters secureParam='value'
```
→ Summarize the What-if results and present them to the user.

**⏱️ What-if Execution Method and Timeout Handling:**

What-if performs resource validation on the Azure server side, so it may take time depending on the service/region.
**Always execute with `initial_wait: 300` (5 minutes).** If not completed within 5 minutes, it automatically times out.

```powershell
# Always set initial_wait: 300 when calling the powershell tool
# mode: "sync", initial_wait: 300
az deployment group what-if `
  --resource-group "<RG_NAME>" `
  --parameters main.bicepparam
```

**Completed within 5 minutes** → Proceed normally (summarize results → preview diagram → deployment confirmation)

**Not completed within 5 minutes (timeout)** → Immediately stop with `stop_powershell` and offer choices to the user:

```
ask_user({
  question: "What-if validation did not complete within 5 minutes. The Azure server response is delayed. How would you like to proceed?",
  choices: [
    "Retry (Recommended)",
    "Skip What-if and deploy directly"
  ]
})
```

**If "Retry" is selected:** Re-execute the same command with `initial_wait: 300`. Retry up to 2 times maximum.
**If "Skip What-if and deploy directly" is selected:**
- Generate the preview diagram based on the Phase 1 draft
- Inform the user of the risks:
  > **⚠️ Deploying without What-if validation.** Unexpected resource changes may occur. Please verify in the Azure Portal after deployment.

**Never do the following:**
- Execute without setting `initial_wait`, causing indefinite waiting
- Let the agent arbitrarily decide "what-if is optional" and skip it
- Automatically switch to deployment without asking the user on timeout
- Skip what-if for reasons like "deployment is faster"

### Step 3: Preview Diagram Based on What-if Results — 🚨 Mandatory

**Do not skip this step. Always generate the preview diagram when What-if succeeds.**

Regenerate the diagram using the actual resources to be deployed (resource names, types, locations, counts) from the What-if results.
Keep the draft from Phase 1 (`01_arch_diagram_draft.html`) as-is, and generate the preview as `02_arch_diagram_preview.html`.
The draft can be reopened at any time.

```
## Architecture to Be Deployed (Based on What-if)

[Interactive diagram link — 02_arch_diagram_preview.html]
(Design draft: 01_arch_diagram_draft.html)

Resources to be created (N items):
[What-if results summary table]

Deploy these resources? (Yes/No)
```

Proceed to Step 4 when the user confirms. **Do not proceed to deployment without the preview diagram.**

### Step 4: Actual Deployment

Execute only when the user has reviewed the preview diagram and What-if results and approved the deployment.
**Use the same parameter passing method used in What-if.**

```powershell
$deployName = "deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

# Method 1: Use .bicepparam
az deployment group create `
  --resource-group "<RG_NAME>" `
  --parameters main.bicepparam `
  --name $deployName `
  2>&1 | Tee-Object -FilePath deployment.log

# Method 2: Use JSON parameter file
az deployment group create `
  --resource-group "<RG_NAME>" `
  --template-file main.bicep `
  --parameters main.parameters.json `
  --name $deployName `
  2>&1 | Tee-Object -FilePath deployment.log
```

Periodically monitor progress during deployment:
```powershell
az deployment group show `
  --resource-group "<RG_NAME>" `
  --name "<DEPLOYMENT_NAME>" `
  --query "{status:properties.provisioningState, duration:properties.duration}" `
  -o table
```

### Handling Deployment Failures

When deployment fails, some resources may remain in a 'Failed' state. Redeploying in this state causes errors like `AccountIsNotSucceeded`.

**⚠️ Resource deletion is a destructive command. Always explain the situation to the user and obtain approval before executing.**

```
[Resource name] failed during deployment.
To redeploy, the failed resources must be deleted first.

Delete and redeploy? (Yes/No)
```

Delete failed resources and redeploy once the user approves.

**🔹 Handling Soft-deleted Resources (Prevent Redeployment Blocking):**

When a resource group is deleted after a failed deployment, Cognitive Services (Foundry), Key Vault, etc. remain in a **soft-delete state**.
Redeploying with the same name causes `FlagMustBeSetForRestore`, `Conflict` errors.

**Always check before redeployment:**
```powershell
# Check soft-deleted Cognitive Services
az cognitiveservices account list-deleted -o table

# Check soft-deleted Key Vault
az keyvault list-deleted -o table
```

**Resolution options (provide choices to the user):**
```
ask_user({
  question: "Soft-deleted resources from a previous deployment were found. How would you like to handle this?",
  choices: [
    "Purge and redeploy (Recommended) - Clean delete then create new",
    "Redeploy in restore mode - Recover existing resources"
  ]
})
```

**Caution — Key Vault with `enablePurgeProtection: true`:**
- Cannot be purged (must wait until retention period expires)
- Cannot recreate with the same name
- **Solution: Change the Key Vault name** and redeploy (e.g., add timestamp to `uniqueString()` seed)
- Explain the situation to the user and guide them on the name change

### Step 5: Deployment Complete — Generate Diagram from Actual Resources and Report

Once deployment is complete, query the actually deployed resources and generate the final architecture diagram.

**Step 1: Query Deployed Resources**
```powershell
az resource list --resource-group "<RG_NAME>" --output json
```

**Step 2: Generate Diagram from Actual Resources**

Extract resource names, types, SKUs, and endpoints from the query results and generate the final diagram using the built-in diagram engine.
Be careful with file names to avoid overwriting previous diagrams:
- `01_arch_diagram_draft.html` — Design draft (keep)
- `02_arch_diagram_preview.html` — What-if preview (keep)
- `03_arch_diagram_result.html` — Deployment result final version

Populate the diagram's services JSON with actual deployed resource information:
- `name`: Actual resource name (e.g., `foundry-duru57kxgqzxs`)
- `sku`: Actual SKU
- `details`: Actual values such as endpoints, location, etc.

**Step 3: Report**
```
## Deployment Complete!

[Interactive architecture diagram — 03_arch_diagram_result.html]
(Design draft: 01_arch_diagram_draft.html | What-if preview: 02_arch_diagram_preview.html)

Created resources (N items):
[Dynamically extracted resource names, types, and endpoints from actual deployment results]

## Next Steps
1. Verify resources in Azure Portal
2. Check Private Endpoint connection status
3. Additional configuration guidance if needed

## Cleanup Command (If Needed)
az group delete --name <RG_NAME> --yes --no-wait
```

---

### Handling Architecture Change Requests After Deployment

**When the user requests resource additions/changes/deletions after deployment is complete, do NOT go directly to Bicep/deployment.**
Always return to Phase 1 and update the architecture first.

**Process:**

1. **Confirm user intent** — Ask first whether they want to add to the existing deployed architecture:
   ```
   Would you like to add a VM to the currently deployed architecture?
   Current configuration: [Deployed services summary]
   ```

2. **Return to Phase 1 — Apply Delta Confirmation Rule**
   - Use the existing deployment result (`03_arch_diagram_result.html`) as the current state baseline
   - Verify required fields for new services (SKU, networking, region availability, etc.)
   - Confirm undecided items via ask_user
   - Fact-check (MS Docs fetch + cross-validation)

3. **Generate Updated Architecture Diagram**
   - Combine existing deployed resources + new resources into `04_arch_diagram_update_draft.html`
   - Show to the user and get confirmation:
   ```
   ## Updated Architecture

   [Interactive diagram — 04_arch_diagram_update_draft.html]
   (Previous deployment result: 03_arch_diagram_result.html)

   **Changes:**
   - Added: [New services list]
   - Removed: [Removed services list] (if any)

   Proceed with this configuration?
   ```

4. **After confirmation, proceed through Phase 2 → 3 → 4 in order**
   - Incrementally add new resource modules to existing Bicep
   - Review → What-if → Deploy (incremental deployment)

**Never do the following:**
- Jump directly to Bicep generation without updating the architecture diagram when a change is requested after deployment
- Ignore the existing deployment state and create new resources in isolation
- Proceed without confirming with the user whether to add to the existing architecture

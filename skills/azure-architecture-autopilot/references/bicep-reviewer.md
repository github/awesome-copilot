# Bicep Reviewer Agent

Reviews generated Bicep code and automatically fixes any issues found.

## Review Order

### Step 1: Bicep Compilation (Run First)

Run actual Bicep compilation **before** the checklist. Do not declare "pass" based on visual inspection alone.

```powershell
az bicep build --file main.bicep 2>&1
```

Collect all WARNINGs and ERRORs from the compilation results. This is the foundational data for the review.

### Step 2: Fix Compilation Errors/Warnings

Fix issues found in compilation results:
- **ERROR** → Must fix and recompile
- **WARNING** → Handle according to the criteria below

**🚨 WARNING Handling Criteria — Do Not Force Unnecessary Fixes:**

WARNINGs do not block deployment. Attempting to resolve warnings often introduces deployment errors, so use the following criteria:

| WARNING Type | Action | Reason |
|---|---|---|
| BCP081 (type not defined) | **Leave as-is** (if API version is the latest confirmed from MS Docs) | Local Bicep CLI type definitions are not yet updated. No impact on deployment |
| BCP035 (missing property) | **Judge carefully** — Check MS Docs to verify if the property is actually required; if not, leave as-is | Adding properties can cause deployment failures due to compatibility issues (e.g., computeMode) |
| BCP187 (sku/kind type unverified) | **Leave as-is** | Values confirmed from MS Docs will work correctly at deployment |
| no-hardcoded-env-urls | **Leave as-is** | DNS Zone names inevitably require hardcoding |

**Never do the following:**
- Downgrade API versions to resolve WARNINGs (maintain latest stable)
- Add properties not confirmed in MS Docs to resolve WARNINGs
- Force fixes targeting "zero warnings"

**Principle: Document WARNINGs in review results, but do not fix them if they don't block deployment.**

Common issues and responses:
- BCP081 (type not defined) → API version is likely incorrect. Fetch MS Docs and update to the actual latest stable version
- BCP036 (type mismatch) → Check property value casing and type, then fix
- BCP037 (property not allowed) → Check MS Docs to verify if the property is supported in that API version
- no-hardcoded-env-urls → Hardcoded URLs in DNS Zone names etc. are sometimes unavoidable in Bicep. Note in review results

### Step 3: Checklist Review

Review the following items after compilation passes. See `references/service-gotchas.md` for full gotchas.

#### Critical (Must Fix)
- [ ] Microsoft Foundry `customSubDomainName` setting exists — **Cannot be changed after creation; if missing, resource must be deleted and recreated**
- [ ] When using Microsoft Foundry, **Foundry Project (`accounts/projects`) must exist** — Portal access unavailable without it
- [ ] Microsoft Foundry `identity: { type: 'SystemAssigned' }` — Project creation fails without it
- [ ] `publicNetworkAccess: 'Disabled'` — All services using PE
- [ ] ADLS Gen2 `isHnsEnabled: true` — Without it, becomes regular Blob Storage
- [ ] pe-subnet `privateEndpointNetworkPolicies: 'Disabled'` — PE creation fails without it
- [ ] Private DNS Zone Group — Must exist for every PE
- [ ] Key Vault `enablePurgeProtection: true`

#### High (Recommended Fix)
- [ ] Storage `allowBlobPublicAccess: false`, `minimumTlsVersion: 'TLS1_2'`
- [ ] Private DNS Zone VNet Link `registrationEnabled: false`
- [ ] Resource types and kind values per service match `references/ai-data.md` or MS Docs
- [ ] Model deployments: Order guaranteed (`dependsOn`)
- [ ] No sensitive values in parameter files — **Remove immediately if found**

#### Medium (Recommended)
- [ ] Resource name collision prevention using `uniqueString()`
- [ ] Leverage implicit dependencies through resource references

### Step 4: Hardcoding Regression Check (Prevent Dynamic Information Leakage)

Verify the following items are not hardcoded as literal values in the Bicep code:

#### Must Be Parameterized (No Hardcoding)
- [ ] `location` — Literal region names (`'eastus'`, `'koreacentral'`, etc.) are not used directly; passed via `param location`
- [ ] Model name/version — Not literals; use values confirmed in Phase 1 and validated for availability in Step 0
- [ ] SKU — Use values confirmed with the user

#### Verify Dynamic Values Have Not Regressed Into References
This is not directly within this review's scope, but if specific API versions, SKU lists, or region lists are hardcoded in code comments or parameter descriptions, remove them and replace with "Check MS Docs" guidance.

#### Decision Rule Violation Check
- [ ] If `kind: 'OpenAI'` is used instead of Foundry → Change to `kind: 'AIServices'` unless the user explicitly requested it
- [ ] If Hub (`MachineLearningServices`) is used for general AI/RAG → Change to Foundry unless the user explicitly requested it
- [ ] If a standalone Azure OpenAI resource is used → Suggest reviewing Foundry usage unless the user explicitly requested it or Docs indicate it's necessary

### Step 5: Recompile After Fixes

If any changes were made in Steps 2–4, run `az bicep build` again to verify no new errors were introduced.

### Limitations of `az bicep build`

Compilation only validates syntax and types. The following items cannot be caught by compilation and are finally verified in Phase 4's `az deployment group what-if`:
- Retired/unavailable SKU
- Per-region service availability
- Model name validity
- Preview-only properties
- Service policy changes (quota, capacity, etc.)

State these limitations in the review results so the user understands the importance of the what-if step.

### Step 6: Report Results

```markdown
## Bicep Code Review Results

**Compilation Result**: [PASS/WARNING N items]
**Checklist**: ✅ Passed X items / ⚠️ Warnings X items
**Hardcoding Check**: [PASS / N violations]
**Auto-fixed**: X items

### Compilation Warnings (Remaining)
- [Warning content — including reason why it cannot be fixed]

### Auto-fix Details
- [File:line number] Before → After (reason)

### Hardcoding Violations (If Any)
- [File:line number] [Violation details] → [Fix method]

**Conclusion**: [Ready for deployment / Manual review required]
```

### Step 7: Phase 4 Transition — Reassurance Message Required

When asking whether to proceed to Phase 4 after passing code review, **always include a message to reassure the user**.
Users may feel uneasy about the word "deployment", so clearly communicate that what-if is a safe validation step.

```
ask_user({
  question: "Code review passed! Ready to proceed to the next step?\n\n⚡ This does NOT deploy immediately:\n  1️⃣ What-if validation — Simulates what will be created (not a deployment, safe)\n  2️⃣ Preview diagram — Review the architecture to be deployed as a diagram\n  3️⃣ Final confirmation — Actual deployment only after you review the diagram and approve\n\nNothing will be deployed without your approval.",
  choices: [
    "Proceed to next step (what-if validation + preview diagram) (Recommended)",
    "Just give me the code, I'll deploy later"
  ]
})
```

**Key points:**
- Always state "This does NOT deploy immediately"
- Explain the 3-step process: what-if → preview diagram → final confirmation
- Reassure with "Nothing will be deployed without your approval"

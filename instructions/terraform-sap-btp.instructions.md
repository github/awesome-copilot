---
description: 'Terraform conventions and guidelines for SAP Business Technology Platform (SAP BTP).'
applyTo: '**/*.tf, **/*.tfvars, **/*.tflint.hcl, **/*.tf.json, **/*.tfvars.json'
---

# Terraform on SAP BTP – Best Practices & Conventions

## Core Principles

Keep Terraform code minimal, modular, repeatable, secure, and auditable.
Always version control Terraform HCL and never version control generated state.

## Security

Mandatory:
- Use the latest stable Terraform CLI and provider versions; upgrade proactively for security patches.
- Do NOT commit secrets, credentials, certificates, Terraform state, or plan output artifacts.
- Mark all secret variables and outputs as `sensitive = true`.
- Prefer ephemeral / write‑only provider auth (Terraform >= 1.11) so secrets never persist in state.
- Minimize sensitive outputs; emit only what downstream automation truly needs.
- Continuously scan with `tfsec`, `trivy`, `checkov` (pick at least one) in CI.
- Periodically review provider credentials, rotate keys, and enable MFA where supported.

## Modularity

Structure for clarity and speed:
- Split by logical domain (e.g., entitlements, service instances) – NOT by environment.
- Use modules for reusable multi‑resource patterns only; avoid single‑resource wrapper modules.
- Keep module hierarchy shallow; avoid deep nesting and circular dependencies.
- Expose only essential cross‑module data via `outputs` (mark sensitive when required).

## Maintainability

Aim for explicit > implicit.
- Comment WHY, not WHAT; avoid restating obvious resource attributes.
- Parameterize (variables) instead of hard‑coding; provide defaults only when sensible.
- Prefer data sources for external existing infra; never for resources just created in same root – use outputs.
- Avoid data sources in generic reusable modules; require inputs instead.
- Remove unused / slow data sources; they degrade plan time.
- Use `locals` for derived or repeated expressions to centralize logic.

## Style & Formatting

### General
- Descriptive, consistent names for resources, variables, outputs.
- snake_case for variables & locals.
- 2 spaces indentation; run `terraform fmt -recursive`.

### Layout & Files

Recommended structure:
```text
my-sap-btp-app/
├── infra/                      # Root module
│   ├── main.tf                 # Core resources (split by domain when large)
│   ├── variables.tf            # Inputs
│   ├── outputs.tf              # Outputs
│   ├── provider.tf             # Provider config(s)
│   ├── locals.tf               # Local/derived values
│   └── environments/           # Environment var files only
│       ├── dev.tfvars
│       ├── test.tfvars
│       └── prod.tfvars
├── .github/workflows/          # CI/CD (if GitHub)
└── README.md                   # Documentation
```

Rules:
- Do NOT create separate branches/repos/folders per environment (antipattern).
- Keep environment drift minimal; encode differences in *.tfvars files only.
- Split oversized `main.tf` / `variables.tf` into logically named fragments (e.g., `main_services.tf`, `variables_services.tf`).
  Keep naming consistent.

### Resource Block Organization

Order (top → bottom): optional `depends_on`, then `count`/`for_each`, then attributes, finally `lifecycle`.
- Use `depends_on` ONLY when Terraform cannot infer dependency (e.g., data source needs entitlement).
- Use `count` for optional single resource; `for_each` for multiple instances keyed by a map for stable addresses.
- Group attributes: required first, then optional; blank lines between logical sections.
- Alphabetize within a section for faster scanning.

### Variables
- Every variable: explicit `type`, non‑empty `description`.
- Prefer concrete types (`object`, `map(string)`, etc.) over `any`.
- Avoid null defaults for collections; use empty lists/maps instead.

### Locals
- Centralize computed or repeated expressions.
- Group related values into object locals for cohesion.

### Outputs
- Expose only what downstream modules/automation consume.
- Mark secrets `sensitive = true`.
- Always give a clear `description`.

### Formatting & Linting
- Run `terraform fmt -recursive` (required in CI).
- Enforce `tflint` (and optionally `terraform validate`) in pre‑commit / CI.

## Documentation

Mandatory:
- `description` + `type` on all variables & outputs.
- A concise root `README.md`: purpose, prerequisites, auth model, usage (init/plan/apply), testing, rollback.
- Generate module docs with `terraform-docs` (add to CI if possible).
- Comments only where they clarify non-obvious decisions or constraints.

## State Management
- Use a remote backend supporting locking (e.g., Terraform Cloud, AWS S3, GCS, Azure Storage). Avoid SAP BTP Object Store (insufficient capabilities for reliable locking & security).
- NEVER commit `*.tfstate` or backups.
- Encrypt state at rest & in transit; restrict access by principle of least privilege.

## Validation
- Run `terraform validate` (syntax & internal checks) before committing.
- Confirm with user before `terraform plan` (requires auth & global account subdomain). Provide auth via env vars or tfvars; NEVER inline secrets in provider blocks.
- Test in non‑prod first; ensure idempotent applies.

## Testing
- Use Terraform test framework (`*.tftest.hcl`) for module logic & invariants.
- Cover success & failure paths; keep tests stateless/idempotent.
- Prefer mocking external data sources where feasible.

## SAP BTP Provider Specifics

Guidelines:
- Resolve service plan IDs using `data "btp_subaccount_service_plan"` and reference `serviceplan_id` from that data source.

Example:
```terraform
data "btp_subaccount_service_plan" "example" {
  subaccount_id = var.subaccount_id
  service_name  = "your_service_name"
  plan_name     = "your_plan_name"
}

resource "btp_subaccount_service_instance" "example" {
  subaccount_id  = var.subaccount_id
  serviceplan_id = data.btp_subaccount_service_plan.example.id
  name           = "my-example-instance"
}
```

Explicit dependencies (provider cannot infer):
```terraform
resource "btp_subaccount_entitlement" "example" {
  subaccount_id = var.subaccount_id
  service_name  = "your_service_name"
  plan_name     = "your_plan_name"
}

data "btp_subaccount_service_plan" "example" {
  subaccount_id = var.subaccount_id
  service_name  = "your_service_name"
  plan_name     = "your_plan_name"
  depends_on    = [btp_subaccount_entitlement.example]
}
```

Subscriptions also depend on entitlements; add `depends_on` when the provider cannot infer linkage via attributes (match `service_name`/`plan_name` ↔ `app_name`).

## Tool Integration

### HashiCorp Terraform MCP Server
Use the Terraform MCP Server for interactive schema lookup, resource block drafting, and validation.
1. Install & run server (see https://github.com/mcp/hashicorp/terraform-mcp-server).
2. Add it as a tool in your Copilot / MCP client configuration.
3. Query provider schema (e.g., list resources, data sources) before authoring.
4. Generate draft resource blocks, then refine manually for naming & tagging standards.
5. Validate plan summaries (never include secrets); confirm diff with reviewer before `apply`.

### Terraform Registry
Reference the SAP BTP provider docs: https://registry.terraform.io/providers/SAP/btp/latest/docs for authoritative resource & data source fields. Cross‑check MCP responses with registry docs if uncertain.

## Anti‑Patterns (Avoid)

Configuration:
- Hard‑coded environment‑specific values (use variables & tfvars).
- Routine use of `terraform import` (migration only).
- Deep / opaque conditional logic and dynamic blocks that reduce clarity.
- `local-exec` provisioners except for unavoidable integration gaps.
- Mixing SAP BTP provider with Cloud Foundry provider in the same root unless explicitly justified (split modules).

Security:
- Storing secrets in HCL, state, or VCS.
- Disabling encryption, validation, or scanning for speed.
- Using default passwords/keys or reusing credentials across environments.

Operational:
- Direct production applies without prior non‑prod validation.
- Manual drift changes outside Terraform.
- Ignoring state inconsistencies / corruption symptoms.
- Running production applies from uncontrolled local laptops (use CI/CD or approved runners).
- Reading business data from raw `*.tfstate` instead of outputs / data sources.

All changes must flow through Terraform CLI + HCL – never mutate state manually.

---
name: azure-developer-cli
description: 'Design, create, review, migrate, or troubleshoot Azure Developer CLI (azd) projects using current Microsoft guidance. Use for azd, azure.yaml, AZD templates, Bicep or Terraform under infra, AZD environments and secrets, hooks, deployment workflows, and azd-managed CI/CD.'
license: MIT
---

# Azure Developer CLI best practices

Use this skill to produce maintainable, secure, environment-aware `azd` projects. Prefer repository conventions when they are already coherent, and make the smallest complete change that improves the project.

## Start with repository discovery

Before editing:

1. Find `azure.yaml`, the configured `infra.path`, source projects, deployment scripts, `.gitignore`, and pipeline definitions.
2. Read `azure.yaml` before inferring services or the IaC provider.
3. Identify whether the task is to create, migrate, review, deploy, or troubleshoot.
4. Identify the active environment only when an environment-specific operation is required.
5. Read the relevant reference:
   - Repository layout or `azure.yaml`: [references/project-structure.md](references/project-structure.md)
   - Bicep, Terraform, parameters, outputs, or environments: [references/iac-and-environments.md](references/iac-and-environments.md)
   - Secrets, hooks, CI/CD, deployment, or troubleshooting: [references/security-cicd-operations.md](references/security-cicd-operations.md)
   - Product details that may have changed: [references/official-docs.md](references/official-docs.md)

Do not assume the default `infra` path, the default Bicep provider, or a single service when `azure.yaml` says otherwise.

## Apply safety guardrails

- Never commit `.azure`, environment `.env` files, credentials, deployment outputs containing secrets, local Terraform state, or generated deployment artifacts.
- Never put literal secrets in `azure.yaml`, IaC parameter files, hooks, source control, command arguments that will be logged, or IaC outputs.
- Prefer managed identities and RBAC. Use Key Vault references and `azd env set-secret` when a secret is unavoidable.
- Before a command that can create, modify, or delete Azure resources, confirm the target environment, subscription, tenant, region, and expected scope.
- Treat an explicit user request to deploy, provision, destroy, or configure a pipeline as approval for that named action. Otherwise, ask before running `azd up`, `azd provision`, `azd deploy`, `azd down`, or `azd pipeline config`.
- Do not replace Bicep with Terraform, Terraform with Bicep, or an established hosting service unless the user requests that architectural change.
- Preserve resources and state owned outside the current `azd` project.

## Use these defaults

| Concern | Preferred default |
| --- | --- |
| Project manifest | One `azure.yaml` at the repository root |
| Application code | `src/<service-name>` per independently deployable service |
| Infrastructure | `infra` with a thin entry point and reusable modules |
| IaC provider | Bicep unless the repository or user chooses Terraform |
| Deployment environments | Separate named environments for dev, test, staging, and production |
| Local AZD state | `.azure/<environment-name>` and excluded from source control |
| Shared environment state | AZD remote environments backed by Azure Blob Storage |
| Secrets | Managed identity/RBAC first, then Key Vault references |
| Automation scripts | Short, idempotent scripts under `scripts/azd` |
| CI authentication | Workload identity federation/OIDC where supported |
| Routine development | `azd up` for simple workflows; separate phases for controlled workflows |

## Implementation workflow

### 1. Model the application

- Define one `services` entry for each independently deployable component.
- Keep service keys stable because they participate in resource discovery and deployment.
- Map each service to its actual `project`, `language`, and `host`.
- Keep shared infrastructure in IaC rather than inventing a fake deployable service.
- Declare dependencies with supported `azure.yaml` fields instead of relying on file order.

### 2. Model infrastructure

- Keep `main.bicep` or `main.tf` as the orchestration entry point.
- Split reusable or independently understandable infrastructure into modules.
- Parameterize environment-specific values; do not fork the IaC tree per environment.
- Output only stable, nonsecret values required by deployment or application configuration.
- Use deterministic naming and consistent tags that include the project and environment.
- Add role assignments to identities rather than distributing service keys.
- Use infrastructure layers only when separate scopes or lifecycle dependencies justify them.

### 3. Model environments

- Use predictable names such as `<project>-dev` for shared environments and `<alias>-dev` for personal environments.
- Use `azd env set`, `azd env unset`, and `azd env set-secret` rather than editing `.env` directly.
- Use `-e` or `--environment` in scripts and automation so the target is explicit.
- Use `azd env refresh` to synchronize deployment outputs after another actor changes an environment.
- Configure AZD remote state when a team shares environment state.

### 4. Add hooks only for lifecycle gaps

- Prefer declarative IaC and native service configuration over hooks.
- Use root hooks for project-wide behavior and service hooks for service-specific behavior.
- Keep nontrivial hook logic in versioned scripts under `scripts/azd`.
- Set `shell` explicitly. Provide `windows` and `posix` variants when necessary.
- Make hooks idempotent, noninteractive in CI, and fail on errors unless failure is intentionally nonblocking.
- Test a hook independently with `azd hooks run <hook-name>`.

### 5. Build CI/CD deliberately

- Keep the pipeline definition with the template and review generated changes from `azd pipeline config`.
- Use short-lived federated credentials where the provider supports them.
- Run tests and IaC validation before provisioning.
- Use explicit environments and `--no-prompt` in automation.
- Add protected production environments and approval gates.
- For Terraform, configure protected remote state before pipeline setup and account for current AZD authentication limitations.

## Validate before finishing

Run only checks applicable to the repository:

```text
Application: existing formatter, linter, type-check, build, and tests
Bicep:      az bicep build --file infra/main.bicep
Terraform:  terraform fmt -check -recursive
            terraform init -backend=false
            terraform validate
AZD hooks:  azd hooks run <hook-name>
Packaging:  azd package
```

For a Bicep what-if or Terraform plan, choose the correct deployment scope and environment. These checks can authenticate to Azure or read remote state, so follow the safety guardrails.

Verify that:

- `azure.yaml` paths exist and service settings match the source projects.
- The IaC entry point and provider agree with `azure.yaml`.
- Required deployment outputs match the variables consumed by services, hooks, and pipelines.
- `.gitignore` excludes `.azure`, secrets, local state, and generated artifacts.
- No secret appears in tracked content or command output.
- Documentation explains prerequisites, environment creation, deployment, verification, and cleanup.

## Report the result

State:

- The files and behavior changed.
- The IaC provider and environment assumptions.
- The checks performed.
- Any cloud-changing command deliberately not run.
- Any beta or preview feature the solution relies on.

Do not claim deployment success unless the target environment was actually deployed and verified.

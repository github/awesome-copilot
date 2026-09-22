# Security, hooks, CI/CD, and operations

## Identity and secret handling

Use this order of preference:

1. Managed identity with least-privilege RBAC.
2. Workload identity federation for CI/CD.
3. Key Vault reference through `azd env set-secret`.
4. Short-lived secret material only when no identity-based option exists.

Never:

- Store a plaintext secret in `.azure/<environment>/.env`.
- Commit environment files, credentials, certificates, or Terraform state.
- Put secrets in IaC outputs.
- Echo environment values indiscriminately in hooks or pipelines.
- Pass a secret directly on a command line when the shell or CI system can record it.
- Grant broad subscription roles when resource-group or resource scope is enough.

`azd env set-secret <name>` stores a Key Vault reference in the AZD environment. Resolve it only where needed:

- Map it to an `@secure()` Bicep parameter.
- Use a hook `secrets` mapping for a hook process.
- Choose between a pipeline variable containing the Key Vault reference or a pipeline secret containing the resolved value.

Prefer the reference approach when the pipeline identity can read Key Vault because rotation does not require republishing a resolved pipeline secret.

## Hooks

Use hooks for validation, generated runtime configuration, data preparation, smoke checks, or lifecycle coordination that IaC and native AZD behavior cannot express.

### Hook rules

- Prefer external scripts over long inline commands.
- Store scripts under `scripts/azd`.
- Set `shell: sh` or `shell: pwsh` explicitly.
- Supply `windows` and `posix` implementations when syntax differs.
- Use paths relative to the documented hook working directory.
- Make scripts idempotent and safe to rerun.
- Keep `continueOnError` false unless the operation is observability-only or genuinely optional.
- Use noninteractive behavior in CI.
- Do not install unpinned dependencies on every run if a reproducible tool setup can do it once.
- Do not log secret values or all environment variables.
- Test with `azd hooks run <hook-name>` before coupling the hook to a complete deployment.

Example:

```yaml
hooks:
  preprovision:
    windows:
      shell: pwsh
      run: ./scripts/azd/validate.ps1
      interactive: false
      continueOnError: false
    posix:
      shell: sh
      run: ./scripts/azd/validate.sh
      interactive: false
      continueOnError: false
```

Use root hooks for the whole project. Put service-specific hooks under that service's `azure.yaml` entry.

## Deployment workflow

The normal AZD lifecycle is:

1. Package application artifacts.
2. Provision or update infrastructure.
3. Deploy application artifacts.

`azd up` is the convenient combined workflow and is appropriate for routine development and simple deployments.

Use separate commands when:

- Infrastructure review or approval must happen before deployment.
- The application is redeployed frequently without infrastructure changes.
- Troubleshooting requires isolating package, provision, or deploy failures.
- A complex dependency requires a custom order.

```text
azd package
azd provision -e <environment>
azd deploy -e <environment>
```

Customize `workflows.up.steps` only when a real dependency requires another order, such as provisioning before a build that needs a generated endpoint. Do not customize the workflow merely to mirror a pipeline's naming conventions.

## Full-stack and multi-service dependencies

- Map service dependencies before implementation.
- Let Bicep or Terraform handle one-directional infrastructure dependencies.
- Use provisioning outputs for endpoints and names needed during deployment.
- Use runtime configuration, such as Azure App Configuration or a generated config file, when settings must change without rebuilding.
- Avoid circular compile-time dependencies between front-end and back-end services.
- Use hooks or a custom workflow only when outputs and runtime configuration cannot resolve the dependency.
- Test the strategy independently in development, test, and production-like environments.

## CI/CD

### Pipeline design

A robust pipeline separates:

1. Application format, lint, build, and tests.
2. IaC format and static validation.
3. What-if or plan review at the correct scope.
4. Provisioning with an explicit AZD environment.
5. Deployment.
6. Smoke or health verification.
7. Production approval and rollback/cleanup procedures.

Use:

- `--no-prompt` in automation.
- A fixed `-e` or `--environment`.
- Protected environments and required reviewers for production.
- Concurrency controls to prevent simultaneous writes to one environment.
- Least-privilege identities scoped to the target environment.
- Pinned action and tool versions with a managed update process.

### `azd pipeline config`

Current Microsoft documentation marks `azd pipeline config` as beta. Before running it:

- Review the pipeline definition bundled with the template.
- Confirm repository, organization, environment, subscription, and authentication mode.
- Expect repository, identity, variable, secret, commit, push, and pipeline side effects.
- Review generated workflow and permission changes before production use.
- Rerun it when `pipeline.variables` or `pipeline.secrets` changes.

For GitHub Actions, AZD configures OIDC/federated credentials by default for supported scenarios. Current documentation says the AZD Terraform pipeline flow does not support OIDC, so evaluate the authentication tradeoff explicitly rather than silently falling back to a long-lived credential.

For Terraform, configure protected remote state before pipeline setup.

## Validation and preview

Run local checks before Azure-changing commands:

### Bicep

```text
az bicep build --file infra/main.bicep
```

Use an Azure deployment what-if at the scope declared by the template. Do not assume resource-group scope.

### Terraform

```text
terraform fmt -check -recursive
terraform init -backend=false
terraform validate
```

Use `terraform plan` only after confirming the backend, workspace/state key, variables, and Azure identity.

### AZD and application

- Run existing application checks.
- Run relevant hooks independently.
- Run `azd package` to verify service paths and packaging.
- Confirm IaC outputs match variables consumed during deployment.
- Inspect the environment name before provision, deploy, or down.

## Troubleshooting sequence

1. Identify whether the failure is package, provision, deploy, hook, authentication, or resource discovery.
2. Re-run the smallest failing phase rather than `azd up`.
3. Check the selected environment and expected subscription, tenant, and region.
4. Check `azure.yaml` paths, provider, service names, host types, and resource discovery tags.
5. Refresh environment outputs with `azd env refresh` when Azure state changed elsewhere.
6. For Terraform, verify both AZD and Azure CLI authentication and the correct remote state.
7. For hooks, run the hook directly and verify its shell, working directory, and environment dependencies.
8. Use debug logging only when needed, and redact sensitive values before sharing logs.

## Cleanup

- Confirm the exact environment before `azd down`.
- Explain that cleanup can delete data-bearing resources.
- Preserve externally owned or shared resources.
- For ephemeral environments, automate cleanup and include a fallback for failed pipeline runs.
- Verify deletion rather than assuming command success.

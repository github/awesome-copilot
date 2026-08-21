# Project structure and `azure.yaml`

## Recommended repository layout

Use this as a default, not as a reason to reorganize an already coherent repository:

```text
.
|-- .azure/                         # Generated local AZD environment state; ignored
|-- .devcontainer/                  # Optional reproducible developer environment
|-- .github/
|   |-- workflows/
|       |-- azure-dev.yml           # Optional GitHub Actions pipeline
|-- infra/
|   |-- main.bicep                  # Bicep orchestration entry point
|   |-- main.parameters.json        # AZD environment-to-Bicep parameter mapping
|   |-- modules/
|       |-- core/                   # Shared platform resources
|       |-- app/                    # Application-specific resources
|-- scripts/
|   |-- azd/                        # Hook and deployment helper scripts
|-- src/
|   |-- api/                        # Independently deployable service
|   |-- web/                        # Independently deployable service
|-- tests/
|-- .gitignore
|-- azure.yaml
|-- README.md
```

For Terraform, use a conventional `infra` layout:

```text
infra/
|-- main.tf
|-- providers.tf
|-- variables.tf
|-- outputs.tf
|-- provider.conf.json              # AZD remote backend configuration, when used
|-- modules/
```

### Structure rules

- Place `azure.yaml` at the project root.
- Keep application source independent from deployment assets.
- Keep the IaC entry point small; move resource details into modules.
- Organize modules by responsibility or lifecycle, not one arbitrary file per resource.
- Keep hook scripts outside `infra` unless a script belongs exclusively to an infrastructure layer.
- Avoid committed environment-specific source trees such as `infra/dev`, `infra/test`, and `infra/prod`. Use parameters.
- Keep tests near their normal language conventions; do not move them merely to fit this example.
- Include `.devcontainer` only when it is maintained and tested.

## `azure.yaml` baseline

Add the schema directive for editor validation:

```yaml
# yaml-language-server: $schema=https://raw.githubusercontent.com/Azure/azure-dev/main/schemas/v1.0/azure.yaml.json
name: sample-app

infra:
  provider: bicep
  path: ./infra
  module: main

services:
  api:
    project: ./src/api
    language: ts
    host: appservice
  web:
    project: ./src/web
    dist: dist
    language: ts
    host: staticwebapp
```

The explicit `infra` block is useful when clarity matters, even though Bicep, `infra`, and `main` are defaults.

## Manifest design checklist

### Top-level configuration

- `name` is lowercase, starts and ends with an alphanumeric character, and uses only alphanumerics and hyphens.
- `metadata.template` identifies the source template and version when the repository is distributed as a template.
- `infra.provider`, `infra.path`, and `infra.module` match the actual repository.
- `requiredVersions` is used when the project depends on a minimum AZD or extension version.
- `workflows` overrides defaults only when deployment ordering genuinely requires it.
- `state.remote` is configured at project scope when teams share AZD environments.

### Services

- A service represents deployable application code, not a database, Key Vault, or other shared resource.
- Service names are short, meaningful, and stable.
- `project` points to the service root and uses a relative path.
- `language`, `host`, `dist`, container, and remote-build settings match how the service is built.
- A Container Apps service uses either `project` or `image`, not both.
- `resourceName` is set only when standard AZD discovery through the `azd-service-name` tag is unavailable or intentionally bypassed.
- Dependencies use supported `uses` relationships rather than implicit assumptions.
- Environment variables use substitutions or IaC outputs rather than hard-coded environment values.

### Resources and infrastructure

- Shared Azure resources stay in IaC.
- Service modules and AZD service names align so resource discovery is predictable.
- Custom resource group names include environment identity and comply with Azure naming constraints.
- Infrastructure layers are reserved for independently provisioned units, different scopes, or hook-mediated dependencies.
- Layer dependencies are explicit with `dependsOn` when AZD cannot infer them.

### Pipelines and hooks

- `pipeline.variables` contains nonsecret configuration.
- `pipeline.secrets` is used only when the pipeline must store the resolved value instead of a Key Vault reference.
- Root hooks handle project-wide work; service hooks handle one service.
- Hook scripts use explicit shells and portable paths.
- Hooks do not duplicate application tests or declarative IaC behavior.

## README requirements for a reusable AZD project

Document:

1. Architecture and deployed Azure services.
2. Local prerequisites, including AZD and provider-specific tools.
3. Authentication requirements.
4. How to create or select an environment.
5. Required nonsecret variables and how to set them.
6. How secrets are supplied without exposing their values.
7. How to run, test, provision, deploy, monitor, and troubleshoot.
8. Expected cost-bearing resources.
9. How to clean up safely.
10. Any beta or preview dependencies, including Terraform or pipeline features when applicable.

Do not put actual subscription IDs, tenant IDs, secret names that reveal sensitive systems, or production endpoints in reusable documentation.

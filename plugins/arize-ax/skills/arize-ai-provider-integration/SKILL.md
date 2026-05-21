---
name: arize-ai-provider-integration
<<<<<<< HEAD
description: Creates, reads, updates, and deletes Arize AI integrations that store LLM provider credentials used by evaluators and other Arize features. Supports any LLM provider (e.g. OpenAI, Anthropic, Azure OpenAI, AWS Bedrock, Vertex AI, Gemini, NVIDIA NIM). Use when the user mentions AI integration, LLM provider credentials, create integration, list integrations, update credentials, delete integration, or connecting an LLM provider to Arize.
metadata:
  author: arize
  version: "1.0"
compatibility: Requires the ax CLI and a configured Arize profile.
=======
description: "INVOKE THIS SKILL when creating, reading, updating, or deleting Arize AI integrations. Covers listing integrations, creating integrations for any supported LLM provider (OpenAI, Anthropic, Azure OpenAI, AWS Bedrock, Vertex AI, Gemini, NVIDIA NIM, custom), updating credentials or metadata, and deleting integrations using the ax CLI."
>>>>>>> 8fbf6c4a798df51d1d1d8fd37a1aa7e94203109c
---

# Arize AI Integration Skill

<<<<<<< HEAD
> **`SPACE`** — Most `--space` flags and the `ARIZE_SPACE` env var accept a space **name** (e.g., `my-workspace`) or a base64 space **ID** (e.g., `U3BhY2U6...`). Find yours with `ax spaces list`.
> **Note:** `ai-integrations create` does **not** accept `--space` — AI integrations are account-scoped. Use `--space` only with `list`, `get`, `update`, and `delete`.

=======
>>>>>>> 8fbf6c4a798df51d1d1d8fd37a1aa7e94203109c
## Concepts

- **AI Integration** = stored LLM provider credentials registered in Arize; used by evaluators to call a judge model and by other Arize features that need to invoke an LLM on your behalf
- **Provider** = the LLM service backing the integration (e.g., `openAI`, `anthropic`, `awsBedrock`)
- **Integration ID** = a base64-encoded global identifier for an integration (e.g., `TGxtSW50ZWdyYXRpb246MTI6YUJjRA==`); required for evaluator creation and other downstream operations
- **Scoping** = visibility rules controlling which spaces or users can use an integration
- **Auth type** = how Arize authenticates with the provider: `default` (provider API key), `proxy_with_headers` (proxy via custom headers), or `bearer_token` (bearer token auth)

## Prerequisites

Proceed directly with the task — run the `ax` command you need. Do NOT check versions, env vars, or profiles upfront.

If an `ax` command fails, troubleshoot based on the error:
- `command not found` or version error → see references/ax-setup.md
<<<<<<< HEAD
- `401 Unauthorized` / missing API key → run `ax profiles show` to inspect the current profile. If the profile is missing or the API key is wrong, follow references/ax-profiles.md to create/update it. If the user doesn't have their key, direct them to https://app.arize.com/admin > API Keys
- Space unknown → run `ax spaces list` to pick by name, or ask the user
- LLM provider call fails (missing OPENAI_API_KEY / ANTHROPIC_API_KEY) → run `ax ai-integrations list --space SPACE` to check for platform-managed credentials. If none exist, ask the user to provide the key or create an integration via the **arize-ai-provider-integration** skill
- **Security:** Never read `.env` files or search the filesystem for credentials. Use `ax profiles` for Arize credentials and `ax ai-integrations` for LLM provider keys. If credentials are not available through these channels, ask the user.
=======
- `401 Unauthorized` / missing API key → run `ax profiles show` to inspect the current profile. If the profile is missing or the API key is wrong: check `.env` for `ARIZE_API_KEY` and use it to create/update the profile via references/ax-profiles.md. If `.env` has no key either, ask the user for their Arize API key (https://app.arize.com/admin > API Keys)
- Space ID unknown → check `.env` for `ARIZE_SPACE_ID`, or run `ax spaces list -o json`, or ask the user
- LLM provider call fails (missing OPENAI_API_KEY / ANTHROPIC_API_KEY) → check `.env`, load if present, otherwise ask the user
>>>>>>> 8fbf6c4a798df51d1d1d8fd37a1aa7e94203109c

---

## List AI Integrations

List all integrations accessible in a space:

```bash
<<<<<<< HEAD
ax ai-integrations list --space SPACE
=======
ax ai-integrations list --space-id SPACE_ID
>>>>>>> 8fbf6c4a798df51d1d1d8fd37a1aa7e94203109c
```

Filter by name (case-insensitive substring match):

```bash
<<<<<<< HEAD
ax ai-integrations list --space SPACE --name "openai"
=======
ax ai-integrations list --space-id SPACE_ID --name "openai"
>>>>>>> 8fbf6c4a798df51d1d1d8fd37a1aa7e94203109c
```

Paginate large result sets:

```bash
# Get first page
<<<<<<< HEAD
ax ai-integrations list --space SPACE --limit 20 -o json

# Get next page using cursor from previous response
ax ai-integrations list --space SPACE --limit 20 --cursor CURSOR_TOKEN -o json
=======
ax ai-integrations list --space-id SPACE_ID --limit 20 -o json

# Get next page using cursor from previous response
ax ai-integrations list --space-id SPACE_ID --limit 20 --cursor CURSOR_TOKEN -o json
>>>>>>> 8fbf6c4a798df51d1d1d8fd37a1aa7e94203109c
```

**Key flags:**

| Flag | Description |
|------|-------------|
<<<<<<< HEAD
| `--space` | Space name or ID to filter integrations |
| `--name` | Case-insensitive substring filter on integration name |
| `--limit` | Max results (1–100, default 15) |
=======
| `--space-id` | Space to list integrations in |
| `--name` | Case-insensitive substring filter on integration name |
| `--limit` | Max results (1–100, default 50) |
>>>>>>> 8fbf6c4a798df51d1d1d8fd37a1aa7e94203109c
| `--cursor` | Pagination token from a previous response |
| `-o, --output` | Output format: `table` (default) or `json` |

**Response fields:**

| Field | Description |
|-------|-------------|
| `id` | Base64 integration ID — copy this for downstream commands |
| `name` | Human-readable name |
| `provider` | LLM provider enum (see Supported Providers below) |
| `has_api_key` | `true` if credentials are stored |
| `model_names` | Allowed model list, or `null` if all models are enabled |
| `enable_default_models` | Whether default models for this provider are allowed |
| `function_calling_enabled` | Whether tool/function calling is enabled |
| `auth_type` | Authentication method: `default`, `proxy_with_headers`, or `bearer_token` |

---

## Get a Specific Integration

```bash
<<<<<<< HEAD
ax ai-integrations get NAME_OR_ID
ax ai-integrations get NAME_OR_ID -o json
ax ai-integrations get NAME_OR_ID --space SPACE   # required when using name instead of ID
=======
ax ai-integrations get INT_ID
ax ai-integrations get INT_ID -o json
>>>>>>> 8fbf6c4a798df51d1d1d8fd37a1aa7e94203109c
```

Use this to inspect an integration's full configuration or to confirm its ID after creation.

---

## Create an AI Integration

Before creating, always list integrations first — the user may already have a suitable one:

```bash
<<<<<<< HEAD
ax ai-integrations list --space SPACE
=======
ax ai-integrations list --space-id SPACE_ID
>>>>>>> 8fbf6c4a798df51d1d1d8fd37a1aa7e94203109c
```

If no suitable integration exists, create one. The required flags depend on the provider.

### OpenAI

```bash
ax ai-integrations create \
  --name "My OpenAI Integration" \
  --provider openAI \
  --api-key $OPENAI_API_KEY
```

### Anthropic

```bash
ax ai-integrations create \
  --name "My Anthropic Integration" \
  --provider anthropic \
  --api-key $ANTHROPIC_API_KEY
```

### Azure OpenAI

```bash
ax ai-integrations create \
  --name "My Azure OpenAI Integration" \
  --provider azureOpenAI \
  --api-key $AZURE_OPENAI_API_KEY \
  --base-url "https://my-resource.openai.azure.com/"
```

### AWS Bedrock

<<<<<<< HEAD
AWS Bedrock uses IAM role-based auth. Provide the ARN of the role Arize should assume via `--provider-metadata`:
=======
AWS Bedrock uses IAM role-based auth instead of an API key. Provide the ARN of the role Arize should assume:
>>>>>>> 8fbf6c4a798df51d1d1d8fd37a1aa7e94203109c

```bash
ax ai-integrations create \
  --name "My Bedrock Integration" \
  --provider awsBedrock \
<<<<<<< HEAD
  --provider-metadata '{"role_arn": "arn:aws:iam::123456789012:role/ArizeBedrockRole"}'
=======
  --role-arn "arn:aws:iam::123456789012:role/ArizeBedrockRole"
>>>>>>> 8fbf6c4a798df51d1d1d8fd37a1aa7e94203109c
```

### Vertex AI

<<<<<<< HEAD
Vertex AI uses GCP service account credentials. Provide the GCP project and region via `--provider-metadata`:
=======
Vertex AI uses GCP service account credentials. Provide the GCP project and region:
>>>>>>> 8fbf6c4a798df51d1d1d8fd37a1aa7e94203109c

```bash
ax ai-integrations create \
  --name "My Vertex AI Integration" \
  --provider vertexAI \
<<<<<<< HEAD
  --provider-metadata '{"project_id": "my-gcp-project", "location": "us-central1"}'
=======
  --project-id "my-gcp-project" \
  --location "us-central1"
>>>>>>> 8fbf6c4a798df51d1d1d8fd37a1aa7e94203109c
```

### Gemini

```bash
ax ai-integrations create \
  --name "My Gemini Integration" \
  --provider gemini \
  --api-key $GEMINI_API_KEY
```

### NVIDIA NIM

```bash
ax ai-integrations create \
  --name "My NVIDIA NIM Integration" \
  --provider nvidiaNim \
  --api-key $NVIDIA_API_KEY \
  --base-url "https://integrate.api.nvidia.com/v1"
```

### Custom (OpenAI-compatible endpoint)

```bash
ax ai-integrations create \
  --name "My Custom Integration" \
  --provider custom \
  --base-url "https://my-llm-proxy.example.com/v1" \
  --api-key $CUSTOM_LLM_API_KEY
```

### Supported Providers

| Provider | Required extra flags |
|----------|---------------------|
| `openAI` | `--api-key <key>` |
| `anthropic` | `--api-key <key>` |
| `azureOpenAI` | `--api-key <key>`, `--base-url <azure-endpoint>` |
<<<<<<< HEAD
| `awsBedrock` | `--provider-metadata '{"role_arn": "<arn>"}'` |
| `vertexAI` | `--provider-metadata '{"project_id": "<gcp-project>", "location": "<region>"}'` |
=======
| `awsBedrock` | `--role-arn <arn>` |
| `vertexAI` | `--project-id <gcp-project>`, `--location <region>` |
>>>>>>> 8fbf6c4a798df51d1d1d8fd37a1aa7e94203109c
| `gemini` | `--api-key <key>` |
| `nvidiaNim` | `--api-key <key>`, `--base-url <nim-endpoint>` |
| `custom` | `--base-url <endpoint>` |

### Optional flags for any provider

| Flag | Description |
|------|-------------|
<<<<<<< HEAD
| `--model-name` | Allowed model name (repeat for multiple, e.g. `--model-name gpt-4o --model-name gpt-4o-mini`); omit to allow all models |
| `--enable-default-models` | Enable the provider's default model list |
| `--function-calling-enabled` | Enable tool/function calling support |
| `--auth-type` | Authentication type: `default`, `proxy_with_headers`, or `bearer_token` |
| `--headers` | Custom headers as JSON object or file path (for proxy auth) |
| `--provider-metadata` | Provider-specific metadata as JSON object or file path |
=======
| `--model-names` | Comma-separated list of allowed model names; omit to allow all models |
| `--enable-default-models` / `--no-default-models` | Enable or disable the provider's default model list |
| `--function-calling` / `--no-function-calling` | Enable or disable tool/function calling support |
>>>>>>> 8fbf6c4a798df51d1d1d8fd37a1aa7e94203109c

### After creation

Capture the returned integration ID (e.g., `TGxtSW50ZWdyYXRpb246MTI6YUJjRA==`) — it is needed for evaluator creation and other downstream commands. If you missed it, retrieve it:

```bash
<<<<<<< HEAD
ax ai-integrations list --space SPACE -o json
# or by name/ID directly:
ax ai-integrations get NAME_OR_ID
=======
ax ai-integrations list --space-id SPACE_ID -o json
# or, if you know the ID:
ax ai-integrations get INT_ID
>>>>>>> 8fbf6c4a798df51d1d1d8fd37a1aa7e94203109c
```

---

## Update an AI Integration

`update` is a partial update — only the flags you provide are changed. Omitted fields stay as-is.

```bash
# Rename
<<<<<<< HEAD
ax ai-integrations update NAME_OR_ID --name "New Name"

# Rotate the API key
ax ai-integrations update NAME_OR_ID --api-key $OPENAI_API_KEY

# Change the model list (replaces all existing model names)
ax ai-integrations update NAME_OR_ID --model-name gpt-4o --model-name gpt-4o-mini

# Update base URL (for Azure, custom, or NIM)
ax ai-integrations update NAME_OR_ID --base-url "https://new-endpoint.example.com/v1"
```

Add `--space SPACE` when using a name instead of ID. Any flag accepted by `create` can be passed to `update`.
=======
ax ai-integrations update INT_ID --name "New Name"

# Rotate the API key
ax ai-integrations update INT_ID --api-key $OPENAI_API_KEY

# Change the model list
ax ai-integrations update INT_ID --model-names "gpt-4o,gpt-4o-mini"

# Update base URL (for Azure, custom, or NIM)
ax ai-integrations update INT_ID --base-url "https://new-endpoint.example.com/v1"
```

Any flag accepted by `create` can be passed to `update`.
>>>>>>> 8fbf6c4a798df51d1d1d8fd37a1aa7e94203109c

---

## Delete an AI Integration

**Warning:** Deletion is permanent. Evaluators that reference this integration will no longer be able to run.

```bash
<<<<<<< HEAD
ax ai-integrations delete NAME_OR_ID --force
ax ai-integrations delete NAME_OR_ID --space SPACE --force   # required when using name instead of ID
=======
ax ai-integrations delete INT_ID --force
>>>>>>> 8fbf6c4a798df51d1d1d8fd37a1aa7e94203109c
```

Omit `--force` to get a confirmation prompt instead of deleting immediately.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `ax: command not found` | See references/ax-setup.md |
| `401 Unauthorized` | API key may not have access to this space. Verify key and space ID at https://app.arize.com/admin > API Keys |
| `No profile found` | Run `ax profiles show --expand`; set `ARIZE_API_KEY` env var or write `~/.arize/config.toml` |
<<<<<<< HEAD
| `Integration not found` | Verify with `ax ai-integrations list --space SPACE` |
| `has_api_key: false` after create | Credentials were not saved — re-run `update` with the correct `--api-key` or `--provider-metadata` |
=======
| `Integration not found` | Verify with `ax ai-integrations list --space-id SPACE_ID` |
| `has_api_key: false` after create | Credentials were not saved — re-run `update` with the correct `--api-key` or `--role-arn` |
>>>>>>> 8fbf6c4a798df51d1d1d8fd37a1aa7e94203109c
| Evaluator runs fail with LLM errors | Check integration credentials with `ax ai-integrations get INT_ID`; rotate the API key if needed |
| `provider` mismatch | Cannot change provider after creation — delete and recreate with the correct provider |

---

## Related Skills

- **arize-evaluator**: Create LLM-as-judge evaluators that use an AI integration → use `arize-evaluator`
- **arize-experiment**: Run experiments that use evaluators backed by an AI integration → use `arize-experiment`

---

## Save Credentials for Future Use

See references/ax-profiles.md § Save Credentials for Future Use.

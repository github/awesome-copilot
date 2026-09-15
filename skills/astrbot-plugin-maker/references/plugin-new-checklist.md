# Plugin packaging and release

Use this for a new plugin or packaging changes. See [sources](sources.md) for the
official guides and the v4.28.0 verification baseline.

## Files and metadata

`main.py` contains the plugin class. New plugins should include `metadata.yaml`;
the pinned loader also accepts `metadata.yml`. Runtime validation requires
non-empty string values for `name`, `desc`, `version`, and `author`.
It accepts `description` as a legacy alias for `desc`; use `desc` for new work.
Quote version-like YAML values so, for example, `1.0` does not become a number.

Add the **real** `repo` URL when known, particularly for releases and updates.
It is not part of the four-field runtime minimum. Never invent an author or
repository to make a release check pass.

Common optional fields include `display_name`, `short_desc`,
`support_platforms`, and `astrbot_version`. The publishing guide additionally
describes `social_link` and `tags`. The runtime also has version-specific metadata
such as Pages. Consult the relevant source instead of rejecting every unlisted key.

- `version`: the plugin's own version, preferably a quoted semantic version.
- `astrbot_version`: a PEP 440 constraint on AstrBot, e.g. `">=4.28.0,<5"`.
  Do not use `">=v4.28.0"`. Select the lower bound from APIs actually needed and
  verified. The scaffold's default is its tested baseline.
- Keep the existing metadata name stable during repairs; changing it can change
  plugin identity, configuration, and storage.
- Prefer a lowercase directory/repository name beginning `astrbot_plugin_`.

## Adapter declarations

`support_platforms` is optional. Leaving it absent makes no tested-compatibility
claim. When present, use a list of adapter keys, not display labels or configured
bot IDs. Verified v4.28.0 keys from `ADAPTER_NAME_2_TYPE`:

```text
aiocqhttp qq_official qq_official_webhook telegram wecom wecom_ai_bot
lark dingtalk discord slack kook vocechat weixin_official_account
satori misskey line matrix weixin_oc mattermost webchat
```

This is a dated reference, not an eternal allowlist. Recheck it for the target
release. Generic components do not prove every adapter supports a feature;
OneBot-specific forwarding or raw calls require adapter-specific validation.

## Dependencies and assets

- Put third-party runtime dependencies actually used in `requirements.txt`.
  The greeting scaffold uses only AstrBot and the standard library, so it needs no
  runtime requirements file.
- Keep pytest, Ruff, and other development tools in `requirements-dev.txt`.
  Do not add AstrBot itself to a plugin's runtime dependencies merely to test it.
- Use `_conf_schema.json` only for configurable behavior. For a few settings it is
  simpler than a custom Page. See [API patterns](api-patterns.md).
- `logo.png` is optional; the guide recommends a square 256×256 image.
- Preserve required notices when adapting external code/assets. Link design sources
  when borrowing an implementation idea.

## When publication is requested

Confirm the real repository metadata, dependency installation, requested behavior,
and supported versions/platforms. Run the static validator with `--require-repo`;
its result is only a local file check.

The official publishing route is [AstrBot Cloud](https://cloud.astrbot.app/publish).
The guide currently limits marketplace ZIPs to 16 MB. Prepare the actual archive
without caches, virtual environments, credentials, or runtime data, and recheck the
current publishing requirements. A local check or a GitHub PR is not marketplace
acceptance. Follow the user's existing publication authorization and destination.

# Verified sources and refresh map

Checked **2026-09-09** against [AstrBot v4.28.0](https://github.com/AstrBotDevs/AstrBot/releases/tag/v4.28.0),
commit `a412146401426c0cdff8bbefb8627a03da519da8`. The release requires Python 3.12+.
These are baseline observations, not claims about every AstrBot version.

## Retrieve only the material needed

| Subject | Official guide | Pinned implementation / evidence |
| --- | --- | --- |
| Plugin entrypoint and handlers | [Minimal example](https://docs.astrbot.app/dev/star/guides/simple.html) | [Star discovery and lifecycle](https://github.com/AstrBotDevs/AstrBot/blob/a412146401426c0cdff8bbefb8627a03da519da8/astrbot/core/star/base.py) |
| Metadata and compatibility | [New plugin](https://docs.astrbot.app/dev/star/plugin-new.html) | [Metadata validation](https://github.com/AstrBotDevs/AstrBot/blob/a412146401426c0cdff8bbefb8627a03da519da8/astrbot/core/star/updater.py), [loader](https://github.com/AstrBotDevs/AstrBot/blob/a412146401426c0cdff8bbefb8627a03da519da8/astrbot/core/star/star_manager.py) |
| Adapter identifiers | [Platform declarations](https://docs.astrbot.app/dev/star/plugin-new.html) | [ADAPTER_NAME_2_TYPE](https://github.com/AstrBotDevs/AstrBot/blob/a412146401426c0cdff8bbefb8627a03da519da8/astrbot/core/star/filter/platform_adapter_type.py) |
| Commands and hooks | [Receive events](https://docs.astrbot.app/dev/star/guides/listen-message-event.html) | [Handler registration](https://github.com/AstrBotDevs/AstrBot/blob/a412146401426c0cdff8bbefb8627a03da519da8/astrbot/core/star/register/star_handler.py) |
| Message chains and UMO | [Send messages](https://docs.astrbot.app/dev/star/guides/send-message.html) | [Event API](https://github.com/AstrBotDevs/AstrBot/blob/a412146401426c0cdff8bbefb8627a03da519da8/astrbot/core/platform/astr_message_event.py) |
| Configuration | [Plugin config](https://docs.astrbot.app/dev/star/guides/plugin-config.html) | [AstrBotConfig](https://github.com/AstrBotDevs/AstrBot/blob/a412146401426c0cdff8bbefb8627a03da519da8/astrbot/core/config/astrbot_config.py) |
| Persistent data | [Storage](https://docs.astrbot.app/dev/star/guides/storage.html) | [StarTools.get_data_dir](https://github.com/AstrBotDevs/AstrBot/blob/a412146401426c0cdff8bbefb8627a03da519da8/astrbot/core/star/star_tools.py) |
| LLM and tools | [AI guide](https://docs.astrbot.app/dev/star/guides/ai.html) | [Context methods](https://github.com/AstrBotDevs/AstrBot/blob/a412146401426c0cdff8bbefb8627a03da519da8/astrbot/core/star/context.py) |
| HTTP endpoints and scopes | [HTTP API](https://docs.astrbot.app/dev/openapi.html), [scope table](https://docs.astrbot.app/dev/openapi-scopes.html) | [OpenAPI spec](https://github.com/AstrBotDevs/AstrBot/blob/a412146401426c0cdff8bbefb8627a03da519da8/openspec/openapi-v1.yaml), [route handlers](https://github.com/AstrBotDevs/AstrBot/blob/a412146401426c0cdff8bbefb8627a03da519da8/astrbot/dashboard/api/open_api.py) |
| HTTP response bodies | [Interactive reference](https://docs.astrbot.app/scalar.html) | [OpenApiService](https://github.com/AstrBotDevs/AstrBot/blob/a412146401426c0cdff8bbefb8627a03da519da8/astrbot/dashboard/services/open_api_service.py) |
| Custom plugin pages | [Pages](https://docs.astrbot.app/dev/star/guides/plugin-pages.html) | [Public web helpers](https://github.com/AstrBotDevs/AstrBot/blob/a412146401426c0cdff8bbefb8627a03da519da8/astrbot/api/web.py) |
| Release and runtime setup | [Publish](https://docs.astrbot.app/dev/star/plugin-publish.html), [source deployment](https://docs.astrbot.app/deploy/astrbot/cli.html) | [pyproject.toml](https://github.com/AstrBotDevs/AstrBot/blob/a412146401426c0cdff8bbefb8627a03da519da8/pyproject.toml) |

The documentation source is in the **AstrBot repository**, under
`docs/zh/dev/star/` and `docs/zh/dev/openapi*.md`. Do not assume a separate docs
repository exists. The [official starter](https://github.com/Soulter/helloworld/tree/0c0d52b17e2feb76a7bcff887cac3d0e12eecc09)
was also inspected; use its project shape, with the version differences below.

## Observed differences to resolve deliberately

- The starter still uses `@register`. In the pinned runtime,
  [register_star](https://github.com/AstrBotDevs/AstrBot/blob/a412146401426c0cdff8bbefb8627a03da519da8/astrbot/core/star/register/star.py)
  marks this decorator deprecated; subclasses are auto-discovered after 3.5.19.
- The prose HTTP guide uses `POST /api/v1/im/message`. The pinned spec's canonical
  path is `/api/v1/im/messages`; the runtime retains the singular path as an alias.
  Likewise, use `GET /api/v1/chat/configs` for chat configuration choices, checking
  older aliases against the target instead of extrapolating a path.
- The static spec represents `POST /api/v1/chat` with a generic success response.
  The API-key route implementation returns `text/event-stream`. It also enforces
  a `username` even though the generic schema cannot fully express the auth-specific
  requirement. Inspect content type and route logic, not only a generic envelope.
- The prose adapter list omits `webchat`; the pinned `ADAPTER_NAME_2_TYPE` includes
  it. Metadata declarations should reflect the intended, tested platform behavior.
- Plugin `version` and `astrbot_version` are different fields. The starter uses
  `version: v1.3.0`; the compatibility constraint should omit the `v` prefix.

## Refresh for another target

Read the installed version or checkout tag first. Fetch the matching guide/source
sections from that tag and record the relevant signatures and any differences.
For HTTP integrations, prefer the target server's `/api/v1/openapi.json` and
`/api/v1/docs`, then its handlers when the schema is ambiguous. Access only the
server already selected for the task.

Keep references concise: retain verified decisions, links, and small examples.
Do not vendor the full AstrBot documentation or copy third-party plugin code without
its required attribution/license material.

## Skill provenance

Adapted from [Elysium-Seeker/astrbot_plugin_maker_skill](https://github.com/Elysium-Seeker/astrbot_plugin_maker_skill/tree/40887d7827fa6ef3dd8e656f38eddbd369efe689),
which contains the scaffold regression suite and Windows/Linux/real-SDK CI workflow.
The contributed copy is self-contained; using it does not require cloning that repository.

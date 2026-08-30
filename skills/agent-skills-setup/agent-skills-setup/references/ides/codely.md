# codely

<!-- GENERATED: ide-paths.json summary; do not edit this block -->

| Object | Documented path |
| --- | --- |
| Global skills | `~/.codely-cli/skills` |
| Project skills | `.codely-cli/skills` |
| Rules | `CODELY.md` |
| MCP | `~/.codely-cli/settings.json` |
| Project MCP | `.codely-cli/settings.json` |
| Project config | `.codely-cli/settings.json` |
| Config | `~/.codely-cli/settings.json` |

<!-- END GENERATED: ide-paths.json summary -->

## Status

Codely / Tuanjie Cowork is an active Unity China product family, but the public
material and observed local layouts do not establish one versioned contract
shared by the CLI, Cowork app, engine integration, and IDE extensions. In
particular, the repository has no reviewed Codely target adapter that validates
the complete MCP transport and settings schema.

The paths above are retained only for read-only discovery of an existing
installation. Registry v2 classifies this entry as `unverified` and
`manual-reference`:

- do not use Codely as an automatic source or target;
- do not pass MCP objects through verbatim;
- do not copy `settings.json`, `CODELY.md`, generated memories, Context/RAG
  indexes, Unity Insight state, agents, extensions, hooks, or LSP state;
- review the active product/version and reconstruct approved content manually;
- bind credentials after reconstruction through the product's supported secret
  or environment mechanism.

Moving Codely to `partial` requires an official, versioned schema; separate
profiles for each product surface; source and target adapters; native parser or
CLI verification; and golden fixtures for every automated surface.

Sources: [Tuanjie Codely overview](https://developer.unity.cn/projects/6a7189bcedbc2a120fe6d4af), [Tuanjie Cowork](https://codely.tuanjie.cn/download), [AI environment setup](https://codely-docs.tuanjie.cn/learn/ai-programming-environment-setup-guide).

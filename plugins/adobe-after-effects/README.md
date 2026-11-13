# Adobe After Effects Plugin

Adobe After Effects scripting and expressions, CEP and UXP panels, C++ SDK plugins, MCP and command-line automation, and renders through the render queue, aerender, and Media Encoder, led by an expert technical artist agent for Adobe Creative Cloud.

## Installation

```bash
copilot plugin install adobe-after-effects@awesome-copilot
```

## What's Included

### Agent

| Agent | What it does |
| --- | --- |
| `Adobe Creative Cloud` | An expert technical artist that picks the right Creative Cloud app or combination of apps, knows Creative Cloud storage (cloud documents, Projects, Libraries, Stock, local files), moves work off discontinued apps, explains how each app is extended, and leads the two skills below. |

### Skills

| Skill | What it does |
| --- | --- |
| `adobe-after-effects-scripting` | Writes, debugs, and reviews After Effects ExtendScript and expressions: projects, compositions, layers, properties, keyframes, effects, text, the render queue and the hand-off to Media Encoder, ScriptUI panels, running scripts from outside After Effects, and `aerender`. |
| `adobe-after-effects-integrations` | Builds and fixes what runs beside or inside After Effects: CEP extension panels, UXP plugins from the 27.0 beta, C++ effect, AEGP, and AEIO plugins, and MCP servers or other bridges that let an AI agent or a pipeline drive After Effects. |

## Use Cases

- Write or fix an After Effects script, from renaming layers to building compositions from footage and data
- Write or debug an expression, and choose the expression engine a project should use
- Build compositions from a template with a script, then render them through the render queue, `aerender`, or Media Encoder
- Run After Effects scripts unattended from a batch file, PowerShell, a scheduler, or CI, with results written to a file
- Build or fix a ScriptUI panel or a CEP extension panel for After Effects
- Plan a C++ effect or AEGP plugin on the After Effects SDK, or a UXP plugin for the 27.0 beta
- Build or vet an MCP server that lets an AI tool drive After Effects
- Choose between After Effects, Premiere Pro, Illustrator, and Media Encoder for a motion job, and move assets between them

## Example Prompts

```text
Write an After Effects script that builds a 1080 x 1080, 30 fps composition named Acme Promo
from every clip in a footage folder, one after another with a half-second crossfade, and adds
a lower third that reads "Acme Corp" over the first three seconds.
```

```text
Write an expression for a logo layer's Gaussian Blur that stays at 0 until the last 20% of
the layer named "music", then rises to 40 by the end of the composition.
```

```text
Design an MCP server for After Effects with tools to describe the open project, add a text
layer, and queue a render to a given folder, using AfterFX.exe -s and a result file, and
explain how to register it in VS Code.
```

## Source

This plugin is part of [Awesome Copilot](https://github.com/github/awesome-copilot).

## License

MIT

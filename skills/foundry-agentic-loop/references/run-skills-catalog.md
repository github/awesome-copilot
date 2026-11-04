# Run skills catalog

Reusable **run-phase** agent skills. Unlike the [build skills catalog](build-skills-catalog.md) (skills you install to help *build* the app), these are skills the **agent itself runs** at execution time.

**Reuse, don't regenerate.** When the prompt **explicitly names** one of these skills, reuse it as the local authoring artifact in `./skills/<skill-name>/`, then publish/update its governed version and attach it to the agent's toolbox using current `microsoft-foundry` guidance and supported commands. Verify the agent loads and uses that version. Also reuse explicitly supplied sources outside this catalog. If a named source cannot be resolved, ask rather than silently generating a replacement; author a new skill only when it is actually new or the user approves replacement.

This is a starter set of examples, not an exhaustive list.

| Repository               | Skill                            | Reuse when the prompt explicitly names |
| ------------------------ | -------------------------------- | -------------------------------------- |
| `github/awesome-copilot` | `eyeball`                        | Visually inspect a rendered UI or screenshot and report what is on screen or off-spec |
| `github/awesome-copilot` | `finalize-agent-prompt`          | Polish and finalize an agent's system / instruction prompt |
| `github/awesome-copilot` | `gtm-enterprise-account-planning`| Build an enterprise go-to-market account plan |
| `github/awesome-copilot` | `gtm-product-led-growth`         | Plan a product-led-growth (PLG) go-to-market motion |
| `github/awesome-copilot` | `incident-postmortem`            | Draft a structured incident postmortem (timeline, impact, root cause, action items) |
| `github/awesome-copilot` | `linkedin-post-formatter`        | Format content into a LinkedIn-ready post |
| `github/awesome-copilot` | `md-to-docx`                     | Convert Markdown into a DOCX document |
| `github/awesome-copilot` | `roundup`                        | Summarize multiple sources or items into a single roundup |
| `github/awesome-copilot` | `tldr-prompt`                    | Produce a concise TL;DR summary of long content |
| `aiappsgbb/agentic-loop`  | `factory-operations-triage`     | Triage smart-factory anomalies, maintenance signals, and quality deviations with evidence-backed operator actions |
| `aiappsgbb/agentic-loop`  | `production-flow-optimizer`     | Diagnose production bottlenecks and propose safe, constraint-aware flow and shift plans |
| `aiappsgbb/agentic-loop`  | `care-gap-outreach-planner`     | Prioritize care gaps and prepare consent-aware patient outreach without making clinical decisions |
| `aiappsgbb/agentic-loop`  | `post-discharge-care-coordinator` | Coordinate follow-up tasks, patient responses, and rule-based escalation after discharge |
| `aiappsgbb/agentic-loop`  | `loan-file-readiness-reviewer`  | Review lending files for completeness, consistency, freshness, and traceable exceptions |
| `aiappsgbb/agentic-loop`  | `mortgage-underwriting-coordinator` | Assemble evidence, conditions, and compliance checks for human mortgage underwriting |

For cataloged skills that declare a repository, name the source repository to the user, then install with the same command used for build skills:

```bash
gh skill install <repository> <skill> --agent github-copilot --scope project
```

After the skill is present locally, create and version it on Foundry and attach it to the toolbox.

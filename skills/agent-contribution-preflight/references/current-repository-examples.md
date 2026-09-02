# Current repository examples

Snapshot date: 2026-09-02. This is a discovery aid, not a permanent blacklist. Always recheck the live default branch and policy before contributing.

| Attention | Repository | Publicly visible behavior at snapshot |
| --- | --- | --- |
| High | [MatteoGabriele/agentscan](https://github.com/MatteoGabriele/agentscan/blob/3a057079a32dd738122e49fd714a9d7280ca6ab6/.github/agentscan.yml) | Enables issue scanning, auto-close, and honeypot for its own repository. |
| High | [nuxt/nuxt](https://github.com/nuxt/nuxt/blob/ab157ba3466c7b3bee8d3ea89011ea65d2b86257/.github/workflows/agent-scan.yml) | Warns on mixed; comments, changes the title, and closes on automation or community-list matches. |
| High | [vitejs/vite](https://github.com/vitejs/vite/blob/b120589f052fe8e0d5ea75bade1a0278c0bdfa7f/.github/workflows/bot.yml) | Uses custom labels and closes automation or community-list matches; maintainers can apply a skip label. |
| High | [sqlfluff/sqlfluff](https://github.com/sqlfluff/sqlfluff/blob/main/.github/workflows/agent-scan.yml) | Warns on mixed and closes automation or community-list matches. |
| High | [typescript-eslint/typescript-eslint](https://github.com/typescript-eslint/typescript-eslint/blob/main/.github/workflows/slop-detection.yml) | Scans PRs and issues, auto-closes AgentScan automation results, and also runs a separate anti-slop check. |
| Elevated | [nodejs/node](https://github.com/nodejs/node/blob/2247054ddab0bd3d98d83fe3bc5207ecd2d95aaa/.github/workflows/first-time-contributor.yml) | Silent scan for first-time contributors; adds a caution to the welcome comment but disables AgentScan auto-close and honeypot. |
| Elevated | [aio-libs/aiohttp](https://github.com/aio-libs/aiohttp/blob/main/.github/workflows/agent-scan.yml) | Uses label mode; the workflow does not enable auto-close. |
| Elevated | [storybookjs/storybook](https://github.com/storybookjs/storybook/blob/main/.github/workflows/agent-scan.yml) | Runs AgentScan for external PRs and applies repository-specific labels. |
| Elevated | [babel/babel](https://github.com/babel/babel/blob/main/.github/workflows/agent-scan.yml) | Runs an older Action version on PRs and issues. |

Staleness example: `biomejs/biome` remained in AgentScan's adopter data at the snapshot, but its live default branch no longer exposed an AgentScan workflow. Static adopter data therefore identifies candidates for inspection; it does not prove current enforcement.

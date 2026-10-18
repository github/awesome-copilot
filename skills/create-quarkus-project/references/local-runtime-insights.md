# Local runtime insights (optional)

[BootUI](https://github.com/jdubois/boot-ui) ([docs](https://www.julien-dubois.com/boot-ui/)) is a local-only developer console and an opt-in MCP server for Spring Boot and Quarkus applications, useful to inspect a running app while developing.

Rules for the agent:

- ALWAYS ask the user for consent before adding the dependency or the skill.
- Add it for local development only (dev profile / dev-only dependency scope); never ship or expose it in production.
- Follow the project documentation for the exact dependency coordinates and configuration.

To install its agent skill (after consent):

```bash
gh skill install jdubois/boot-ui skills/bootui
```

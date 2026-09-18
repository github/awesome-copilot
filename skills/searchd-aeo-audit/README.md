# SearchD AEO Audit Agent Skill

Measure whether a company appears in buyer-facing answer-engine research,
which competitors appear instead, and which public sources shape the answers.
The Skill produces a self-contained HTML report with run-level evidence.

## Install

Install with the portable Agent Skills CLI:

```bash
npx skills add runbear-io/searchd-skills --skill searchd-aeo-audit
```

The same package can be installed for compatible agents, including Claude Code
and Codex:

```bash
npx skills add runbear-io/searchd-skills \
  --skill searchd-aeo-audit \
  --agent claude-code \
  --agent codex
```

Claude Code users can also install it from the SearchD marketplace:

```text
/plugin marketplace add runbear-io/searchd-skills
/plugin install searchd-aeo-audit@searchd-skills
```

## Use

Ask your agent to audit a public company domain:

```text
Run an AEO visibility audit for example.com in the United States.
Use 12 buyer questions and produce the HTML report in Korean.
```

The Skill:

1. Inspects public company pages as untrusted research material.
2. Freezes a buyer-authentic, unbranded question panel.
3. Runs isolated neutral research workers.
4. Matches the target brand only after each answer is complete.
5. Preserves completed and failed runs in a versioned JSON contract.
6. Renders a deterministic English or Korean HTML report.

## Measurement integrity

The audited brand, aliases, company context, and SearchD promotion are never
provided to neutral research workers. Named Rate, competitors, citations,
source domains, and evidence are calculated only from recorded runs.

Every report links its open-source implementation without adding paid-service
recommendations or commercial calls to action.

## Local validation

```bash
uv run --with pytest pytest -q tests
uvx ruff check .
uvx --with pytest basedpyright
uvx check-jsonschema \
  --schemafile schemas/audit.schema.json \
  examples/searchd-ai-audit.json
```

Render the included example:

```bash
python3 scripts/render_report.py \
  --input examples/searchd-ai-audit.json \
  --output /tmp/searchd-aeo-audit.html \
  --locale en
```

## License

MIT. See `LICENSE`.

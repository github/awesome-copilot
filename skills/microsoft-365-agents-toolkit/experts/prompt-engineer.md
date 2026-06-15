# prompt-engineer

## purpose

Design prompts as information architecture over a 1D token stream — reducing semantic distance, compressing before reasoning, and constraining expansion during writing.

## rules

1. **Treat prompting as a distance design problem.** LLMs see a flat token stream, not tables, headers, or sections. Every prompt decision is about reducing token traversal distance between a question and its relevant data, a field name and its value, an instruction and its constraint, an example and its expected output.
2. **Reformat structured data into records, not tables.** Tables look organized to humans but scatter related values across distant token positions. Convert tabular data into per-record blocks where each label sits immediately next to its value. The model retrieves fields by proximity, not by column headers.
3. **Compress before reasoning.** Reasoning is collapsing many possible interpretations into one. Before asking the model to reason, reduce irrelevant tokens, remove noise, surface only task-relevant facts, and force discrete decisions (Yes/No, choose one, rank). Every token of noise increases entropy and degrades the compression.
4. **Use compression mechanisms deliberately.** RAG retrieval, summarization, scratchpads, chain-of-thought, entity extraction, and tool calls are all compression mechanisms. Choose the one that matches the bottleneck: retrieval for finding, summarization for condensing, chain-of-thought for multi-step inference, tool calls for grounding.
5. **Constrain decompression explicitly.** Writing is controlled expansion from a compressed representation. Unconstrained expansion drifts toward generic filler. Always specify: target audience, tone, length, format, required elements, and output schema. Each constraint reduces degrees of freedom and increases output quality.
6. **Diagnose the failure mode before redesigning.** Three distinct failure categories require different fixes. If the model can't find information → distance problem (move things closer). If the model draws wrong conclusions → compression problem (improve intermediate structure). If the output reads poorly → decompression problem (add constraints). Never redesign the whole prompt when only one layer is broken.
7. **Design for positional attention.** Attention is strongest at the edges of context (beginning and end) and weakest in the middle. Put critical instructions at the top. Put the user's question at the bottom. Inject retrieved data near the query. Never bury high-signal content in the middle of long context.
8. **Prefer structure over volume.** More tokens do not mean better performance. Intentional compression, proximity engineering, context rewriting, and selective retrieval outperform longer prompts with more raw content. If adding context doesn't reduce distance or improve compression, it adds noise.
9. **Place labels adjacent to values.** Any time the model must associate a name with a piece of data (field/value, question/answer, instruction/example), put them directly next to each other in the token stream. Separation creates retrieval failures the model cannot recover from.
10. **Force discrete outputs for reasoning steps.** Open-ended intermediate steps increase entropy. When chaining reasoning, constrain each step to a discrete decision — a classification, a yes/no, a selection from enumerated options. Each forced decision compresses the possibility space for the next step.
11. **Scope retrieved context to the task.** RAG and context injection should deliver only what the current query needs. Retrieving "everything related" adds noise tokens the model must traverse. Filter, re-rank, and truncate retrieved content before injecting it into the prompt.
12. **Write prompts as systems, not sentences.** Prompting is information architecture — pipelines, latent plans, context transformations, compression→latent→decompression flows. Design token flow the way you'd design a data pipeline: each stage transforms the representation toward the output.
13. **Use open-only `<SECTION>` tags to structure prompts.** Delineate prompt regions with `<SECTION_NAME>` tags — no closing `</SECTION_NAME>` tag. The open tag acts as a label that the model pattern-matches against. Closing tags add tokens without adding signal. Each distinct data type gets its own named section (`<DOCUMENT>`, `<USER_PROFILE>`, `<SEARCH_RESULTS>`, etc.).
14. **Put all data sections at the top, `<INSTRUCTIONS>` at the bottom.** Data sections occupy the top of the prompt where they're loaded into context. The `<INSTRUCTIONS>` block goes at the bottom — the high-attention end of the token stream. This separates *what the model knows* from *what the model should do*.
15. **Reference section names inside `<INSTRUCTIONS>` using the same tag format.** When a rule in `<INSTRUCTIONS>` refers to data, use the exact `<SECTION_NAME>` tag from the data section. Writing "Use the information in `<DOCUMENT>` to..." reinforces the pattern match between the instruction and the data it targets. The repeated tag acts as a semantic anchor — the model doesn't search for meaning, it matches the token pattern.
16. **Move `<INSTRUCTIONS>` to user messages for multi-turn flows.** In multi-turn conversations where each turn needs different instructions, place the data sections in the system prompt (stable across turns) and the `<INSTRUCTIONS>` block in the user message (changes per turn). This lets you re-instruct the model at each step without duplicating context.
17. **Place persona declarations above the first section tag, if used at all.** Persona framing ("You are an expert at...") is rarely necessary — constraints and instructions are more effective. When persona is needed, place it at the very top of the prompt before the first `<SECTION>` tag so it colors everything that follows.

## interview

### Q1 — Task type
```
question: "What kind of prompting task are you working on?"
header: "Task type"
options:
  - label: "You decide everything"
    description: "Use your best judgment for all decisions — skip remaining questions."
  - label: "Data extraction / retrieval"
    description: "Getting the model to find and return specific information from context."
  - label: "Reasoning / analysis"
    description: "Getting the model to draw conclusions, classify, or make decisions."
  - label: "Content generation"
    description: "Getting the model to produce structured text, code, or creative output."
multiSelect: false
```

### Q2 — Failure mode
```
question: "What's going wrong with your current prompt (if anything)?"
header: "Diagnosis"
options:
  - label: "You decide everything else"
    description: "No specific failure — I want a prompt designed from scratch."
  - label: "Can't find the right info"
    description: "The model misses or ignores relevant data in the context. (Distance problem)"
  - label: "Wrong conclusions"
    description: "The model finds the data but reasons incorrectly. (Compression problem)"
  - label: "Bad output quality"
    description: "The reasoning is fine but the output format/style/tone is wrong. (Decompression problem)"
multiSelect: false
```

### defaults table

| Question | Default |
|---|---|
| Q1 | Content generation |
| Q2 | No specific failure — design from scratch |

## patterns

### Converting a table to proximity-optimized records

```markdown
# BAD — table scatters related values across token positions
| Name    | Role       | Department | Start Date |
|---------|-----------|------------|------------|
| Alice   | Engineer   | Platform   | 2023-01-15 |
| Bob     | Designer   | Product    | 2022-06-01 |

# GOOD — record format keeps each entity's fields adjacent
## Employee: Alice
- Role: Engineer
- Department: Platform
- Start Date: 2023-01-15

## Employee: Bob
- Role: Designer
- Department: Product
- Start Date: 2022-06-01
```

### Section-tag prompt layout (single turn)

```markdown
<USER_PROFILE>
Name: Alice
Role: Engineering Manager
Team: Platform
Preferences: concise answers, no jargon

<DOCUMENT>
[retrieved documentation chunks, pre-filtered and re-ranked]

<INSTRUCTIONS>
Using the information in <DOCUMENT>, answer the user's question.
Tailor your response to the reader described in <USER_PROFILE>.
Keep the answer to 2-3 sentences. Cite the document section by name.
If the answer is not in <DOCUMENT>, say "I don't have that information."
```

### Section-tag prompt layout (multi-turn)

```markdown
# --- System prompt (stable across turns) ---

<USER_PROFILE>
Name: Alice
Role: Engineering Manager
Team: Platform

<DOCUMENT>
[retrieved documentation — stays in context across turns]

# --- User message turn 1 ---

<INSTRUCTIONS>
Summarize the key points in <DOCUMENT> relevant to the
reader in <USER_PROFILE>. Use bullet points, max 5 bullets.

# --- User message turn 2 (new instructions, same data) ---

<INSTRUCTIONS>
Based on <DOCUMENT>, draft a 2-sentence Slack message from
the person in <USER_PROFILE> announcing the most important
change to their team. Tone: direct and positive.
```

### Compression chain: open-ended question → constrained reasoning

```markdown
# --- Turn 1: Extract (compression) ---

<BUG_REPORT>
{raw bug report text}

<INSTRUCTIONS>
From the report in <BUG_REPORT>, extract:
- Component affected: (one of: auth, api, ui, database)
- Severity: (critical / high / medium / low)
- Reproducible: (yes / no / unknown)

# --- Turn 2: Reason over compressed representation ---

<TRIAGE>
Component: {extracted_component}
Severity: {extracted_severity}
Reproducible: {extracted_reproducible}

<INSTRUCTIONS>
Using the fields in <TRIAGE>, select the response action:
- If critical + reproducible → "hotfix: page on-call"
- If critical + not reproducible → "investigate: assign senior engineer"
- If high + reproducible → "prioritize: next sprint"
- Otherwise → "triage: add to backlog"

# --- Turn 3: Expand with constraints (decompression) ---

<TRIAGE>
Component: {extracted_component}
Severity: {extracted_severity}
Action: {selected_action}

<INSTRUCTIONS>
Using the fields in <TRIAGE>, write a 2-sentence Slack message
to the engineering channel. Tone: urgent but calm.
Include: component, severity, chosen action.
```

### Diagnostic checklist prompt

```markdown
# When a prompt fails, run through this diagnostic:

## 1. Distance check
- Is the relevant data within ~500 tokens of the question?
- Are labels directly adjacent to their values?
- Is anything critical buried in the middle of a long context?
→ Fix: restructure data, move fields closer, trim irrelevant context.

## 2. Compression check
- Is the model asked to reason over raw, unstructured input?
- Are intermediate steps unconstrained (free-text instead of discrete)?
- Is there more context than the task actually requires?
→ Fix: pre-extract, force classifications, reduce to task-relevant facts.

## 3. Decompression check
- Did you specify: audience, tone, length, format, required elements?
- Is there an output schema or example?
- Could two equally skilled people interpret the prompt differently?
→ Fix: add constraints, provide a concrete output example.
```

## pitfalls

- **Assuming the model "sees" your formatting.** Markdown headers, table borders, and indentation carry weak signal at best. The model processes tokens sequentially — visual structure doesn't create semantic structure. Always design for the token stream, not the rendered view.
- **Adding more context to fix retrieval failures.** When the model can't find information, the instinct is to add more. This usually makes it worse — more tokens means greater traversal distance. Instead, remove irrelevant content and move the relevant data closer to the query.
- **Using free-text intermediate steps.** Asking the model to "think through" a problem in free text generates unconstrained tokens that expand rather than compress the possibility space. Force intermediate outputs into discrete categories, structured fields, or enumerated options.
- **Placing instructions in the middle of context.** The "Lost in the Middle" effect is well-documented. Instructions, constraints, and critical data placed in the middle of a long context are reliably degraded. Use the top and bottom of the prompt for high-signal content.
- **Treating all prompt failures the same.** Rewriting an entire prompt because the output is wrong wastes effort and obscures the root cause. A distance failure, a compression failure, and a decompression failure require different fixes. Diagnose first.
- **Over-engineering with chain-of-thought.** Chain-of-thought is a compression mechanism for multi-step reasoning. Applying it to simple retrieval or generation tasks adds unnecessary tokens without improving quality. Match the mechanism to the bottleneck.
- **Adding closing `</SECTION>` tags.** Closing tags waste tokens without adding signal. The next open `<SECTION>` tag implicitly ends the previous section. The model pattern-matches on the open tag — the closing tag is noise.
- **Not referencing `<SECTION>` names in instructions.** If `<INSTRUCTIONS>` says "use the document" instead of "use <DOCUMENT>", the model must infer which section you mean. The repeated tag pattern creates a direct token-level link between the rule and the data it operates on. Always use the exact tag name.

## instructions

Use this expert when the developer is designing, debugging, or optimizing prompts for LLMs — whether for application prompts, system prompts, RAG pipelines, agent instructions, or any task involving prompt architecture.

**Trigger phrases:** "write a prompt," "prompt engineering," "prompt design," "fix my prompt," "prompt not working," "LLM prompt," "system prompt," "improve prompt," "prompt template," "RAG prompt," "optimize prompt," "prompt debugging."

Pair with: any language expert from `../languages/` when implementing prompt pipelines in code. Pair with: `json-yaml.md` when working with structured prompt templates or output schemas.

## research

Deep Research prompt:

"Write a micro-expert for LLM prompt engineering based on an information-architecture mental model. Core framework: prompting is a distance design problem over a 1D token stream. Cover: token proximity as the fundamental retrieval mechanism (not visual structure), table-to-record reformatting for distance reduction, compression before reasoning (RAG retrieval, summarization, chain-of-thought, entity extraction, tool calls as compression mechanisms), constrained decompression for writing (audience, tone, length, format, schema), the three-category diagnostic framework (distance problems, compression problems, decompression problems), positional attention design (Lost in the Middle effect, edge placement), structure vs. volume tradeoffs, discrete vs. free-text intermediate steps, and prompt-as-system-design rather than wordsmithing. Include patterns for RAG prompt layout, table-to-record conversion, compression chains, and diagnostic checklists."

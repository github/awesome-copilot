# Preferences and Constraints

## How I Want My AI to Work With Me

### Response Style

<!-- How you want answers shaped: thoroughness vs. speed, explanation depth, asking vs. assuming. -->

- <!-- e.g., Walk me through your thinking. Don't just give answers. -->
- <!-- e.g., Thoroughness over speed. -->
- <!-- e.g., Always clarify ambiguity before proceeding. -->

### Review and Approval

<!-- What requires your approval vs. what the agent can do unilaterally. The default is: read freely, write with permission. Adjust to taste. -->

- <!-- e.g., Always preview outbound communications before sending. -->
- <!-- e.g., Read any data source without asking. Confirm before writing, updating, or creating anything with side effects. -->

## Hard Boundaries

<!-- Numbered list of non-negotiables. These are rules the agent must never violate. Keep them short and absolute. -->

1. <!-- e.g., Never send messages on my behalf without showing me first. -->
2. <!-- e.g., Never overclaim credit. -->
3. <!-- e.g., Never make decisions for me. Surface options, but I make the final call. -->
4. <!-- e.g., Never represent me publicly without my explicit approval. -->
5. <!-- e.g., Never fabricate examples or context. If you don't know, say so. -->

## Working Preferences

### Scheduling

<!-- How you want calendar events created, declined, rescheduled. -->

- <!-- e.g., Create events without attendees first so I can review before inviting. -->

### Information Gathering

<!-- When the agent should go look something up vs. ask you. -->

- <!-- e.g., Go look it up rather than asking me to provide it. Use M365, ADO, WorkIQ, etc. -->
- <!-- e.g., Distinguish between what you found in the data and what you're inferring. -->

### File and Document Management

<!-- Where things live, what's source of truth, how to handle edits. -->

- <!-- e.g., My context files are the source of truth for who I am and how I work. Edit them directly when I say "update my X". -->
- <!-- e.g., Meeting notes go to <vault path or pattern>. -->

## Memory Management

<!-- Optional. Rules for tools that maintain a persistent memory (e.g., an agent memory feature, VS Code session memory). What belongs in memory vs. in context files. Skip this section if your agent doesn't have a memory system. -->

### What belongs in memory

- <!-- e.g., Working context: active tasks, open action items, in-progress decisions. -->
- <!-- e.g., Tool workarounds and config quirks. -->

### What does NOT belong in memory

- <!-- e.g., Stable preferences, communication style, or boundaries. Those live in context files. -->
- <!-- e.g., Information that duplicates a context file. -->

### Memory hygiene rules

1. <!-- e.g., No duplicates. Check existing context and memory before adding. -->
2. <!-- e.g., No contradictions. Resolve conflicts by deleting the old one first. -->
3. <!-- e.g., Compact regularly. Remove stale working context. -->

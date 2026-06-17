# Clarification Protocol

Before beginning analysis, pause and ask the user at most **2 targeted questions** when:

- The system scope, asset boundary, or target module is ambiguous and cannot be inferred from the provided context
- A critical trust boundary, privilege tier, or authentication zone is undefined and the analysis would significantly change depending on the interpretation
- The business context required for impact prioritization or compliance framework selection is entirely absent
- The language or framework cannot be auto-detected from the workspace

**Rules:**

1. State your working assumptions explicitly, then proceed
2. Do not wait for confirmation unless the ambiguity would fundamentally alter the attack surface definition, trust boundary map, or which phases are executed
3. Maximum 2 questions — if more ambiguity exists, infer from available evidence and document assumptions
4. If no ambiguity exists, proceed directly without questions

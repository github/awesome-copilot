# Evaluators: Custom Templates

Design LLM judge prompts.

## Complete Template Pattern

```python
TEMPLATE = """Evaluate faithfulness of the response to the context.

<context>{{context}}</context>
<response>{{output}}</response>

CRITERIA:
"faithful" = ALL claims supported by context
"unfaithful" = ANY claim NOT in context

EXAMPLES:
Context: "Price is $10" → Response: "It costs $10" → faithful
Context: "Price is $10" → Response: "About $15" → unfaithful

EDGE CASES:
- Empty context → cannot_evaluate
- "I don't know" when appropriate → faithful
- Partial faithfulness → unfaithful (strict)

Answer (faithful/unfaithful):"""
```

## Template Structure

1. Task description
2. Input variables in XML tags
3. Criteria definitions
4. Examples (2-4 cases)
5. Edge cases
6. Output format

## XML Tags

```
<question>{{input}}</question>
<response>{{output}}</response>
<context>{{context}}</context>
<reference>{{reference}}</reference>
```

## Common Mistakes

| Mistake | Fix |
| ------- | --- |
| Vague criteria | Define each label exactly |
| No examples | Include 2-4 cases |
| Ambiguous format | Specify exact output |
| No edge cases | Address ambiguity |

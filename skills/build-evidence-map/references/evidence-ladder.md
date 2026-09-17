# Evidence ladder

Use the strongest evidence practical for the decision. A higher class can still
be stale, irrelevant, or too broad for the nearby claim.

1. **Direct current observation** — reproduced behavior, command output,
   inspected artifact, or measured result.
2. **Authoritative primary source** — official specification, dataset, law,
   documentation, first-party repository, or original research.
3. **Independent corroboration** — competent sources with distinct underlying
   evidence.
4. **Explicit inference** — a conclusion whose premises and assumptions are
   visible in the map.
5. **Weak proxy** — related metric, benchmark, anecdote, or test that does not
   exercise the exact claim.
6. **Unsupported assertion** — confidence, repetition, or polished language
   without evidence.

## Source-region test

Before creating an evidence node, answer:

- What exact sentence, table, command output, page, section, or line range is
  being relied on?
- Does it entail the node text, or merely discuss the same subject?
- Is its date and version appropriate for the claim?
- Is the evidence independent, or copied from another cited source?
- What context would reverse or narrow the interpretation?

If the exact region cannot be located, create an `unknown` node instead of an
evidence node.

## Edge test

| Relation | Use when | Common counterfeit |
| --- | --- | --- |
| `supports` | The source increases reason to accept the target | Topical similarity |
| `contradicts` | Both cannot hold under the same scope and conditions | Different dates or populations |
| `qualifies` | The source narrows scope, strength, or applicability | Hiding inconvenient evidence |
| `missing` | A specific absent fact blocks or could reverse the target | Generic “more research needed” |

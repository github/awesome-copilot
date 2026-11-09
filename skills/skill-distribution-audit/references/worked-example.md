# Equal counts can hide distribution failures

This is a small synthetic example, not a benchmark of Copilot or an observation from a live installer.

A collection's release policy publishes two skills, `active-a` and `active-b`, while keeping `template` internal. Its captured discovery output lists `active-a` and `template`. Both totals are two.

Supply the intended identities as the first JSON input:

```json
["active-a", "active-b"]
```

Supply the observed identities as the second JSON input:

```json
["active-a", "template"]
```

Run [compare-discovery.mjs](../scripts/compare-discovery.mjs) as described in the skill. It returns exit code 1 with:

```json
{
  "match": false,
  "counts": {
    "expected": 2,
    "observed": 2,
    "expectedUnique": 2,
    "observedUnique": 2
  },
  "missing": ["active-b"],
  "unexpected": ["template"],
  "duplicates": {"expected": [], "observed": []}
}
```

The report should then investigate each difference separately. For the omitted skill, inspect parser warnings, schema compatibility, path rules, and the target revision. For the template, inspect the release policy and the actual consumer's exclusion semantics. The identity comparison alone does not establish either root cause.

If the manifest belongs to another distribution channel, compare that channel separately. Do not infer that changing that manifest will change direct repository discovery. After a repair, an exact unique match should return exit code 0; this still does not verify runtime loading or execution.

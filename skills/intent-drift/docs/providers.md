# Evidence Providers

Each provider inspects the alignment context and returns a `List[Evidence]`. All
providers subclass `EvidenceProvider` (in `providers/base.py`) and implement:

```python
def collect(self, context: Dict[str, Any]) -> List[Evidence]: ...
```

`context` is a dict with keys `original_goal`, `current_plan`, `execution_context`.

## `goal_provider` (weight 0.25)
Semantic overlap between `original_goal.text` and `current_plan.text` via keyword-set
intersection. Emits one score for overall alignment plus one for constraint presence.

## `constraint_provider` (weight 0.20)
Checks `original_goal.constraints` against `current_plan.steps` (keyword matching).
Emits compliance score and a note about strict ("must"/"required") constraints.

## `scope_provider` (weight 0.15)
Extracts concepts from goal/plan text, counts newly introduced vs dropped concepts, and
inspects `execution_context.edited_files` count for scope creep.

## `execution_provider` (weight 0.15)
Compares `execution_context.recent_commands` / `edited_files` / `reasoning_summary`
against goal and plan keywords; flags where execution attention actually sits.

## `file_graph_provider` (weight 0.10)
Distribution of edited file types, unusual extensions, and large-file edits.

## `dependency_provider` (weight 0.10)
Scans `recent_commands` for install/remove patterns and matches installed packages
against goal keywords; flags `requirements.txt` / `package.json` / etc. edits.

## `architecture_provider` (weight 0.10)
Detects edits to main/app/entrypoint files, config/setup files, cross-directory spread,
and new data-structure files.

## `requirement_coverage_provider` (weight 0.08)
Matches `original_goal.success_criteria` against `current_plan.steps`; flags unrelated
activities (refactor/cleanup/docs) in the plan.

## `problematic_findings_provider` (weight 0.07)
Cross-references other providers for low semantic similarity, concerning commands
(delete/drop/truncate), and unaddressed success criteria.

## Adding a provider
1. `providers/<name>_provider.py` subclassing `EvidenceProvider`.
2. Add to `providers/__init__.py`.
3. Register it with the engine. `IntentAlignmentEngine.add_provider(instance)`
   is the public hook; the engine otherwise self-registers its own built-ins
   from the external `intent-drift` package.
4. Add a row to `config/defaults.yaml` weights/enabled lists.
5. Add a unit test under `tests/`.

Note that the engine that scores a run lives in the external `intent-drift`
package, not in this repo — `analyzer.py` imports
`intent_alignment.engine` from site-packages. Providers here are the
skill-local implementations; a new provider that must change the weighted
score is **core** work, so open an issue and coordinate with the maintainer
before implementing (see [CONTRIBUTING.md](../CONTRIBUTING.md)).

# Self-Critique Loop

After completing the initial analysis, perform a **mandatory second pass** before delivering output.

## Universal Checks (All Agents)

1. **Evidence check**: Every finding must cite a concrete reference (file:line, component, architecture element, CVE ID, rule key). Remove any finding without supporting evidence.
2. **Coverage check**: Verify that all categories, phases, or scan types relevant to the agent's methodology were explicitly evaluated. State "None detected" for each clean category rather than silently omitting.
3. **Mitigation/remediation check**: Every Critical and High finding must have a specific, implementable fix — not a generic recommendation.

## Domain-Specific Extensions

Each agent adds domain checks to the universal list above:

### STRIDE Threat Modeling

4. **STRIDE completeness**: Did you evaluate all six STRIDE categories (S/T/R/I/D/E) for every trust boundary and data flow?
5. **Trust boundary audit**: Re-verify that every identified trust boundary has at least one evaluated data flow crossing it.

### STRIDE-LM (Lateral Movement)

4. **STRIDE-LM completeness**: Did you evaluate all seven categories (S/T/R/I/D/E/LM) for every asset and trust boundary?
5. **Control coverage**: Every Critical/High threat maps to a control function (Inventory/Collect/Detect/Protect/Manage/Respond).
6. **Lateral movement audit**: Re-trace all identified pivot paths. Verify no uncontrolled path exists from compromised entry point to high-value asset.

### Code Review Threat Modeling

4. **STRIDE completeness**: All six STRIDE categories evaluated for every trust boundary and data flow.
5. **Trust boundary audit**: Every trust boundary has evaluated data flows crossing it.

### Code Quality (SonarQube-style)

4. **Issue type coverage**: All five issue types (Bug, Vulnerability, Hotspot, Smell, Duplication) explicitly evaluated.
5. **Rating sanity check**: A–E ratings are consistent with finding counts before finalizing Quality Gate verdict.

### SAST/SCA

4. **Taint trace completeness**: Every entry point identified in discovery was taint-traced through to sinks.
5. **Manifest coverage**: All dependency manifests identified in discovery were audited.

### Multi-tool Pipeline

4. **Phase coverage**: All deliverable files generated and saved.
5. **Cross-correlation**: SAST findings corroborated by SCA findings → elevate corroborated items.
6. **Deduplication**: Same finding doesn't appear under multiple tool outputs.
7. **Roadmap completeness**: Every Critical/High finding appears in the immediate remediation tier.

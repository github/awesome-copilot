# Skeleton: threat-inventory.json

> **⛔ Use EXACT field names shown below. Common errors: `display_name` (wrong→`display`), `category` (wrong→`stride_category`), `name` (wrong→`title`).**
> **⛔ The template below is shown inside a code fence for readability only — do NOT include the fence in the output file. The `.json` file must start with `{` on line 1.**

---

```json
{
  "schema_version": "[FILL: 1.0 for standalone, 1.1 for incremental]",
  "report_folder": "[FILL: threat-model-YYYYMMDD-HHmmss]",
  "commit": "[FILL: short SHA]",
  "commit_date": "[FILL: commit date UTC]",
  "branch": "[FILL]",
  "repository": "[FILL: remote URL]",
  "analysis_timestamp": "[FILL: UTC timestamp]",
  "model": "[FILL]",

  "components": [
    [REPEAT: sorted by id]
    {
      "id": "[FILL: PascalCase]",
      "display": "[FILL: display name — NOT display_name]",
      "type": "[FILL: process / external_service / data_store / external_interactor]",
      "tmt_type": "[FILL: SE.P.TMCore.* / SE.EI.TMCore.* / SE.DS.TMCore.* from tmt-element-taxonomy.md]",
      "boundary": "[FILL: boundary ID]",
      "boundary_kind": "[FILL: MachineBoundary / NetworkBoundary / ClusterBoundary / ProcessBoundary / PrivilegeBoundary / SandboxBoundary]",
      "aliases": [],
      "source_files": ["[FILL: relative paths]"],
      "source_directories": ["[FILL: relative dirs]"],
      "fingerprint": {
        "component_type": "[FILL: process / external_service / data_store / external_interactor]",
        "boundary_kind": "[FILL: MachineBoundary / NetworkBoundary / ClusterBoundary / ProcessBoundary / PrivilegeBoundary / SandboxBoundary]",
        "source_files": ["[FILL: relative paths]"],
        "source_directories": ["[FILL: relative dirs — MUST NOT be empty for process-type]"],
        "class_names": ["[FILL]"],
        "namespace": "[FILL]",
        "config_keys": [],
        "api_routes": [],
        "dependencies": [],
        "inbound_from": ["[FILL: component IDs that send data TO this component]"],
        "outbound_to": ["[FILL: component IDs this component sends data TO]"],
        "protocols": ["[FILL: gRPC / HTTPS / SQL / etc.]"]
      },
      "sidecars": ["[FILL: co-located sidecar names, or empty array]"]
    }
    [END-REPEAT]
  ],

  "boundaries": [
    [REPEAT: sorted by id]
    {
      "id": "[FILL: PascalCase boundary ID]",
      "display": "[FILL]",
      "kind": "[FILL: MachineBoundary / NetworkBoundary / ClusterBoundary / ProcessBoundary / PrivilegeBoundary / SandboxBoundary]",
      "aliases": [],
      "contains": ["[FILL: component IDs]"],
      "contains_fingerprint": "[FILL: sorted pipe-delimited component IDs]"
    }
    [END-REPEAT]
  ],

  "flows": [
    [REPEAT: sorted by id]
    {
      "id": "[FILL: DF_Source_to_Target]",
      "from": "[FILL: component ID]",
      "to": "[FILL: component ID]",
      "protocol": "[FILL]",
      "description": "[FILL: 1 sentence max]"
    }
    [END-REPEAT]
  ],

  "threats": [
    [REPEAT: sorted by id then identity_key.component_id]
    {
      "id": "[FILL: T##.X]",
      "title": "[FILL: short title — REQUIRED]",
      "description": "[FILL: 1 sentence — REQUIRED]",
      "stride_category": "[FILL: S/T/R/I/D/E/A — SINGLE LETTER, NOT full word]",
      "tier": [FILL: 1/2/3],
      "prerequisites": "[FILL]",
      "status": "[FILL: Open/Mitigated/Platform]",
      "mitigation": "[FILL: 1 sentence or empty]",
      "identity_key": {
        "component_id": "[FILL: PascalCase — MUST be inside identity_key, NOT top-level]",
        "data_flow_id": "[FILL: DF_Source_to_Target]",
        "stride_category": "[FILL: S/T/R/I/D/E/A]",
        "attack_surface": "[FILL: brief description of the attack surface]"
      }
    }
    [END-REPEAT]
  ],

  "findings": [
    [REPEAT: sorted by id then identity_key.component_id]
    {
      "id": "[FILL: FIND-##]",
      "title": "[FILL]",
      "severity": "[FILL: Critical/Important/Moderate/Low]",
      "cvss_score": [FILL: N.N],
      "cvss_vector": "[FILL: CVSS:4.0/AV:...]",
      "cwe": "[FILL: CWE-###]",
      "owasp": "[FILL: A##:2025]",
      "tier": [FILL: 1/2/3],
      "effort": "[FILL: Low/Medium/High]",
      "related_threats": ["[FILL: T##.X]"],
      "evidence_files": ["[FILL: relative paths]"],
      "component": "[FILL: display name]",
      "identity_key": {
        "component_id": "[FILL: PascalCase]",
        "vulnerability": "[FILL: CWE-###]",
        "attack_surface": "[FILL: file:key or endpoint]"
      }
    }
    [END-REPEAT]
  ],

  "metrics": {
    "total_components": [FILL],
    "total_boundaries": [FILL],
    "total_flows": [FILL],
    "total_threats": [FILL],
    "total_findings": [FILL],
    "threats_by_tier": { "T1": [FILL], "T2": [FILL], "T3": [FILL] },
    "findings_by_tier": { "T1": [FILL], "T2": [FILL], "T3": [FILL] },
    "threats_by_stride": { "S": [FILL], "T": [FILL], "R": [FILL], "I": [FILL], "D": [FILL], "E": [FILL], "A": [FILL] },
    "findings_by_severity": { "Critical": [FILL], "Important": [FILL], "Moderate": [FILL], "Low": [FILL] }
  }
}
```

**MANDATORY field name compliance:**
- `"display"` — NOT `"display_name"`, `"name"`
- `"stride_category"` — NOT `"category"` — SINGLE LETTER (S/T/R/I/D/E/A)
- `"title"` AND `"description"` — both required on every threat
- `identity_key.component_id` — component link INSIDE identity_key, NOT top-level
- Sort all arrays deterministically before writing

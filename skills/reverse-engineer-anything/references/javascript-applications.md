# JavaScript and Electron application artifacts

Use `analyze_javascript_application` for an operator-supplied ASAR or extracted
tree beneath an approved investigation root. Every call requires `approved:
true`; source-map contents require separate approval. Keep the default summary.
Use its counts, roots, node kinds, top findings, coverage, unknowns, and graph
page URIs before requesting more data.

BrowserWindow preferences, preload and contextBridge surfaces, IPC
registrations, utility processes, and native binding requests are static syntax
observations. Only a unique exact literal IPC channel match supports an inferred
pairing. Dynamic or ambiguous channels remain unresolved. A requested `.node`
member is not a verified native export. Never claim runtime reachability,
registration, defaults, or policy enforcement from static analysis.

Use `trace_application_feature` on existing application Evidence for one
literal node ID, route, string, API, IPC channel, module, or native export.
Choose a direction and finite bounds. Link Hopper or Ghidra Evidence only when
the exact artifact digest matches.

For version comparison, analyze each version once, then call
`compare_application_versions`. Accept only its digest, source-map, structural
fingerprint, or non-module semantic matches. Module ordinals and minified names
are not persistent identity. Report added or removed only with complete
opposite-side coverage; otherwise report unknown.

When the question asks how one exact exported callable's returned object shape
changed, analyze each version once and then call
`compare_javascript_export_shapes` with explicit module paths and export names.
Use the Evidence IDs returned by the two analysis calls. Accept variant pairing
only through the tool's unique exact literal discriminant. Cite the comparison
Evidence and report JSON Pointer changes; dynamic values, ambiguous variants,
and incomplete parent-property coverage stay unknown. This is static inference,
not runtime behavior. Use `run_controlled_replay` separately only when the user
needs approved runtime semantics.

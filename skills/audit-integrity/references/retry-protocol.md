# Retry Protocol

On tool failure or empty search results:

1. **Retry once** with an alternative query or a different search pattern.
2. **If the second attempt fails**, state the failure explicitly and continue with available evidence.
3. **Do not skip phases**: Distinguish between "tool found no results" and "tool execution failed". Never assume the code is clean without verification.
4. **Document the gap**: If a phase is blocked due to missing manifests or unsupported languages, state it in the output. Do not omit the phase.

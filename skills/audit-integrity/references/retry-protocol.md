# Retry Protocol

On tool failure or empty results:

1. **Retry once** with a refined query or a different search pattern.
2. **If second attempt fails**, state the failure explicitly and continue with available evidence.
3. **Never silently skip** a phase because a tool call returned no results — distinguish "tool found nothing" from "tool failed to execute."
4. **Document the gap**: If a phase is genuinely blocked (missing manifests, unsupported language, inaccessible files), state it explicitly in the output rather than silently omitting the phase.

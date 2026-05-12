# Slang Shader — Rules, Patterns & Examples

## DOs

- Preserve HLSL compatibility when portability or gradual adoption matters.
- Use modules and imports to separate reusable math, material, lighting, utility, and stage logic.
- Use interfaces and generics instead of preprocessor-heavy specialization.
- Use generic constraints to keep specialization intentional and diagnostics clearer.
- Organize resources and constants by update rate using `ParameterBlock<T>` designs.
- Connect parameter-block design to D3D12 descriptor-table and Vulkan descriptor-set expectations.
- Make stage inputs and outputs explicit and semantically clear.
- Choose compute workgroup sizes intentionally based on memory pressure, occupancy, and synchronization needs.
- Use capabilities or explicit target assumptions when relying on platform-specific features.
- Call out when a feature is target-limited (pointers, wave ops, backend-specific debug support).
- Keep data layout, matrix conventions, handedness, and coordinate space conversions explicit.
- Use reflection-aware design when host-side binding or layout generation is involved.
- Provide compile targets, entry points, and expected bindings in all examples.
- Ask for the existing engine conventions before rewriting shader interfaces or resource layout.
- Preserve readable generated-code expectations when cross-compilation and debugging are part of the workflow.
- Use fenced code blocks tagged `slang` for all shader code output.
- Include a short binding summary or host-side assumptions with every generated shader.
- For complex shaders, separate helper logic from entry points.

## DON'Ts

- Don't invent undocumented Slang syntax, attributes, or resource rules.
- Don't treat `import` like `#include` or assume macro sharing across module boundaries.
- Don't assume all backends support the same features, pointer behavior, wave ops, derivatives, or debug facilities.
- Don't hardcode platform-specific assumptions without calling them out.
- Don't use the preprocessor as the default mechanism for specialization when interfaces or generics fit better.
- Don't assume parameter-block layout or binding conventions without checking the host-side API and reflection flow.
- Don't use implicit types everywhere if precision, layout, ABI, or host interop depends on exact types.
- Don't use pointers in portable code unless the target set explicitly supports them (SPIR-V, C++, CUDA only).
- Don't assume autodiff, ray tracing, or advanced capabilities are acceptable just because Slang supports them.
- Don't change stage semantics, descriptor layouts, or buffer packing rules without explaining the impact.
- Don't optimize blindly — state whether the goal is lower bandwidth, fewer barriers, less divergence, better cache locality, higher occupancy, or fewer instructions.
- Don't provide only shader code when the request clearly needs host integration details too.
- Don't hide uncertainty — if details are missing, ask for them.

---

## Ask the Developer When Any of These Are Unknown

Ask focused follow-up questions when the following materially affect correctness:

- **Target backend** — D3D12, Vulkan, Metal, SPIR-V, GLSL, CUDA, CPU, or multi-target.
- **Shader stage / pipeline shape** — vertex, pixel, compute, hull, domain, ray tracing stage, etc.
- **Entry-point names** — whether they must fit an existing engine interface.
- **Coordinate conventions** — handedness, clip-space, matrix packing, row/column-major.
- **Resource binding model** — descriptor layout, parameter block usage, reflection workflow.
- **Buffer layout** — texture formats, alignment, precision requirements.
- **Performance goal** — throughput, latency, register pressure, occupancy, compilation size.
- **Hardware tier / vendor constraints**.
- **HLSL compatibility requirement** — must the code remain HLSL-compatible?
- **C++ host structure** — must the shader match an existing C++ data struct or engine binding path?
- **Advanced feature availability** — is autodiff, ray tracing, or wave ops allowed in this project?

> Request only the minimum missing information needed — don't front-load the user with a long questionnaire.

---

## Output Format Requirements

When generating new Slang code:

```slang
// Target: Vulkan / SPIR-V
// Stage: Vertex + Fragment
// Entry points: mainVS, mainPS
// Bindings: set=0 MaterialParams, set=1 PerFrame

module MyMaterial;

import CommonMath;

struct MaterialParams { ... };
ParameterBlock<MaterialParams> gMaterial;

[shader("vertex")]
VSOut mainVS(VSIn v) { ... }

[shader("fragment")]
float4 mainPS(VSOut v) : SV_Target { ... }
```

When reviewing or refactoring existing code:
1. Identify **correctness** risks first.
2. Then **portability** issues.
3. Then **performance** issues.
4. Then provide revised code with a delta explanation.

---

## Module Structure Patterns

### Small project (single file)
```slang
// shader.slang — all-in-one; acceptable for prototypes
[shader("compute")]
[numthreads(64,1,1)]
void main(uint3 id : SV_DispatchThreadID) { ... }
```

### Medium project (domain-split modules)
```
shaders/
├── common/
│   ├── math.slang        — vector/matrix utilities
│   └── sampling.slang    — random/importance sampling
├── materials/
│   ├── brdf.slang        — BRDF interface + implementations
│   └── material.slang    — IMaterial, ParameterBlock setup
├── lighting/
│   └── light.slang       — ILight, PointLight, DirectionalLight
└── passes/
    ├── gbuffer.slang     — G-buffer write pass
    └── deferred.slang    — deferred shading pass
```

### Parameter block organization by update frequency
```slang
// Updated once per frame
struct PerFrameParams { float4x4 view; float4x4 proj; float time; };
ParameterBlock<PerFrameParams> gPerFrame;

// Updated per draw call
struct PerObjectParams { float4x4 model; };
ParameterBlock<PerObjectParams> gPerObject;

// Updated per material change
struct MaterialParams { float3 albedo; float metallic; float roughness; };
ParameterBlock<MaterialParams> gMaterial;
```

---

## Compute Shader Checklist

- [ ] Thread group size matches expected GPU occupancy for the target.
- [ ] Shared memory usage is within hardware limits (typically 48–64 KB).
- [ ] Memory access patterns minimize bank conflicts and maximize coalescing.
- [ ] `GroupMemoryBarrierWithGroupSync()` placed correctly — before and/or after shared-memory writes.
- [ ] Divergence-inducing branches minimized or moved outside inner loops.
- [ ] Dispatch dimensions and thread ID indexing are correct for 1D/2D/3D data.

---

## Cross-Compilation Checklist

- [ ] Feature used is listed as available on all required target backends.
- [ ] Pointer usage is guarded to SPIR-V/C++/CUDA only.
- [ ] Wave/subgroup ops are capability-gated.
- [ ] Matrix layout assumptions are explicit (`-matrix-layout-row-major` / `-matrix-layout-column-major`).
- [ ] Debug printf is wrapped in target guards if not universally supported.
- [ ] Entry-point semantics are consistent across targets.

---

## Example Prompts the Skill Handles Well

- "Write a Slang vertex and fragment shader pair for PBR with normal mapping and parameter blocks."
- "Generate a Slang hull and domain shader pair for adaptive tessellation with crack-resistant edge factors."
- "Refactor this Slang compute shader to reduce shared-memory bank conflicts."
- "Create a Slang module layout for a renderer with separate material, lighting, and utility modules."
- "Explain how to use Slang interfaces and generics for a light system without preprocessor macros."
- "Given this C++ render pass code and this Slang shader, find binding, layout, or semantic mismatches."
- "Show how to compile this Slang shader for SPIR-V and reflect its parameter layout from C++."
- "Write a cross-target Slang compute shader that marks backend-sensitive assumptions explicitly."
- "Review this Slang module structure and tell me whether imports, generics, or parameter blocks are used correctly."
- "Explain practical do's and don'ts of `var`, `let`, generics, associated types, and capabilities in production."
- "Design a reflection-aware Slang + C++ workflow for loading, compiling, and binding a compute shader."
- "Show how to structure a Slang package for multi-target compilation to DXIL, SPIR-V, and Metal."

---

## C++ and Engine Integration Notes

When the task touches engine or host code:

- Inspect the user's codebase before making assumptions about layout, reflection, resource binding, or runtime dispatch.
- Use semantic symbol tools when available to inspect C++ classes, enums, compile paths, render passes, and descriptor setup.
- Check how Slang outputs are compiled, loaded, reflected, cached, and bound in the host application before changing shader interfaces.
- Prefer precise symbol lookups and usage queries over raw text search for C++ integration questions.
- Always prefer reflection-friendly and engine-friendly interfaces over clever shader-only abstractions.

### Slang CMake integration snippet
```cmake
find_package(slang REQUIRED PATHS ${CMAKE_INSTALL_PREFIX} NO_DEFAULT_PATH)
target_link_libraries(yourLib PUBLIC slang::slang)
```

### Slang compile targets (slangc CLI)
```bash
# SPIR-V for Vulkan
slangc shader.slang -target spirv -o shader.spv

# DXIL for D3D12
slangc shader.slang -target dxil -o shader.dxil

# GLSL
slangc shader.slang -target glsl -o shader.glsl

# CUDA
slangc shader.slang -target cuda -o shader.cu

# Row-major matrices (important for xMath-style engines)
slangc shader.slang -target spirv -matrix-layout-row-major -o shader.spv
```
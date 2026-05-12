# Slang Language Reference

**Source:** [Official Slang Shader Repository](https://github.com/shader-slang/slang "Slang Shader repository")
**Official Docs:** [Official Slang Shader Online Documentation](https://shader-slang.com/slang/user-guide/ "Slang Shader Online documentation")
**Playground:** [Official Slang Shader Sandbox](https://shader-slang.com/slang-playground)

---

## Table of Contents

1. [Types](#types)
2. [Interfaces and Generics](#interfaces-and-generics)
3. [Automatic Differentiation](#automatic-differentiation)
4. [Modules and Access Control](#modules-and-access-control)
5. [Capabilities System](#capabilities-system)
6. [Compilation API](#compilation-api-c)
7. [Reflection API](#reflection-api)
8. [Compilation Targets](#compilation-targets)
9. [Target Compatibility Matrix](#target-compatibility-matrix)
10. [slangc Command Line](#slangc-command-line)

---

## Types

### Scalars
- Integer: `int8_t`, `int16_t`, `int`, `int64_t`, `uint8_t`, `uint16_t`, `uint`, `uint64_t`
- Float: `half` (16-bit), `float` (32-bit), `double` (64-bit)
- Other: `bool`, `void`

### Vectors and Matrices
- `vector<T,N>` (N = 2–4), convenience: `float3`, `uint2`, etc.
- `matrix<T,R,C>` (R,C = 2–4), convenience: `float3x4`, etc.

### Arrays
```hlsl
int a[3];            // fixed size
int a[] = {1,2,3};  // inferred size
void f(int b[]) {}  // unsized parameter
```
Arrays have `.getCount()`.

### Structures
```hlsl
struct MyData { int a; float b; }
// Custom constructor:
__init(int a_, float b_) { a = a_; b = b_; }
```

### Parameter Blocks
```hlsl
struct MaterialParams { float3 albedo; float metallic; float roughness; };
ParameterBlock<MaterialParams> gMaterial;
// Binds to a single descriptor table (D3D12) or descriptor set (Vulkan)
```

### Import
```hlsl
import foo;                  // imports foo.slang
__exported import foo;       // re-exports foo's declarations
```
`import` ≠ `#include` — no preprocessor sharing, each module loaded once.

---

## Interfaces and Generics

### Interface Definition and Implementation
```hlsl
interface ILight
{
    LightSample sample(float3 position);
    static int  getCount();               // static method in interface
    property int id { get; set; }        // property in interface
    int compute<T>(T val) where T : IBar; // generic method in interface
}

struct PointLight : ILight
{
    float3 position;
    LightSample sample(float3 hitPos) { ... }
    static int getCount() { return 1; }
    property int id { get { return _id; } set { _id = value; } }
    int _id;
    int compute<T>(T val) where T : IBar { ... }
}
```

### Multiple Conformance
```hlsl
struct MyType : IFoo, IBar { ... }
```

### Default Implementations
```hlsl
interface IFoo
{
    int getVal() { return 0; }  // default
}
struct MyType2 : IFoo
{
    override int getVal() { return 1; }
}
```

### Generic Methods and Constraints
```hlsl
// Basic
float4 computeDiffuse<L : ILight>(float4 albedo, float3 P, float3 N, L light) { ... }

// where clause (multiple constraints)
struct MyType<T, U>
    where T: IFoo, IBar
    where U : IBaz<T>
{ ... }

// Simplified constraint syntax
int myMethod<T:IFoo>(T arg) { ... }

// Generic value parameters
void g<let n : int>() { ... }

// Optional conformance
int myMethod<T>(T arg) where optional T: IFoo
{
    if (T is IFoo) { arg.myMethod(1.0); }
}
```

### Associated Types
```hlsl
interface IMaterial
{
    associatedtype B : IBRDF;
    B evalPattern(float3 pos, float2 uv);
}

struct MyCoolMaterial : IMaterial
{
    typedef DisneyBRDF B;
    B evalPattern(float3 pos, float2 uv) { ... }
}
```

### Global-Scope Generic Parameters
```hlsl
type_param M : IMaterial;
M gMaterial;
```

---

## Automatic Differentiation

### Marking Functions Differentiable
```hlsl
[Differentiable]
float2 foo(float a, float b) { return float2(a * b * b, a * a); }
```

### Forward Mode
```hlsl
DifferentialPair<float> dp_a = diffPair(1.0, 1.0); // (value, derivative)
DifferentialPair<float> dp_b = diffPair(2.4, 0.0);
DifferentialPair<float2> out = fwd_diff(foo)(dp_a, dp_b);
float2 primal     = out.p;
float2 derivative = out.d;
```

### Backward Mode
```hlsl
DifferentialPair<float> dp_a = diffPair(1.0);
DifferentialPair<float> dp_b = diffPair(2.4);
float2 dL_doutput = float2(1.0, 0.0);
bwd_diff(foo)(dp_a, dp_b, dL_doutput);
float dL_da = dp_a.d;
float dL_db = dp_b.d;
```

### Differentiable Types
Built-in: `float`, `double`, `half`, vectors/matrices thereof, arrays of differentiable types.
```hlsl
struct MyType : IDifferentiable { float x; float y; }
```

### Custom Derivatives
```hlsl
[Differentiable]
[ForwardDerivative(myForwardDeriv)]
[BackwardDerivative(myBackwardDeriv)]
float myFunc(float x) { ... }
```

---

## Modules and Access Control

### Defining a Module
```hlsl
// scene.slang
module scene;
__include "scene-helpers";   // NOT preprocessor — no macro sharing

// scene-helpers.slang
implementing scene;
// all entities in module are mutually visible regardless of include order
```

### Module Include Syntax
```hlsl
__include dir.sub_file;           // → "dir/sub-file.slang"
__include "dir/sub-file.slang";
```

### Access Modifiers
| Modifier   | Visibility                              |
|------------|-----------------------------------------|
| `public`   | Everywhere (other files, modules)       |
| `internal` | Same module only (default for most)     |
| `private`  | Same type and nested types only         |

Rules:
- Interface members inherit the interface's visibility.
- Legacy modules (no `module` declaration) treat all symbols as `public`.
- More-visible entities cannot expose less-visible entities in their signatures.

---

## Capabilities System

### Declaring Requirements
```hlsl
[require(spvShaderClockKHR)]
[require(glsl, GL_EXT_shader_realtime_clock)]
[require(hlsl_nvapi)]
uint2 getClock() { ... }
// Combined: (spvShaderClockKHR | glsl + GL_EXT_shader_realtime_clock | hlsl_nvapi)
```

### Target Switch
```hlsl
void myFunc()
{
    __target_switch
    {
    case spirv: /* SPIR-V path */ break;
    case hlsl:  /* HLSL path  */ break;
    }
}
```

### Capability Aliases
```hlsl
// Use a named alias instead of spelling out the full disjunction:
[require(sm_6_6)]
void myFunc() { ... }
```

### Common Capability Atoms
- Stages: `vertex`, `fragment`, `compute`, `hull`, `domain`, `geometry`
- APIs: `hlsl`, `glsl`, `spirv`, `cuda`, `cpp`
- Features: `_sm_6_7`, `SPV_KHR_ray_tracing`, `spvShaderClockKHR`, `hlsl_nvapi`

---

## Compilation API (C++)

```cpp
// 1. Create global session
Slang::ComPtr<slang::IGlobalSession> globalSession;
slang::createGlobalSession(globalSession.writeRef());

// 2. Create session with target
slang::SessionDesc sessionDesc = {};
slang::TargetDesc targetDesc   = {};
targetDesc.format   = SLANG_SPIRV;
targetDesc.profile  = SLANG_PROFILE_GLSL_450;
sessionDesc.targets      = &targetDesc;
sessionDesc.targetCount  = 1;
Slang::ComPtr<slang::ISession> session;
globalSession->createSession(sessionDesc, session.writeRef());

// 3. Load module and entry point
Slang::ComPtr<slang::IModule>     module;
Slang::ComPtr<slang::IEntryPoint> entryPoint;
session->loadModule("myModule", module.writeRef());
module->findEntryPointByName("main", entryPoint.writeRef());

// 4. Compose and link
slang::IComponentType* components[] = { module, entryPoint };
Slang::ComPtr<slang::IComponentType> program, linkedProgram;
session->createCompositeComponentType(components, 2, program.writeRef());
program->link(linkedProgram.writeRef());

// 5. Get kernel code
Slang::ComPtr<slang::IBlob> kernelCode;
linkedProgram->getEntryPointCode(0, 0, kernelCode.writeRef());
```

### CMake integration
```cmake
find_package(slang REQUIRED PATHS ${CMAKE_INSTALL_PREFIX} NO_DEFAULT_PATH)
target_link_libraries(yourLib PUBLIC slang::slang)
```

---

## Reflection API

```cpp
slang::ProgramLayout* layout = program->getLayout(targetIndex);

// Enumerate global parameters
int paramCount = layout->getParameterCount();
for (int i = 0; i < paramCount; i++)
{
    slang::VariableLayoutReflection* param = layout->getParameterByIndex(i);
    const char* name = param->getName();
    int binding      = param->getBindingIndex();
    int space        = param->getBindingSpace();
}

// Entry point layouts (stage, varying params)
slang::EntryPointLayout* ep = layout->getEntryPointByIndex(0);
slang::Stage stage = ep->getStage();
```

Type reflection kind values: `Scalar`, `Vector`, `Matrix`, `Array`, `Struct`, `Resource`, `SamplerState`, etc.

---

## Compilation Targets

### D3D11 (DXBC)
Stages: `vertex`, `hull`, `domain`, `geometry`, `fragment`  
Registers: `b` (cbuffers), `t` (SRVs), `u` (UAVs), `s` (samplers)

### D3D12 (DXIL)
Adds: ray tracing (`raygeneration`, `closesthit`, `miss`, `anyhit`, `intersection`, `callable`)  
Root signatures: root constants, descriptor tables, root descriptors.

### Vulkan (SPIR-V)
Descriptor sets instead of tables. Push constants instead of root constants.  
```hlsl
[[vk::binding(0, 1)]] Texture2D myTexture;
[[vk::push_constant]]  cbuffer PC { float4 color; };
[[vk::shader_record]]  cbuffer SR { uint id; };
```

### CUDA
- Native pointer support, cooperative groups, tensor ops.
- No graphics pipeline stages, limited texture ops.

### Metal
- Argument buffers, tile-based optimizations, unified memory.
- No double type.

### CPU/C++
- Host-side execution for debugging and reference implementations.
- No GPU-specific features.

---

## Target Compatibility Matrix

| Feature                | D3D11 | D3D12 | Vulkan | CUDA | Metal | CPU |
|------------------------|:-----:|:-----:|:------:|:----:|:-----:|:---:|
| `half` type            | ✗     | ✓     | ✓      | ✓    | ✓     | ✗   |
| `double` type          | ✓     | ✓     | ✓      | ✓    | ✗     | ✓   |
| `u/int8_t`             | ✗     | ✗     | ✓      | ✓    | ✓     | ✓   |
| `u/int16_t`            | ✗     | ✓     | ✓      | ✓    | ✓     | ✓   |
| `u/int64_t`            | ✗     | ✓     | ✓      | ✓    | ✓     | ✓   |
| Wave intrinsics (SM6)  | ✗     | ✓     | Partial| ✓    | ✗     | ✗   |
| Ray tracing            | ✗     | ✓     | ✓      | ✗    | ✗     | ✗   |
| Mesh shaders           | ✗     | ✓     | ✓      | ✗    | ✓     | ✗   |
| Tessellation           | ✓     | ✓     | ✗      | ✗    | ✗     | ✗   |
| Graphics pipeline      | ✓     | ✓     | ✓      | ✗    | ✓     | ✗   |
| Native bindless        | ✗     | ✗     | ✗      | ✓    | ✗     | ✓   |
| Atomics                | ✓     | ✓     | ✓      | ✓    | ✓     | ✓   |
| Pointers               | ✗     | ✗     | ✓      | ✓    | ✗     | ✓   |

**Platform notes:**
- Tessellation: Not available on Vulkan (use tessellation via mesh shaders instead).
- Half in D3D12: Problems with `StructuredBuffer<half>` — avoid.
- Wave intrinsics on CUDA: Preliminary, uses synthesized WaveMask.
- 8/16-bit integers on D3D: Require specific shader models and DXIL flags.

---

## slangc Command Line

```bash
# Basic
slangc shader.slang -target spirv -o shader.spv
slangc shader.slang -target dxil  -o shader.dxil
slangc shader.slang -target glsl  -o shader.glsl
slangc shader.slang -target cuda  -o shader.cu
slangc shader.slang -target metal -o shader.metal
slangc shader.slang -target cpp   -o shader.cpp

# Multi-target
slangc shader.slang -target spirv -o shader.spv -target dxil -o shader.dxil

# Entry point and stage
slangc shader.slang -target spirv -entry mainCS -stage compute -o out.spv

# Profile
slangc shader.slang -target glsl  -profile glsl_460 -o out.glsl
slangc shader.slang -target dxil  -profile sm_6_7   -o out.dxil

# Matrix layout (important for row-major engines like xMath)
slangc shader.slang -target spirv -matrix-layout-row-major -o out.spv

# Optimization
slangc shader.slang -O0   # no optimization
slangc shader.slang -O2   # standard
slangc shader.slang -O3   # aggressive

# Debug info
slangc shader.slang -g -o out.spv

# Include paths and macros
slangc shader.slang -I./include -DENABLE_SHADOWS=1 -o out.spv

# Capabilities
slangc shader.slang -capability spvShaderClockKHR -target spirv -o out.spv

# Vulkan-specific
slangc shader.slang -target spirv -fvk-use-entrypoint-name -o out.spv
slangc shader.slang -target spirv -fvk-use-gl-layout       -o out.spv

# Precompiled modules
slangc shader.slang -r prebuilt.slang-module -target spirv -o out.spv

# Emit IR
slangc shader.slang -emit-ir -o shader.slang-module
```

### Optimization Levels
| Flag | Effect                              |
|------|-------------------------------------|
| `-O0`| No optimization (debugging)         |
| `-O1`| Basic optimization                  |
| `-O2`| Standard optimization (default)     |
| `-O3`| Aggressive (may increase compile time)|

### Stage Names for `-stage`
`vertex` · `fragment` · `compute` · `hull` · `domain` · `geometry`
`raygeneration` · `closesthit` · `miss` · `anyhit` · `intersection` · `callable`

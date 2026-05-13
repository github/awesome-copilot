# Slang Language Documentation - Complete Reference

Source: [Official Slang Shader Repository](https://github.com/shader-slang/slang "Slang Shader repository")

## Table of Contents

- [Project Overview](#project-overview)
- [Introduction and Why Use Slang](#introduction-and-why-use-slang)
- [Getting Started](#getting-started)
- [Language Features](#language-features)
- [Conventional Features](#conventional-features)
- [Interfaces and Generics](#interfaces-and-generics)
- [Automatic Differentiation](#automatic-differentiation)
- [Modules and Access Control](#modules-and-access-control)
- [Capabilities System](#capabilities-system)
- [Compiling Code with Slang](#compiling-code-with-slang)
- [Reflection API](#reflection-api)
- [Compilation Targets](#compilation-targets)
- [Target Compatibility](#target-compatibility)
- [Command Line Reference](#command-line-reference)
- [Building From Source](#building-from-source)
- [FAQ](#faq)

## Project Overview

Slang is a real-time shading language designed to improve developer productivity for GPU programming while maintaining high performance. It extends HLSL with modern programming language features and supports compilation to multiple target platforms including Direct3D, Vulkan, CUDA, Metal, and CPU.

Key benefits:

- Backwards compatible with most existing HLSL code
- Parameter blocks for efficient descriptor table usage
- Interfaces and generics for type-safe shader specialization
- Automatic differentiation for machine learning applications
- Module system for better code organization
- Comprehensive reflection API
- Cross-platform compilation to multiple targets

## Introduction and Why Use Slang

### Why use Slang?

The Slang system helps real-time graphics developers write cleaner and more maintainable GPU code, without sacrificing run-time performance. Slang extends the HLSL language with thoughtfully selected features from modern general-purpose languages that support improved developer productivity and code quality.

Some of the benefits of Slang include:

- **Backwards compatibility**: Slang is backwards compatible with most existing HLSL code
- **Parameter blocks**: Allow shader parameters to be grouped by update rate to take advantage of Direct3D 12 descriptor tables and Vulkan descriptor sets
- **Interfaces and generics**: Provide first-class alternatives to preprocessor-based shader specialization
- **Automatic differentiation**: Greatly simplifies implementation of learning-based techniques in shaders
- **Module system**: Enables true separate compilation and semantic checking of shader code
- **Multi-platform support**: Same compiler generates code for DX bytecode, DXIL, SPIR-V, HLSL, GLSL, CUDA, and more
- **Robust reflection API**: Provides binding/offset/layout information about shader parameters in consistent format

### Who is Slang for?

Slang aims to be the best language possible for real-time graphics developers who care about code quality, portability and performance.

#### Real-Time Graphics Developers

Slang is primarily intended for developers creating real-time graphics applications that run on end-user/client machines, such as 3D games and digital content creation (DCC) tools.

#### From Hobbyists to Professionals

The Slang language is simple and familiar enough for hobbyist developers to use, but scales up to the demands of professional development teams creating next-generation game renderers.

#### Developers of Multi-Platform Applications

The Slang system builds for multiple OSes, supports many graphics APIs, and works with GPUs from multiple hardware vendors. The project is completely open-source.

#### Developers with existing HLSL investment

One of Slang's key features is its high degree of compatibility with existing HLSL code. Developers can incrementally adopt Slang features to improve codebase quality over time.

### Goals and Non-Goals

Key design goals:

- **Performance**: Benefits of using Slang must not come at the cost of performance
- **Productivity**: Language concepts foster greater developer productivity in large codebases
- **Portability**: Support wide variety of hardware, graphics APIs, and operating systems
- **Ease of Adoption**: Compatible with existing code, familiar syntax from other languages
- **Predictability**: Code should do what it appears to, consistently across platforms
- **Limited Scope**: Slang is a language, compiler, and module - not an engine or framework

## Getting Started

### Installation

The easiest way to start using Slang is to download a binary release from the GitHub repository. Extract the files and find `slangc.exe` under `/bin/windows-x64/release/`. Note that `slang.dll` and `slang-glslang.dll` must be in the same directory.

For building from source, see the [Building From Source](#building-from-source) section.

### Your First Slang Shader

Create a file named `hello-world.slang`:

```hlsl
// hello-world.slang
StructuredBuffer<float> buffer0;
StructuredBuffer<float> buffer1;
RWStructuredBuffer<float> result;

[shader("compute")]
[numthreads(1,1,1)]
void computeMain(uint3 threadId : SV_DispatchThreadID)
{
    uint index = threadId.x;
    result[index] = buffer0[index] + buffer1[index];
}
```

Compile to SPIR-V:

```bat
slangc hello-world.slang -target spirv -o hello-world.spv
```

Compile to GLSL:

```bat
slangc hello-world.slang -target glsl -o hello-world.glsl
```

## Language Features

### Import Declarations

Slang introduces `import` declarations for better software modularity:

```hlsl
// foo.slang
float4 someFunc(float4 x) { return x; }

// bar.slang
import foo;
float4 someOtherFunc(float4 y) { return someFunc(y); }
```

Key details:

- Import searches for `.slang` files using same search paths as `#include`
- Multiple imports of same file only processed once
- No automatic namespacing (potential for name collisions)
- Use `__exported import` to re-export declarations
- Import is not like `#include` - no preprocessor macro sharing

### Explicit Parameter Blocks

Slang supports explicit syntax for parameter blocks using descriptor tables/sets:

```hlsl
struct ViewParams
{
    float3 cameraPos;
    float4x4 viewProj;
    TextureCube envMap;
}

ParameterBlock<ViewParams> gViewParams;
```

Fields are assigned to registers/bindings to support allocation into a single parameter block.

### Interfaces

Slang supports declaring `interface`s that user-defined `struct` types can implement:

```hlsl
// Interface definition
struct LightSample { float3 intensity; float3 direction; };

interface ILight
{
    LightSample sample(float3 position);
}

// Implementation
struct PointLight : ILight
{
    float3 position;
    float3 intensity;
  
    LightSample sample(float3 hitPos)
    {
        float3 delta = hitPos - position;
        float distance = length(delta);
      
        LightSample sample;
        sample.direction = delta / distance;
        sample.intensity = intensity * falloff(distance);
        return sample;
    }
}
```

### Generics

Slang supports generic declarations using angle-bracket syntax:

```hlsl
float4 computeDiffuse<L : ILight>(float4 albedo, float3 P, float3 N, L light)
{
    LightSample sample = light.sample(P);
    float nDotL = max(0, dot(N, sample.direction));
    return albedo * nDotL;
}
```

#### Global-Scope Generic Parameters

For compatibility with existing HLSL global declarations:

```hlsl
type_param M : IMaterial;
M gMaterial;
```

#### Associated Types

For cases where each implementing type needs its own choice of intermediate type:

```hlsl
interface IMaterial
{
    associatedtype B : IBRDF;
    B evalPattern(float3 position, float2 uv);
}

struct MyCoolMaterial : IMaterial
{
    typedef DisneyBRDF B;
    B evalPattern(float3 position, float2 uv) { ... }
}
```

## Conventional Features

### Types

Slang supports conventional shading language types including scalars, vectors, matrices, arrays, structures, enumerations, and resources.

#### Scalar Types

Integer types:

- `int8_t`, `int16_t`, `int`, `int64_t`
- `uint8_t`, `uint16_t`, `uint`, `uint64_t`

Floating-point types:

- `half` (16-bit)
- `float` (32-bit)
- `double` (64-bit)

Boolean type: `bool`
Void type: `void`

#### Vector Types

Vector types: `vector<T,N>` where T is scalar type and N is 2-4
Convenience names: `float3` = `vector<float,3>`

#### Matrix Types

Matrix types: `matrix<T,R,C>` where T is scalar, R and C are 2-4
Convenience names: `float3x4` = `matrix<float,3,4>`

#### Array Types

Array type `T[N]` represents array of N elements of type T:

```hlsl
int a[3];           // sized array
int a[] = {1,2,3};  // inferred size
void f(int b[]) {}  // unsized array parameter
```

Arrays have `getCount()` method that returns length.

#### Structure Types

Structure types with `struct` keyword:

```hlsl
struct MyData
{
    int a;
    float b;
}
```

Structures can have constructors defined with `__init` keyword.

## Interfaces and Generics

### Interfaces

Interfaces define methods and services a type should provide:

```hlsl
interface IFoo
{
    int myMethod(float arg);
}

struct MyType : IFoo
{
    int myMethod(float arg)
    {
        return (int)arg + 1;
    }
}
```

#### Multiple Interface Conformance

```hlsl
interface IBar { uint myMethod2(uint2 x); }

struct MyType : IFoo, IBar
{
    int myMethod(float arg) {...}
    uint myMethod2(uint2 x) {...}
}
```

#### Default Implementations

```hlsl
interface IFoo
{
    int getVal() { return 0; }  // default implementation
}

struct MyType : IFoo {}  // uses default

struct MyType2 : IFoo
{
    override int getVal() { return 1; }  // explicit override
}
```

### Generics

Generic methods eliminate duplicate code for shared logic:

```hlsl
int myGenericMethod<T>(T arg) where T : IFoo
{
    return arg.myMethod(1.0);
}

// Usage
MyType obj;
int a = myGenericMethod<MyType>(obj); // explicit type
int b = myGenericMethod(obj);         // type deduction
```

#### Generic Value Parameters

```hlsl
void g1<let n : int>() { ... }

enum MyEnum { A, B, C }
void g2<let e : MyEnum>() { ... }

void g3<let b : bool>() { ... }
```

#### Alternative Syntax

```hlsl
__generic<typename T>
int myGenericMethod(T arg) where T : IFoo { ... }

// Simplified syntax
int myGenericMethod<T:IFoo>(T arg) { ... }
```

#### Multiple Constraints

```hlsl
struct MyType<T, U>
    where T: IFoo, IBar
    where U : IBaz<T>
{
}
```

#### Optional Conformances

```hlsl
int myGenericMethod<T>(T arg) where optional T: IFoo
{
    if (T is IFoo)
    {
        arg.myMethod(1.0); // OK in conformance check block
    }
}
```

### Supported Interface Constructs

#### Properties

```hlsl
interface IFoo
{
    property int count {get; set;}
}
```

#### Generic Methods

```hlsl
interface IFoo
{
    int compute<T>(T val) where T : IBar;
}
```

#### Static Methods

```hlsl
interface IFoo
{
    static int compute(int val);
}
```

## Automatic Differentiation

Slang provides first-class support for differentiable programming through automatic differentiation.

### Key Features

- `fwd_diff` and `bwd_diff` operators for forward and backward-mode derivative propagation
- `DifferentialPair<T>` type for passing derivatives with inputs
- `IDifferentiable` and `IDifferentiablePtrType` interfaces for differentiable types
- User-defined derivative functions via `[ForwardDerivative]` and `[BackwardDerivative]`
- Compatible with all Slang features: control-flow, generics, interfaces, etc.

### Mathematical Background

Forward-mode computes Jacobian-vector products: `<Df(x), v>`
Backward-mode computes vector-Jacobian products: `<v^T, Df(x)>`

### Forward-Mode Example

```hlsl
[Differentiable]
float2 foo(float a, float b) 
{ 
    return float2(a * b * b, a * a);
}

void main()
{
    DifferentialPair<float> dp_a = diffPair(1.0, 1.0);  // value and derivative
    DifferentialPair<float> dp_b = diffPair(2.4, 0.0);
  
    DifferentialPair<float2> dp_output = fwd_diff(foo)(dp_a, dp_b);
  
    float2 output_p = dp_output.p;  // primal output
    float2 output_d = dp_output.d;  // derivative output
}
```

### Backward-Mode Example

```hlsl
[Differentiable]
float2 foo(float a, float b) 
{ 
    return float2(a * b * b, a * a);
}

void main()
{
    DifferentialPair<float> dp_a = diffPair(1.0);
    DifferentialPair<float> dp_b = diffPair(2.4);
  
    float2 dL_doutput = float2(1.0, 0.0);  // output derivatives
  
    bwd_diff(foo)(dp_a, dp_b, dL_doutput);
  
    float dL_da = dp_a.d;  // computed input derivatives
    float dL_db = dp_b.d;
}
```

### Differentiable Type System

#### Built-in Differentiable Types

- Scalars: `float`, `double`, `half`
- Vectors/matrices of differentiable scalars
- Arrays: `T[n]` if `T` is differentiable
- Tuples: `Tuple<each T>` if `T` is differentiable

#### User-Defined Differentiable Types

```hlsl
struct MyType : IDifferentiable
{
    float x;
    float y;
}
```

The `Differential` associated type carries corresponding derivative (usually same as primal type).

### Custom Derivatives

```hlsl
[Differentiable]
[ForwardDerivative(myForwardDerivative)]
[BackwardDerivative(myBackwardDerivative)]
float myFunction(float x) { ... }
```

## Modules and Access Control

### Defining a Module

A module comprises one or more files with a primary file containing a `module` declaration:

```hlsl
// scene.slang
module scene;

__include "scene-helpers";
```

```hlsl
// scene-helpers.slang
implementing scene;
// ...
```

#### Module Include Semantics

`__include` differs from `#include`:

1. No preprocessor state sharing between files
2. Each file included exactly once
3. Circular includes allowed
4. All module files can access all other entities regardless of include order

#### Module Reference Syntax

Both identifier and string literal syntax supported:

```hlsl
__include dir.file_name;           // translated to "dir/file-name.slang"
__include "dir/file-name.slang";
__include "dir/file-name";
```

### Importing a Module

```hlsl
// MyShader.slang
import YourLibrary;
```

Import rules:

- Can only import primary module files
- Multiple imports of same module loaded once
- No preprocessor sharing between files

### Access Control

Three visibility levels:

#### `public`

Accessible everywhere - different types, files, modules

#### `private`

Only visible within same type:

```hlsl
struct MyType
{
    private int member;
  
    int f() { member = 5; }  // OK
  
    struct ChildType
    {
        int g(MyType t) { return t.member; }  // OK
    }
}

void outerFunc(MyType t)
{
    t.member = 2;  // Error - not visible
}
```

#### `internal`

Visible throughout same module:

```hlsl
// a.slang
module a;
public struct PS
{
    internal int internalMember;
    public int publicMember;
}
internal void f() { ... }

// m.slang  
module m;
import a;
void main()
{
    f();  // Error - f is internal to module a
    PS p;
    p.internalMember = 1;  // Error - not visible outside module a
    p.publicMember = 1;    // OK
}
```

Default visibility is `internal` (except interface members inherit interface visibility).

#### Validation Rules

- More visible entities cannot expose less visible entities in signature
- Members cannot have higher visibility than parent
- Type definitions cannot be `private`
- Interface requirements cannot be `private`

### Legacy Module Compatibility

Modules without `module` declaration, `__include`, or visibility modifiers are treated as legacy with all symbols `public`.

## Capabilities System

The capabilities system helps manage differences in hardware capabilities across different GPUs, graphics APIs, and shader stages.

### Capability Atoms and Requirements

Capability atoms represent targets, stages, extensions, and features:

- `GLSL_460` - GLSL 460 target
- `compute` - compute shader stage
- `_sm_6_7` - shader model 6.7 features
- `SPV_KHR_ray_tracing` - SPIR-V extension
- `spvShaderClockKHR` - SPIR-V capability

### Declaring Requirements

```hlsl
[require(spvShaderClockKHR)]
[require(glsl, GL_EXT_shader_realtime_clock)]
[require(hlsl_nvapi)]
uint2 getClock() {...}
```

This creates requirement:

```
(spvShaderClockKHR | glsl + GL_EXT_shader_realtime_clock | hlsl_nvapi)
```

### Conflicting Capabilities

Some capabilities are mutually exclusive:

- Different code generation targets (`hlsl`, `glsl`)
- Different shader stages (`vertex`, `fragment`)

Requirements with conflicting atoms are incompatible.

### Parent Scope Requirements

Requirements merge with parent scope:

```hlsl
[require(glsl)]
[require(hlsl)]
struct MyType
{
    [require(hlsl, hlsl_nvapi)]
    [require(spirv)]
    static void method() { ... }  // requirement: glsl | hlsl + hlsl_nvapi | spirv
}
```

### Automatic Inference

Slang infers requirements for `internal`/`private` functions:

```hlsl
void myFunc()
{
    if (getClock().x % 1000 == 0)
        discard;  // requires fragment stage
}
// Inferred: (spirv + SPV_KHR_shader_clock + spvShaderClockKHR + fragment | ...)
```

### Target Switch

`__target_switch` introduces disjunctions:

```hlsl
void myFunc()
{
    __target_switch
    {
    case spirv: ...;
    case hlsl: ...;
    }
}
// Requirement: (spirv | hlsl)
```

### Capability Aliases

Aliases simplify cross-platform requirements:

```hlsl
alias sm_6_6 = _sm_6_6
             | glsl_spirv_1_5 + sm_6_5 + GL_EXT_shader_atomic_int64 + atomicfloat2
             | spirv_1_5 + sm_6_5 + GL_EXT_shader_atomic_int64 + atomicfloat2 + SPV_EXT_descriptor_indexing
             | cuda
             | cpp;
```

Usage: `[require(sm_6_6)]`

### Validation

- Public methods and interface methods require explicit capability declarations
- Functions verified to not use capabilities beyond declared requirements
- Entrypoint capabilities recommended but not required

## Compiling Code with Slang

### Concepts

#### Source Units and Translation Units

Source units (files/strings) are grouped into translation units. Each translation unit produces a single module when compiled.

#### Entry Points

Entry points can be identified via:

1. `[shader(...)]` attributes (recommended)
2. Explicit entry point options for compatibility

#### Targets

A target represents platform and capabilities:

- Format: SPIR-V, DXIL, etc.
- Profile: D3D Shader Model 5.1, GLSL 4.60, etc.
- Optional capabilities: Vulkan extensions
- Code generation options

#### Layout

Parameter layout depends on:

- Modules and entry points used together
- Ordering of parameters
- Target-specific rules and constraints

#### Composition

Component types (modules, entry points) can be composed into composites defining units of shader code meant to be used together.

#### Linking

Resolves cross-module references and produces self-contained IR module for target code generation.

#### Kernels

Entry points generate kernel code. Same entry point can generate different kernels for different targets and compositions.

### Command-Line Compilation with `slangc`

#### Simple Example

```bat
slangc hello-world.slang -target spirv -o hello-world.spv
```

#### Source Files and Translation Units

- Each input file is a distinct source unit
- `.slang` files grouped into single translation unit
- Each `.hlsl` file gets its own translation unit

#### Common Options

- `-target <format>`: Specify output format (spirv, dxil, hlsl, glsl, cuda, cpp)
- `-entry <name>`: Specify entry point function name
- `-profile <profile>`: Specify target profile
- `-o <file>`: Specify output file
- `-D<name>[=<value>]`: Define preprocessor macro
- `-I<path>`: Add include search path

#### Multiple Targets

Compile for multiple targets in single invocation:

```bat
slangc shader.slang -target spirv -o shader.spv -target dxil -o shader.dxil
```

#### Parameter Binding

Slang provides deterministic parameter binding across targets. Generated code includes explicit binding layouts to ensure consistent parameter locations.

### Using the Compilation API

For applications requiring runtime compilation:

```cpp
// Create session
Slang::ComPtr<slang::IGlobalSession> globalSession;
slang::createGlobalSession(globalSession.writeRef());

slang::ComPtr<slang::ISession> session;
slang::SessionDesc sessionDesc;
sessionDesc.targetCount = 1;
slang::TargetDesc targetDesc;
targetDesc.format = SLANG_SPIRV;
targetDesc.profile = SLANG_PROFILE_GLSL_450;
sessionDesc.targets = &targetDesc;
globalSession->createSession(sessionDesc, session.writeRef());

// Load module
slang::ComPtr<slang::IModule> module;
session->loadModule("myModule", module.writeRef());

// Create entry point
slang::ComPtr<slang::IEntryPoint> entryPoint;
module->findEntryPointByName("main", entryPoint.writeRef());

// Compose program
slang::ComPtr<slang::IComponentType> program;
slang::IComponentType* components[] = { module, entryPoint };
session->createCompositeComponentType(components, 2, program.writeRef());

// Compile
slang::ComPtr<slang::IComponentType> linkedProgram;
program->link(linkedProgram.writeRef());

// Get kernel code
slang::ComPtr<slang::IBlob> kernelCode;
linkedProgram->getEntryPointCode(0, 0, kernelCode.writeRef());
```

## Reflection API

### Compiling for Reflection

```cpp
slang::IComponentType* program = ...;
slang::ProgramLayout* programLayout = program->getLayout(targetIndex);
```

### Types and Variables

#### Variables

`VariableReflection` represents variable declarations:

```cpp
void printVariable(slang::VariableReflection* variable)
{
    const char* name = variable->getName();
    slang::TypeReflection* type = variable->getType();
  
    print("name: "); printQuotedString(name);
    print("type: "); printType(type);
}
```

#### Types

`TypeReflection` represents types in the program:

```cpp
void printType(slang::TypeReflection* type)
{
    const char* name = type->getName();
    slang::TypeReflection::Kind kind = type->getKind();
  
    print("name: "); printQuotedString(name);
    print("kind: "); printTypeKind(kind);
  
    switch(type->getKind())
    {
    case slang::TypeReflection::Kind::Scalar:
        print("scalar type: ");
        printScalarType(type->getScalarType());
        break;
      
    case slang::TypeReflection::Kind::Struct:
        print("fields:");
        int fieldCount = type->getFieldCount();
        for (int f = 0; f < fieldCount; f++)
        {
            slang::VariableReflection* field = type->getFieldByIndex(f);
            printVariable(field);
        }
        break;
      
    case slang::TypeReflection::Kind::Array:
        print("element count: ");
        printPossiblyUnbounded(type->getElementCount());
        print("element type: ");
        printType(type->getElementType());
        break;
    }
}
```

### Parameter Layouts

Parameter layouts describe how parameters are mapped to target-specific resources:

```cpp
void printParameterLayout(slang::ParameterLayout* parameterLayout)
{
    slang::VariableReflection* variable = parameterLayout->getVariable();
    printVariable(variable);
  
    // Print binding information
    int bindingRangeCount = parameterLayout->getBindingRangeCount();
    for (int r = 0; r < bindingRangeCount; r++)
    {
        slang::BindingRangeType rangeType = parameterLayout->getBindingRangeType(r);
        int rangeIndex = parameterLayout->getBindingRangeIndex(r);
        int rangeSpace = parameterLayout->getBindingRangeSpace(r);
      
        print("binding: ");
        printBindingRangeType(rangeType);
        printf(" index=%d space=%d", rangeIndex, rangeSpace);
    }
}
```

### Entry Point Layouts

Entry point layouts provide information about varying inputs/outputs and their stage-specific semantics:

```cpp
void printEntryPointLayout(slang::EntryPointLayout* entryPointLayout)
{
    slang::Stage stage = entryPointLayout->getStage();
    print("stage: "); printStage(stage);
  
    // Print varying parameters
    int varyingCount = entryPointLayout->getVaryingParamCount();
    for (int v = 0; v < varyingCount; v++)
    {
        slang::VaryingParameterReflection* varying = 
            entryPointLayout->getVaryingParamByIndex(v);
        printVaryingParameter(varying);
    }
}
```

## Compilation Targets

### Direct3D 11

D3D11 uses DirectX Bytecode (DXBC) format. Supports rasterization and compute pipelines.

#### Rasterization Pipeline Stages

- `vertex` (VS) - required
- `hull` (HS) - optional tessellation
- `domain` (DS) - optional tessellation
- `geometry` (GS) - optional
- `fragment`/`pixel` (PS) - optional

#### Parameter Passing

Each stage has dedicated slots:

- **Constant buffers**: `b` registers, ≤4KB uniform data
- **Shader resource views (SRVs)**: `t` registers, read-only resources
- **Unordered access views (UAVs)**: `u` registers, read-write resources
- **Samplers**: `s` registers, texture sampling state

### Direct3D 12

D3D12 uses DirectX Intermediate Language (DXIL) format. Adds ray tracing and mesh shader support.

#### Additional Pipeline Stages

**Mesh Shaders** (not yet supported in Slang):

- `amplification` - determines mesh shader invocations
- `mesh` - produces vertex and index data for meshlets

**Ray Tracing Pipeline**:

- `raygeneration` - traces rays, similar to compute
- `intersection` - custom primitive intersection
- `anyhit` - candidate hit acceptance/rejection
- `closesthit` - processes accepted hits
- `miss` - handles rays that miss geometry
- `callable` - user-defined subroutines

#### Parameter Passing

Uses root signatures with:

- **Root constants**: Direct parameter passing for small data
- **Descriptor tables**: Groups of descriptors for resources
- **Root descriptors**: Direct descriptor binding

### Vulkan

Uses SPIR-V intermediate representation. Similar capabilities to D3D12.

#### Key Features

- Descriptor sets instead of descriptor tables
- Push constants instead of root constants
- Extensive extension system
- Cross-vendor standardization

#### Vulkan-Specific Attributes

```hlsl
[[vk::binding(0, 1)]]
Texture2D myTexture;

[[vk::push_constant]]
cbuffer PushConstants
{
    float4 color;
}

[[vk::shader_record]]
cbuffer ShaderRecord
{
    uint shaderRecordID;
}
```

### CUDA

Compiles to CUDA C++ or PTX. Supports compute workloads with GPU-specific optimizations.

#### Key Features

- Native pointer support
- Extensive math library
- Cooperative groups
- Tensor operations

#### Limitations

- No graphics pipeline stages
- Limited texture operations
- Different wave/warp model

### Metal

Apple's graphics API and shading language.

#### Key Features

- Argument buffers for parameter passing
- Tile-based rendering optimizations
- Unified memory model
- iOS/macOS support

### CPU/C++

Generates C++ code for CPU execution.

#### Key Features

- Host-side shader execution
- Debugging and testing
- Reference implementations
- Cross-platform deployment

#### Limitations

- No GPU-specific features
- Limited parallel execution
- Different memory model

## Target Compatibility

Comprehensive compatibility matrix for Slang features across different targets:

### Data Types

| Feature     | D3D11 | D3D12 | Vulkan | CUDA | Metal | CPU |
| ----------- | ----- | ----- | ------ | ---- | ----- | --- |
| Half Type   | No    | Yes   | Yes    | Yes  | Yes   | No  |
| Double Type | Yes   | Yes   | Yes    | Yes  | No    | Yes |
| u/int8_t    | No    | No    | Yes    | Yes  | Yes   | Yes |
| u/int16_t   | No    | Yes   | Yes    | Yes  | Yes   | Yes |
| u/int64_t   | No    | Yes   | Yes    | Yes  | Yes   | Yes |

### Shader Features

| Feature               | D3D11 | D3D12 | Vulkan  | CUDA | Metal | CPU |
| --------------------- | ----- | ----- | ------- | ---- | ----- | --- |
| SM6.0 Wave Intrinsics | No    | Yes   | Partial | Yes  | No    | No  |
| Ray Tracing DXR 1.0   | No    | Yes   | Yes     | No   | No    | No  |
| Mesh Shaders          | No    | Yes   | Yes     | No   | Yes   | No  |
| Tessellation          | Yes   | Yes   | No      | No   | No    | No  |
| Graphics Pipeline     | Yes   | Yes   | Yes     | No   | Yes   | No  |

### Resource Features

| Feature                | D3D11 | D3D12 | Vulkan | CUDA    | Metal | CPU     |
| ---------------------- | ----- | ----- | ------ | ------- | ----- | ------- |
| Native Bindless        | No    | No    | No     | Yes     | No    | Yes     |
| Buffer Bounds Checking | Yes   | Yes   | Yes    | Limited | No    | Limited |
| Separate Samplers      | Yes   | Yes   | Yes    | No      | Yes   | Yes     |
| Atomics                | Yes   | Yes   | Yes    | Yes     | Yes   | Yes     |

### Platform-Specific Notes

#### Half Type

- D3D12: Problems with StructuredBuffer containing half
- CUDA: Requires cuda_fp16.h availability

#### Integer Types

- D3D11/D3D12: 8/16-bit types require specific shader models and DXIL
- Vulkan: Requires explicit arithmetic type extensions

#### Wave Intrinsics

- CUDA: Preliminary support with synthesized WaveMask
- Different hardware capabilities affect availability

#### Ray Tracing

- Vulkan: Uses shader records instead of local root signatures
- D3D12: Full DXR 1.0/1.1 support

#### Bindless Resources

- CUDA: Native support with texture objects
- Other targets: Require significant manual effort

## Command Line Reference

### General Options

#### `-D<name>[=<value>]`

Insert preprocessor macro. If no value specified, defines empty macro.

#### `-entry <name>`

Specify entry-point function name. Defaults to `main` if stage specified. Multiple entries allowed.

#### `-o <file>`

Specify output file path.

#### `-target <format>`

Specify compilation target format:

- `spirv` - SPIR-V for Vulkan
- `dxil` - DXIL for D3D12
- `dxbc` - DXBC for D3D11
- `hlsl` - HLSL source output
- `glsl` - GLSL source output
- `cuda` - CUDA C++ output
- `cpp` - C++ output
- `metal` - Metal output

#### `-profile <profile>`

Specify target profile/version:

- `glsl_450`, `glsl_460` - GLSL versions
- `sm_5_0`, `sm_6_0`, `sm_6_7` - Shader Model versions

#### `-stage <stage>`

Specify shader stage:

- `vertex`, `fragment`, `compute`
- `hull`, `domain`, `geometry`
- `raygeneration`, `closesthit`, `miss`, `anyhit`, `intersection`, `callable`

### Include and Module Options

#### `-I<path>`

Add directory to include search path.

#### `-r <module>`

Reference precompiled module.

### Optimization Options

#### `-O<level>`

Set optimization level:

- `-O0` - No optimization
- `-O1` - Basic optimization
- `-O2` - Standard optimization
- `-O3` - Aggressive optimization

#### `-g`

Generate debug information.

#### `-line-directive-mode <mode>`

Control line directive generation:

- `none` - No line directives
- `default` - Standard line directives
- `source-map` - Source map support

### Target-Specific Options

#### Vulkan Options

#### `-fvk-use-entrypoint-name`

Use entry point name for SPIR-V OpEntryPoint.

#### `-fvk-use-gl-layout`

Use OpenGL-style memory layout rules.

#### CUDA Options

#### `-cuda-sm <version>`

Specify CUDA compute capability (e.g., `70` for 7.0).

#### CPU Options

#### `-fpic`

Generate position-independent code.

### Advanced Options

#### `-capability <cap>`

Specify required capability for compilation.

#### `-matrix-layout-column-major`

Use column-major matrix layout.

#### `-matrix-layout-row-major`

Use row-major matrix layout.

#### `-emit-ir`

Output intermediate representation (.slang-module).

#### `-load-stdlib-from <path>`

Load standard library from specified path.

#### `-no-stdlib`

Don't automatically import standard library.

## Building From Source

### Prerequisites

Required:

- CMake (3.26 preferred, 3.22 minimum)
- C++ compiler with C++17 support (GCC, Clang, MSVC)
- CMake compatible backend (Visual Studio, Ninja)
- Python3 (for spirv-tools dependency)

Optional for tests:

- CUDA
- OptiX
- NVAPI
- Aftermath
- X11

### Get Source Code

```bash
git clone https://github.com/shader-slang/slang --recursive
```

### Configure and Build

#### Ninja Build (All Platforms)

```bash
cmake --preset default
cmake --build --preset releaseWithDebugInfo
```

#### Visual Studio

```bash
cmake --preset vs2022
cmake --build --preset releaseWithDebugInfo
```

Available presets:

- `debug` - Debug build
- `release` - Release build
- `releaseWithDebugInfo` - Release with debug info

#### Complete Workflow

```bash
cmake --workflow --preset release  # Configure, build, and package
```

### WebAssembly Build

Requires Emscripten SDK:

```bash
# Install and activate Emscripten
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest

# Build generators for build platform
cmake --workflow --preset generators --fresh
mkdir generators  
cmake --install build --prefix generators --component generators

# Configure and build for WebAssembly
source ../emsdk/emsdk_env
emcmake cmake -DSLANG_GENERATORS_PATH=generators/bin --preset emscripten -G "Ninja"
cmake --build --preset emscripten --target slang-wasm
```

### Testing

```bash
build/Debug/bin/slang-test
```

See slang-test documentation for comprehensive testing information.

### Installation

```bash
cmake --build . --target install
```

This installs `SlangConfig.cmake` for `find_package` support:

```cmake
find_package(slang REQUIRED PATHS ${CMAKE_INSTALL_PREFIX} NO_DEFAULT_PATH)
target_link_libraries(yourLib PUBLIC slang::slang)
```

### Cross-Compiling

For cross-compilation scenarios:

1. Build generators for build platform
2. Configure with target platform toolchain
3. Build for target platform

### CMake Options

Key configuration options:

| Option                    | Default | Description                      |
| ------------------------- | ------- | -------------------------------- |
| `SLANG_ENABLE_TESTS`    | ON      | Build test suite                 |
| `SLANG_ENABLE_EXAMPLES` | ON      | Build example programs           |
| `SLANG_ENABLE_GFX`      | ON      | Build graphics abstraction layer |
| `SLANG_ENABLE_SLANGRT`  | ON      | Build runtime library            |

## FAQ

### How did this project start?

The Slang project forked from the "Spire" shading language research project. Slang takes lessons learned from research about productive shader compilation languages and applies them to a system that's easier to adopt and more suitable for production use.

### Why use Slang instead of other HLSL-to-GLSL translators?

While tools like glslang and hlsl2glslfork are useful for basic HLSL-to-GLSL translation, Slang's goal is different. Rather than being "yet another HLSL-to-GLSL translator," Slang aims to create a shading language and toolchain that improves developer productivity over existing HLSL, while providing a reasonable adoption path for existing HLSL code.

If you're just looking for HLSL-to-GLSL translation, existing tools might meet your needs. If you're interested in a more productive shading language with better modularity, type safety, and modern language features, Slang may be worth investigating.

### What makes a shading language more productive?

Key research informing Slang's design:

- **Shader Components: Modular and High Performance Shader Development** - Shows benefits of modular shader development
- **A System for Rapid Exploration of Shader Optimization Choices** - Demonstrates compiler techniques for shader optimization
- **Spark: Modular, Composable Shaders for Graphics Hardware** - Early work on composable shader systems

Core productivity improvements:

- **Modularity**: True separate compilation and module system
- **Type Safety**: Interfaces and generics replace error-prone preprocessor hacks
- **Reflection**: Consistent parameter binding information across targets
- **Portability**: Single source compiles to many targets
- **Modern Features**: Automatic differentiation, parameter blocks, etc.

### Who is using Slang?

Current major users:

- **NVIDIA Falcor** - Real-time rendering framework developed by NVIDIA Research
- **Various game studios** - Adopting for next-generation renderers
- **Research institutions** - Graphics and ML research projects
- **Independent developers** - Hobby and commercial projects

The implementation has focused heavily on Falcor's needs but is designed to be broadly applicable.

### Won't we all just use C/C++ for shaders soon?

The move to documented binary intermediate languages (SPIR-V, DXIL) creates opportunities for language innovation. While C++ shader support would be valuable, Slang addresses challenges unique to real-time graphics that won't automatically improve with C++:

- **Parameter binding complexity** across different APIs
- **Shader stage semantics** and validation
- **Target-specific optimizations** and capabilities
- **Graphics-specific type systems** (textures, samplers, etc.)
- **Automatic differentiation** for learning-based rendering

Slang is complementary to C++ shader efforts, focusing on domain-specific improvements for graphics programming.

### What are the main limitations?

Current limitations include:

- **Limited ecosystem** compared to established tools
- **Bleeding edge status** - API and language changes still occurring
- **Target coverage** - Some advanced features not available on all targets
- **Documentation** - Still expanding coverage of advanced topics
- **Tooling integration** - IDE support improving but not universal

However, these limitations are actively being addressed as the project matures.

### How stable is the language and API?

Slang is production-ready for many use cases but still evolving:

- **Core language features** are stable
- **Compilation API** has good stability with versioning
- **Advanced features** (autodiff, capabilities) may see refinements
- **Backwards compatibility** is prioritized for HLSL compatibility
- **Incremental adoption** is supported - can gradually introduce Slang features

The project follows semantic versioning and provides migration guidance for breaking changes.

Source: [Slang Shader repository docs](https://github.com/shader-slang/slang/tree/master/docs)

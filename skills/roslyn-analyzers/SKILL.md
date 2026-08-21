---
name: roslyn-analyzers
description: 'Build, review, debug, package, and test Roslyn diagnostic analyzers, code fix providers, and incremental source generators. Use for DiagnosticAnalyzer, CodeFixProvider, IIncrementalGenerator, IOperation analysis, Microsoft.CodeAnalysis dependency pinning, Roslyn test harnesses, C#/VB tests, and analyzer NuGet packaging.'
---

# Roslyn Analyzers and Source Generators

Use this workflow when adding or changing a Roslyn analyzer, code fix, source generator, tests, dependencies, or package layout. First inspect the repository's target frameworks, central package management, test framework, analyzer and generator conventions, diagnostic ID allocation, localization, and packaging. Preserve established conventions unless they conflict with the compatibility rules below.

## Non-negotiable design rules

- Prefer `IOperation`-based analysis wherever possible. Register the narrowest applicable `OperationKind` and inspect typed operations such as `IInvocationOperation`, `IAwaitOperation`, or `IObjectCreationOperation`. This usually supports C# and VB with one analyzer and gives direct access to symbols and conversions.
- Use syntax analysis only for inherently syntactic rules or syntax not represented adequately by `IOperation`. A syntax-node callback already has a `SemanticModel`; do not call `Compilation.GetSemanticModel` or fetch another semantic model from it. Repeated semantic-model creation is expensive and often indicates that an operation or symbol action is the better abstraction.
- Every analyzer must support C#. VB.NET support is optional until requested or established repository precedent requires it. A language-neutral operation analyzer may declare both languages. If VB support is promised, include equivalent C# and VB snippets in tests; do not infer VB correctness from shared implementation alone.
- Keep analyzer and code-fix providers in distinct assemblies. The analyzer project must never reference Roslyn Workspaces packages. Workspaces dependencies belong only in the code-fix and test projects.
- Analyzer callbacks must be stateless or concurrency-safe. Call `EnableConcurrentExecution()`. Make an explicit generated-code choice with `ConfigureGeneratedCodeAnalysis(...)`; follow repository policy rather than silently accepting the default.
- Respect cancellation where APIs expose a token. Do not retain compilations, operations, syntax trees, symbols, or semantic models in static state.
- Avoid `InternalsVisibleTo`. Test analyzers through their public `DiagnosticAnalyzer` and `CodeFixProvider` APIs and the Roslyn test harness. A small analyzer helper may be public when direct testing is genuinely useful, but most behavior should be tested end to end.
- Centralize metadata names and member names instead of propagating magic strings. Use one shared static catalog for fully qualified type names, namespaces, and API member names.
- Document every diagnostic ID. When the repository uses Docfx, put analyzer documentation under its Docfx tree, typically `docfx/analyzers`, and include each page in the relevant table of contents.
- Set every analyzer assembly's version precisely enough that each commit produces a unique assembly version. When using Nerdbank.GitVersioning, give each analyzer project its own `version.json` with `assemblyVersion.precision` set to `revision` and ensure that repository-wide MSBuild properties do not prevent that file from being discovered.
- Source generators must implement `IIncrementalGenerator`, not `ISourceGenerator`. Design the provider graph so unchanged inputs remain cached and do not regenerate output.
- Source generators must use a small `SourceWriter` abstraction for deterministic newlines, indentation, encoding, and balanced output. Start from [SourceWriter.cs](./references/SourceWriter.cs) and tailor its namespace and target-framework details to the receiving repository.

## Implementation workflow

1. Write down examples that must report and near-misses that must not report. Decide the exact diagnostic span and message arguments before implementation.
2. Determine whether the rule is semantic. Prefer, in order, operation actions, operation-block actions, symbol actions, compilation-start actions that register one of those actions, and finally syntax actions.
3. Resolve well-known types once in a compilation-start action when needed. If a required type is absent, register no inner action. Compare symbols with `SymbolEqualityComparer.Default`, metadata names, arity, containing type, and signature as appropriate; do not identify APIs by simple method name alone.
4. Define a stable diagnostic ID and descriptor. Follow repository practices for category, severity, localization, help links, telemetry tags, and release tracking.
5. Add or update the diagnostic's documentation page and wire the descriptor's `HelpLinkUri` to its published URL.
6. Report the smallest useful source location. Avoid diagnostics on generated code unless that is intentional.
7. Add or update the code fix in the separate code-fix assembly. Preserve trivia, use syntax generators or typed syntax APIs, annotate simplifiable/formattable nodes where appropriate, provide stable equivalence keys for distinct actions, and offer `FixAllProvider` only when batch application is correct.
8. Add positive, negative, edge, and code-fix tests in one test class for the rule.
9. Verify that every analyzer project has per-commit assembly versioning and that its project-local version configuration is actually honored.
10. Run the narrow test class or method first, then the test project, then the repository's normal build or analyzer validation. Honor the repository's test-runner syntax; do not assume VSTest `--filter` is supported.

For a source generator, replace steps 1-8 with: define generated API examples and invalid-input diagnostics; model each independent input; build an incremental provider graph; render with `SourceWriter`; and test output, diagnostics, determinism, and incremental caching before continuing with versioning, packaging, and repository validation.

## Analyzer pattern

This is the preferred shape for a semantic rule. Adapt descriptor construction and generated-code policy to local conventions.

```csharp
using System.Collections.Immutable;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.Diagnostics;
using Microsoft.CodeAnalysis.Operations;

[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class AvoidBlockingAnalyzer : DiagnosticAnalyzer
{
    public const string DiagnosticId = "LIB0001";

    private static readonly DiagnosticDescriptor Rule = new(
        DiagnosticId,
        "Avoid blocking calls",
        "Do not call '{0}'",
        "Usage",
        DiagnosticSeverity.Warning,
        isEnabledByDefault: true);

    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics => [Rule];

    public override void Initialize(AnalysisContext context)
    {
        context.EnableConcurrentExecution();
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.RegisterCompilationStartAction(static context =>
        {
            INamedTypeSymbol? taskType = context.Compilation.GetTypeByMetadataName(KnownApis.Task.FullName);
            if (taskType is null)
            {
                return;
            }

            context.RegisterOperationAction(
                operationContext => AnalyzeInvocation(operationContext, taskType),
                OperationKind.Invocation);
        });
    }

    private static void AnalyzeInvocation(OperationAnalysisContext context, INamedTypeSymbol taskType)
    {
        var invocation = (IInvocationOperation)context.Operation;
        IMethodSymbol method = invocation.TargetMethod;
        if (method.Name == KnownApis.Task.Wait &&
            SymbolEqualityComparer.Default.Equals(method.ContainingType, taskType))
        {
            context.ReportDiagnostic(Diagnostic.Create(
                Rule,
                invocation.Syntax.GetLocation(),
                method.Name));
        }
    }
}

public static class KnownApis
{
    public static class Task
    {
        public const string FullName = "System.Threading.Tasks.Task";
        public const string Wait = "Wait";
    }
}
```

When supporting both languages, use `[DiagnosticAnalyzer(LanguageNames.CSharp, LanguageNames.VisualBasic)]` only if all analysis and diagnostic locations are actually language-neutral or both languages are separately handled and tested.

## Syntax-analysis exception

Use syntax callbacks only when syntax itself controls the rule. Use the callback's existing semantic model if semantic information is unavoidable:

```csharp
private static void AnalyzeNode(SyntaxNodeAnalysisContext context)
{
    var invocation = (InvocationExpressionSyntax)context.Node;
    ISymbol? symbol = context.SemanticModel.GetSymbolInfo(invocation, context.CancellationToken).Symbol;
    // Do not call context.Compilation.GetSemanticModel(invocation.SyntaxTree).
}
```

Before choosing this pattern, check whether `IInvocationOperation.TargetMethod`, `IArgumentOperation.Parameter`, `IConversionOperation`, or another operation supplies the same information.

## Incremental source generators

Always implement `IIncrementalGenerator`. Do not wrap an `ISourceGenerator` with `AsSourceGenerator`; that preserves the old execution model rather than designing for incrementality.

Build a pipeline with these properties:

- Use `SyntaxProvider.ForAttributeWithMetadataName` for attribute-driven discovery. Otherwise, use `CreateSyntaxProvider` with a very cheap syntactic predicate and perform semantic work only in its transform.
- Transform syntax and symbols immediately into small immutable, value-equatable models containing only information needed for generation. Do not carry `SyntaxNode`, `ISymbol`, `SemanticModel`, or `Compilation` into later stages because their identity changes defeat caching.
- Keep independent inputs in independent providers. Combine providers as late as possible. Avoid combining every item with `CompilationProvider` merely for convenience.
- Avoid `Collect()` unless one output truly depends on the complete set. Prefer one output per model so editing one declaration invalidates only that output.
- Use stable equality. Records and immutable value types are good models; add `WithComparer` when normal equality does not represent semantic equivalence.
- Keep transforms and output callbacks static, pure, deterministic, and cancellation-aware. Do not read ambient files, clocks, environment state, or mutable static state. Model configuration, additional files, analyzer config options, and parse options as explicit providers.
- Give providers `WithTrackingName` labels while developing or testing incremental behavior.
- Generate stable, collision-resistant hint names. Sort any aggregated inputs explicitly before emitting output.
- Report invalid user input with generator diagnostics instead of throwing. Generator exceptions surface as compiler failures.
- Use `SourceText` with an explicit encoding when calling `AddSource`.

A compact pipeline should look like this:

```csharp
[Generator(LanguageNames.CSharp)]
public sealed class FactoryGenerator : IIncrementalGenerator
{
    public void Initialize(IncrementalGeneratorInitializationContext context)
    {
        IncrementalValuesProvider<TypeModel> models = context.SyntaxProvider
            .ForAttributeWithMetadataName(
                "Product.GenerateFactoryAttribute",
                static (node, _) => node is TypeDeclarationSyntax,
                static (attributeContext, cancellationToken) =>
                    TypeModel.Create(attributeContext, cancellationToken))
            .WithTrackingName("FactoryModels");

        context.RegisterSourceOutput(models, static (productionContext, model) =>
        {
            var writer = new SourceWriter();
            writer.WriteLine("// <auto-generated/>");
            writer.WriteLine($"namespace {model.Namespace};");
            writer.WriteLine();
            writer.WriteLine($"partial class {model.TypeName}");
            writer.WriteLine('{');
            writer.Indentation++;
            writer.WriteLine($"public static {model.TypeName} Create() => new();");
            writer.Indentation--;
            writer.WriteLine('}');
            productionContext.AddSource(model.HintName, writer.ToSourceText());
        });
    }
}
```

The model creation step must normalize symbol data into strings, booleans, enums, and other immutable values, validate unsupported declarations, escape identifiers, and derive a stable hint name. The output callback should only render the model. Use the complete [SourceWriter.cs](./references/SourceWriter.cs) example rather than ad hoc `StringBuilder` concatenation, then adapt indentation style and framework compatibility to the repository.

### Generator tests

Test source generators with `GeneratorDriver` or the repository's generator test harness. Cover:

- exact generated hint names and source text;
- multiple and nested declarations, namespaces, generics, escaped identifiers, and partial types;
- malformed or unsupported inputs and their diagnostic locations;
- additional files, analyzer config options, and parse options when consumed;
- deterministic output independent of input enumeration and operating-system newlines;
- a second driver run with identical inputs that caches all expected tracked steps;
- a narrowly changed input that reruns only the affected pipeline and output;
- compilation of generated output without unexpected diagnostics.

Enable incremental step tracking in tests and assert run reasons such as cached, unchanged, modified, or newly produced according to the Roslyn version in use. Do not settle for snapshot-only tests: identical generated text can hide a pipeline that recomputes everything.

## Diagnostic documentation and help links

Create one discoverable documentation page for every diagnostic code. A useful page includes:

- the diagnostic ID, title, category, and default severity;
- the exact condition that triggers the diagnostic;
- why the reported pattern is problematic;
- bad and corrected C# examples;
- VB examples when VB support is promised;
- exceptions, configuration, suppression guidance, and code-fix behavior when relevant.

If the repository has a Docfx site, place these pages under its existing analyzer documentation area, typically:

```text
docfx/
    analyzers/
        LIB0001.md
    toc.yml
```

Follow the site's existing URL and navigation conventions. Add each page to the applicable `toc.yml` so it is rendered and discoverable. The descriptor's help link must be the public GitHub Pages URL that Docfx will produce, not a source-tree path. Centralize construction when all diagnostics share a route:

```csharp
private static string GetHelpLink(string diagnosticId)
        => $"https://example.github.io/product/analyzers/{diagnosticId}.html";

private static readonly DiagnosticDescriptor Rule = new(
        id: DiagnosticId,
        title: "Avoid blocking calls",
        messageFormat: "Do not call '{0}'",
        category: "Usage",
        defaultSeverity: DiagnosticSeverity.Warning,
        isEnabledByDefault: true,
        helpLinkUri: GetHelpLink(DiagnosticId));
```

Derive the exact hostname, base path, output extension, casing, and route from the repository's Docfx configuration and deployment setup. Confirm that the generated site's route matches `HelpLinkUri`; do not merely assume that a Markdown path maps to the expected URL. When no Docfx folder exists, follow the repository's established documentation system or create an equivalent durable page and public help URL.

## Project and dependency boundaries

A typical solution has three projects:

```text
Product.Analyzers          -> Microsoft.CodeAnalysis.Common/CSharp only
Product.CodeFixes          -> Product.Analyzers + Roslyn Workspaces/Features APIs
Product.Analyzers.Tests    -> analyzer + code-fix projects + current testing packages
```

Target analyzer assemblies conservatively, commonly `netstandard2.0`, unless host requirements dictate otherwise. Treat the analyzer's Roslyn version as a host-compatibility floor, not a routine dependency to float.

Choose exactly one Roslyn reference-assembly version for shipping analyzer projects. Pin it independently from the latest Roslyn version used by code-fix tests or the rest of the repository. Pin the analyzer dependency's entire transitive closure to mutually compatible versions, including packages such as `System.Collections.Immutable`, `System.Memory`, `System.Reflection.Metadata`, `System.Runtime.CompilerServices.Unsafe`, and `System.Threading.Tasks.Extensions` when they appear in restore. Directly pinning only `Microsoft.CodeAnalysis.*` is insufficient: a newer centrally managed transitive dependency can make the analyzer fail in an older compiler host.

With central package management, create a dedicated `Directory.Packages.Analyzers.props` at the repository root and import it only for shipping analyzer, source-generator, and code-fix projects. Do not fold these overrides into the general `Directory.Packages.props`: the separate file makes the compatibility boundary visible and lets dependency automation treat it specially.

Use this three-part pattern.

First, have every shipping analyzer, source-generator, and code-fix project import one shared props file such as `src/AnalyzerCompatibility.props`. That file should identify the project:

```xml
<Project>
    <PropertyGroup>
        <!-- This is set so that Directory.Packages.Analyzers.props can apply version overrides specific to analyzer projects. -->
        <IsAnalyzerCompatibilityProject>true</IsAnalyzerCompatibilityProject>
    </PropertyGroup>
</Project>
```

Second, conditionally import the dedicated package file from a repository-wide props or targets file after central package versions are available:

```xml
<Import Project="$(MSBuildThisFileDirectory)Directory.Packages.Analyzers.props"
                Condition="'$(IsAnalyzerCompatibilityProject)' == 'true'" />
```

Third, copy this `Directory.Packages.Analyzers.props` structure and tailor the baseline comment, Roslyn version, and transitive versions to the oldest supported compiler or SDK host. Use `Update` only for a package already declared by the repository's central package file; use `Include` to add a pin for a package that is otherwise transitive-only. The example assumes the Roslyn packages are already declared and the listed runtime dependencies are new pins:

```xml
<Project>
    <!-- These versions are chosen to support the oldest compiler/SDK host named here. -->
  <PropertyGroup>
        <CodeAnalysisVersionForAnalyzers>4.11.0</CodeAnalysisVersionForAnalyzers>
      <!-- Apply analyzer compatibility pins to packages referenced only transitively. -->
      <CentralPackageTransitivePinningEnabled>true</CentralPackageTransitivePinningEnabled>
  </PropertyGroup>
  <ItemGroup>
        <PackageVersion Update="Microsoft.CodeAnalysis" Version="$(CodeAnalysisVersionForAnalyzers)" />
        <PackageVersion Update="Microsoft.CodeAnalysis.Common" Version="$(CodeAnalysisVersionForAnalyzers)" />
        <PackageVersion Update="Microsoft.CodeAnalysis.CSharp" Version="$(CodeAnalysisVersionForAnalyzers)" />
        <PackageVersion Include="Microsoft.CodeAnalysis.CSharp.Workspaces" Version="$(CodeAnalysisVersionForAnalyzers)" />
        <PackageVersion Update="Microsoft.CodeAnalysis.VisualBasic" Version="$(CodeAnalysisVersionForAnalyzers)" />
        <PackageVersion Include="Microsoft.CodeAnalysis.VisualBasic.Workspaces" Version="$(CodeAnalysisVersionForAnalyzers)" />
        <PackageVersion Include="Microsoft.Bcl.AsyncInterfaces" Version="8.0.0" />
        <PackageVersion Include="System.Collections.Immutable" Version="8.0.0" />
        <PackageVersion Include="System.Memory" Version="4.5.5" />
        <PackageVersion Include="System.Reflection.Metadata" Version="8.0.0" />
        <PackageVersion Include="System.Runtime.CompilerServices.Unsafe" Version="6.0.0" />
        <PackageVersion Include="System.Text.Json" Version="8.0.0" />
        <PackageVersion Include="System.Threading.Tasks.Extensions" Version="4.5.4" />
  </ItemGroup>
</Project>
```

The XML comments in these samples are required, not decorative. Keep equivalent comments in the receiving repository explaining why `IsAnalyzerCompatibilityProject` exists, why the conditional import exists when its purpose is not obvious, which oldest host the pinned versions support, and why these versions intentionally differ from the repository defaults. Include the Roslyn version-support documentation URL in or next to the baseline comment when it helps maintainers choose the correct compiler baseline. Future dependency updates must preserve or update these comments so users do not mistake deliberate compatibility pins for stale packages.

The versions above are a structural example, not universal recommendations. Recalculate the complete package set for the selected oldest host by inspecting the resolved dependency graph. Retain each package that Roslyn or the generator loads in the compiler process, even when the repository does not reference it directly. `Workspaces` entries centrally pin versions for code-fix projects but must not be referenced by analyzer or source-generator projects. The test project should remain outside `IsAnalyzerCompatibilityProject` and use the latest repository-approved Roslyn and analyzer-testing packages so tests also catch compatibility with current APIs and compilers.

Always prefer the latest available version of `Microsoft.CodeAnalysis.Analyzers`. It is a development-time analyzer package, not a compiler-host runtime dependency, so it does not need to match `Microsoft.CodeAnalysis`, `Microsoft.CodeAnalysis.Common`, C#/VB, or Workspaces package versions and must not be held back to the analyzer compatibility baseline. Keep it on the repository's normal latest-version update path and reference it without flowing it to consumers:

```xml
<PackageReference Include="Microsoft.CodeAnalysis.Analyzers" PrivateAssets="all" />
```

Do not set its central version to `$(CodeAnalysisVersionForAnalyzers)` and do not include it among packages excluded from minor or major dependency updates. This exception applies specifically to `Microsoft.CodeAnalysis.Analyzers`; packages loaded with the shipping analyzer or generator still belong to the carefully pinned compatibility closure.

Configure dependency automation so the analyzer baseline is not upgraded across Roslyn versions. For Renovate, isolate the analyzer version file or package group and disallow updates:

```json
{
  "packageRules": [
    {
      "matchFileNames": ["Directory.Packages.Analyzers.props"],
      "enabled": false
    }
  ]
}
```

For Dependabot, use an `ignore` entry for each analyzer-baseline package with `update-types` containing `version-update:semver-major`, `version-update:semver-minor`, and `version-update:semver-patch`. Include the pinned transitive packages, not only `Microsoft.CodeAnalysis.*`. If the tool cannot distinguish analyzer-only central versions from repository-wide versions, place the analyzer pins in a dedicated file/directory or make those upgrades manual.

Verify dependency isolation with a restore graph or assets file and, when practical, load the built analyzer in the oldest supported compiler/IDE host. A successful build on the newest SDK does not prove host compatibility.

## Code-fix boundaries

The code-fix project may reference packages such as `Microsoft.CodeAnalysis.CSharp.Workspaces` or `Microsoft.CodeAnalysis.VisualBasic.Workspaces`; the analyzer project may not. Keep the code fix optional from the analyzer's perspective. A fix should:

- register only when the diagnostic can be fixed safely;
- find the target node from the diagnostic span defensively;
- preserve leading/trailing trivia and imports;
- use `Simplifier.Annotation` and `Formatter.Annotation` where appropriate;
- return a new document or solution without mutating shared state;
- support cancellation and avoid blocking async Roslyn APIs;
- use a meaningful, stable equivalence key, especially when multiple fixes share a title;
- return the batch fixer only when fixes do not conflict or depend on application order.

## Unique assembly versions

Analyzer hosts cache and identify assemblies by assembly identity. Every commit that can change an analyzer should therefore produce a unique, precise assembly version; relying only on package version or file version is insufficient.

With Nerdbank.GitVersioning, put a `version.json` directly in every analyzer project directory, including each language-specific analyzer assembly when those are separate:

```json
{
    "$schema": "https://raw.githubusercontent.com/dotnet/Nerdbank.GitVersioning/main/src/NerdBank.GitVersioning/version.schema.json",
    "inherit": true,
    "assemblyVersion": {
        "precision": "revision"
    }
}
```

Then inspect all imported `Directory.Build.props`, `Directory.Build.targets`, and project SDK props for `GitVersionBaseDirectory`. A repository may set that property to a shared root so version calculation happens once; that can cause a project-local `version.json` to be ignored. In each analyzer project file, reset it to the analyzer project's own directory:

```xml
<PropertyGroup>
    <!-- Honor this analyzer project's version.json and produce a unique assembly identity per commit. -->
    <GitVersionBaseDirectory>$(MSBuildProjectDirectory)</GitVersionBaseDirectory>
</PropertyGroup>
```

Apply this override after any shared property import that sets the value, or otherwise ensure normal MSBuild precedence leaves the project-local value effective. Do not add the override blindly: first locate the controlling assignment and confirm which `version.json` the evaluated analyzer project uses.

Validate the built assembly rather than only inspecting MSBuild source. Build the same analyzer from two distinct commits when practical and confirm that `AssemblyName.Version` differs. At minimum, inspect the evaluated `GitVersionBaseDirectory`, the selected version file, and the resulting assembly version. Repeat this for every analyzer assembly, not merely the packaging or code-fix project.

## Test structure

Use `Microsoft.CodeAnalysis.Testing` or the repository's established equivalent. Keep one test class per diagnostic rule for analyzer and code-fix behavior together. Do not create a separate code-fix test class. Even when a diagnostic intentionally has no fix, instantiate the same analyzer-plus-code-fix harness with `EmptyCodeFixProvider`; this keeps all cases and configuration for the rule together.

Annotate every verifier/helper parameter that accepts C# source with `[StringSyntax("c#-test")]` from `System.Diagnostics.CodeAnalysis`. This enables syntax highlighting and language services at test call sites. Start from [CSharpCodeFixVerifier.cs](./references/CSharpCodeFixVerifier.cs) for a complete example and apply the attribute to analyzer-only and generator test helpers as well. If the target framework does not define `StringSyntaxAttribute`, use the repository's compatibility/polyfill pattern.

When C# source is assigned to a local variable instead of passed directly to an annotated parameter, add a language comment before the literal:

```csharp
const string source = /* lang=c#-test */ """
    // C# code here
    """;
```

Prefer inline markup to hard-coded line/column spans:

```csharp
using Verify = CSharpCodeFixVerifier<AvoidBlockingAnalyzer, AvoidBlockingCodeFix>;

public class AvoidBlockingTests
{
    [Fact]
    public async Task ReportsBlockingCallAndFixesIt()
    {
        const string source = /* lang=c#-test */ """
            using System.Threading.Tasks;
            class C
            {
                void M(Task task) => [|task.Wait()|];
            }
            """;
        const string fixedSource = /* lang=c#-test */ """
            using System.Threading.Tasks;
            class C
            {
                async Task M(Task task) => await task;
            }
            """;

        await Verify.VerifyCodeFixAsync(source, fixedSource);
    }

    [Fact]
    public async Task DoesNotReportAwaitedTask()
    {
        const string source = /* lang=c#-test */ """
            using System.Threading.Tasks;
            class C
            {
                async Task M(Task task) => await task;
            }
            """;

        await Verify.VerifyAnalyzerAsync(source);
    }
}
```

Use `[|bad code|]` for one diagnostic and named markup such as `{|#0:bad code|}` when diagnostics need distinct descriptors, arguments, or locations. Use explicit `DiagnosticResult` objects for IDs, severities, arguments, and additional locations, but attach them to markup locations where the harness supports it. Hard-coded `WithSpan(line, column, ...)` is a last resort for locations that markup cannot express.

If there is no code fix:

```csharp
using Verify = CSharpCodeFixVerifier<AvoidBlockingAnalyzer, EmptyCodeFixProvider>;
```

When VB support is required, use the corresponding Visual Basic verifier and include VB source, fixed source, and negative snippets. Keep shared behavioral cases aligned across languages while retaining language-specific parser/reference configuration.

Test at least:

- a straightforward positive case with the exact diagnostic span;
- a straightforward negative case;
- qualified, aliased, generic, inherited, overloaded, and extension-method forms relevant to symbol matching;
- nullability, implicit conversions, conditional access, lambdas/local functions, and malformed code when relevant;
- absence of an optional referenced type or assembly;
- generated code according to declared policy;
- every offered code action and equivalence key;
- fix-all behavior when advertised;
- preservation of trivia, imports, and formatting;
- both C# and VB for every promised cross-language behavior.

Prefer reference-assembly definitions supplied by the test framework over references copied from the executing runtime. Add only the metadata references and additional files needed by the scenario. Keep test parse options explicit when testing language-version-sensitive syntax.

## Packaging

Prefer bundling analyzer assemblies in the same NuGet package as the library they serve so consumers receive diagnostics automatically. Put analyzer DLLs under language-appropriate analyzer paths such as `analyzers/dotnet/cs` and `analyzers/dotnet/vb`; do not place them under `lib`. Include code-fix assemblies and their required dependencies according to the target host/package convention.

Package source generators as analyzer assets as well, commonly under `analyzers/dotnet/cs`. Keep generator runtime dependencies self-contained and minimal because compiler hosts do not resolve dependencies like ordinary application projects. Validate generator loading and generated output from a packed consumer project.

A separate `Product.Analyzers` package is also valid. In that model, the main library package should depend on it with appropriate asset metadata so analyzers flow to consumers without becoming runtime dependencies. Validate the packed `.nupkg`, not merely the build output: inspect paths, dependencies, satellite resources, build/buildTransitive assets, and verify the analyzer loads from a sample consumer project.

## Review checklist

- The implementation uses the narrowest suitable `IOperation` or symbol action.
- Every source generator implements `IIncrementalGenerator`, uses immutable equatable pipeline models, and has tests proving cached and selective recomputation.
- Generated code uses the shared `SourceWriter` for deterministic formatting and encoding.
- No syntax callback fetches another semantic model.
- C# behavior is implemented and tested; promised VB behavior has equivalent VB tests.
- Analyzer and code-fix assemblies are separate, and the analyzer has no Workspaces dependency.
- Shipping Roslyn references and their transitive dependency closure are coherently pinned to one compatibility baseline.
- `Microsoft.CodeAnalysis.Analyzers` uses the latest available version as a private development dependency and is not tied to the shipping Roslyn baseline.
- Shipping analyzer, source-generator, and code-fix projects set `IsAnalyzerCompatibilityProject`, conditionally import a dedicated `Directory.Packages.Analyzers.props`, and retain XML comments explaining the compatibility baseline and override mechanism.
- Renovate or Dependabot cannot automatically advance that baseline at any SemVer level: patch, minor, or major.
- API/type/member names come from a shared catalog rather than scattered literals.
- Every diagnostic ID has a documentation page, is present in site navigation, and has a `HelpLinkUri` matching the published URL.
- Every analyzer project produces a unique assembly version per commit; with Nerdbank.GitVersioning, its local `version.json` uses revision precision and any shared `GitVersionBaseDirectory` is overridden correctly.
- Tests use inline markup where possible and cover positive and negative behavior.
- C# verifier parameters use `[StringSyntax("c#-test")]`, and local C# source literals use `/* lang=c#-test */` where useful.
- One rule-focused test class contains analyzer and code-fix cases, using `EmptyCodeFixProvider` when needed.
- Tests exercise public APIs without `InternalsVisibleTo`.
- The packed package places analyzer assets correctly and has been tested from a consumer project.
- Focused tests, the full test project, and the repository build pass without new analyzer warnings.

---
name: resx-source-generator-migration
description: 'Migrates a project that uses checked-in .designer.cs files behind .resx to using a source-generator instead'
disable-model-invocation: true
---

Your goal is to migrate the project to use a source-generator for .resx files instead of checked-in .designer.cs files.

## User Input

Amend the instructions below with the following user input.
The user input is likely to be an absolute or repo-relative path to an msbuild project file or a directory containing an msbuild project to be migrated.

```text
$ARGUMENTS
```

## Migration

Complete each of the following sub-sections.

### Opt into the source generator

Inspect the target's package-management setup and configured NuGet sources before adding the package:

1. If the repository centrally manages package versions and already has a `PackageVersion` for `Microsoft.CodeAnalysis.ResxSourceGenerator`, add this versionless reference to an `ItemGroup` in the project file:

```xml
<PackageReference Include="Microsoft.CodeAnalysis.ResxSourceGenerator" PrivateAssets="all" />
```

2. If no central version exists, select a package version compatible with the target SDK/compiler and follow the repository's established version-management pattern. Specify the version on the `PackageReference` or add the corresponding central `PackageVersion`.
3. Verify that the configured NuGet sources can resolve the selected package. If they cannot, ask the user before changing feed configuration.

### Remove traces of .resx code-behind files

Search for any msbuild items related to resx files.
They typically come in pairs, as shown below:

```xml
<ItemGroup>
  <Compile Update="Strings.Designer.cs">
    <DesignTime>True</DesignTime>
    <AutoGen>True</AutoGen>
    <DependentUpon>Strings.resx</DependentUpon>
  </Compile>
</ItemGroup>

<ItemGroup>
  <EmbeddedResource Update="Strings.resx">
    <Generator>ResXFileCodeGenerator</Generator>
    <LastGenOutput>Strings.Designer.cs</LastGenOutput>
  </EmbeddedResource>
</ItemGroup>
```

Note that you might also find `<Generator>PublicResXFileCodeGenerator</Generator>` (or `<CustomTool>` instead of `<Generator>`) as .resx item metadata.

For each strongly typed .resx file being migrated, identify its generated designer file using all of these signals:

- `LastGenOutput` metadata on the `EmbeddedResource` item;
- a `Compile` item whose `DependentUpon` metadata names the .resx file; and
- a matching `*.Designer.cs` file on disk, even when the SDK includes it implicitly and no `Compile` item exists.

Before deleting a candidate, inspect its contents and confirm it is a generated resource accessor, such as a class containing `ResourceManager`, `Culture`, and properties that retrieve resource values. A matching filename alone is not sufficient. Do not delete WinForms or control designer files that contain UI initialization such as `InitializeComponent`; these commonly sit beside a same-named .resx file, and their `DependentUpon` metadata points to the form or control source file rather than the .resx file.

Also confirm that every resource exposed by the designer is a string and that the .resx file contains no images, icons, byte arrays, serialized objects, or other non-string values. This source generator emits string accessors backed by `ResourceManager.GetString`; it is not a compatible replacement for non-string resource properties. If any non-string resource exists, do not delete the designer or migrate that resource file. Keep its existing generation approach, or set `<GenerateSource>false</GenerateSource>` if the package would otherwise process it.

Before deletion, search the solution for every use and declaration of the accessor type. `ResXFileCodeGenerator` emits a non-static class, while this source generator emits a `static partial` class. Identify object construction, instance access, inheritance, use as a generic type argument (including `IStringLocalizer<T>`), and existing partial declarations with instance members, base types, or interfaces. Refactor each incompatible use to the static generated API and make every partial declaration compatible before migrating. If that is not appropriate, retain the existing designer and set `<GenerateSource>false</GenerateSource>` for that resource file.

For each associated designer file:

1. Delete the `*.Designer.cs` file from disk.
2. Remove its explicit MSBuild item from the project when one exists.

### Update EmbeddedResource items

Classify every .resx file before removing metadata. Migrate strongly typed resources that previously used `ResXFileCodeGenerator` or `PublicResXFileCodeGenerator`, or that have an associated generated designer file. Framework and designer resources such as WinForms form resources generally must not generate an accessor; preserve them by adding this metadata to their `EmbeddedResource` item:

```xml
<GenerateSource>false</GenerateSource>
```

The source generator otherwise generates accessors for non-culture .resx files by default, which can create type-name conflicts with forms or other framework-generated types.

Process each strongly typed `EmbeddedResource` being migrated as follows:

1. Remove the `LastGenOutput` metadata.
2. If either `Generator` or `CustomTool` metadata is set to `PublicResXFileCodeGenerator`, add `<Public>true</Public>` metadata to the item.
3. Remove the `Generator` (or `CustomTool`) metadata.
4. If the `EmbeddedResource` item has no remaining metadata after these removals, remove it only after verifying that the SDK implicitly includes that .resx file and that default embedded-resource items are enabled. Otherwise retain the explicit `Include` or equivalent item so the resource remains in the built assembly.
5. If you see `CustomToolNamespace` metadata, see the special section on that topic.

## `CustomToolNamespace` metadata special handling

When an `EmbeddedResource` item has `CustomToolNamespace` metadata, special handling is required.

The `ClassName` metadata replaces `CustomToolNamespace`, but note it takes the full class name rather than just the namespace. For example, if you had:

```xml
<EmbeddedResource Update="Strings.resx">
  <Generator>ResXFileCodeGenerator</Generator>
  <LastGenOutput>Strings.Designer.cs</LastGenOutput>
  <CustomToolNamespace>My.Namespace</CustomToolNamespace>
</EmbeddedResource>
```

It would become:

```xml
<EmbeddedResource Update="Strings.resx">
  <ClassName>My.Namespace.Strings</ClassName>
</EmbeddedResource>
```

**Before starting the migration, present these options to the user:**

1. **PREFERRED:** Drop the `CustomToolNamespace` metadata and accept the default generated namespace and class name. This may require fixups to source code that referenced the old generated code-behind file. Without `ClassName` metadata, the source-generated class will be in the `<RootNamespace>.<RelativeFolderPath>` namespace and named after the resx filename. Consider adding a using alias to affected files:
   ```csharp
   using SomeResourceFile = FullNamespace.TypeName;
   ```

2. Rewrite it as `ClassName` metadata, including the full namespace and class name (for example, `MyNamespace.MyResources`). This value becomes the generated accessor's full type name; the natural value remains the manifest resource name unless separately overridden.

### Resolving namespace/type conflicts

When the compiler emits an error about a type and namespace sharing the same name (where the identifier matches a directory name containing a .resx file):
- Move the .resx file outside that folder to remove the conflicting namespace declaration, OR
- Fully qualify the type reference to resolve the build break.

## Debugging tips

- Build with `/p:EmitCompilerGeneratedFiles=true` to write source-generated files to disk for inspection.
- You may also need `/p:CompilerGeneratedFilesOutputPath=<path>` to avoid Windows path length issues.

## Validation

Build the migrated project.

After the build succeeds, validate each resource family according to how it is consumed:

1. For each migrated neutral string resource, use the repository's existing tests or an available .NET test/console host to access at least one generated property and verify it returns the expected string. Reflection from PowerShell is an optional approach when `pwsh` is available, not a requirement.
2. For culture-specific satellite resources, switch to a representative culture and verify the neutral accessor returns the expected localized string. Do not expect a separate generated accessor for each satellite file.
3. For framework, designer, non-string, or other resources marked `GenerateSource=false`, exercise their actual consumer, such as instantiating the WinForms form/control or loading an image/object through the retained resource API.
4. Confirm every .resx file is still embedded in the expected main or satellite assembly.
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

Add the following item to an ItemGroup within the project file:

```xml
<PackageReference Include="Microsoft.CodeAnalysis.ResxSourceGenerator" PrivateAssets="all" />
```

Note: A `PackageVersion` item for this package already exists in the repo, so you don't need to specify a version. No nuget.config changes are needed.

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

When you find any `*.Designer.cs` msbuild item with `DependentUpon` metadata referring to a .resx file:

1. Delete the `*.Designer.cs` file from disk.
2. Remove the MSBuild item from the project.

### Update EmbeddedResource items

Find all `EmbeddedResource` items in the project file that point to a `*.resx` file.
Process it as follows:

1. Remove the `LastGenOutput` metadata.
2. If the `Generator` metadata is set to `PublicResXFileCodeGenerator`, add `<Public>true</Public>` metadata to the item.
3. Remove the `Generator` (or `CustomTool`) metadata.
4. If the `EmbeddedResource` item has no remaining metadata after these removals, remove the item entirely.
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

2. Rewrite it as `ClassName` metadata (which should include the full namespace *and* class name, e.g., `MyNamespace.MyResources`). However, the 'natural' namespace and class name will still be emitted, which can cause compile errors like:
   > error CS0118: '<identifier name>' is a namespace but is used like a type

   If you encounter this, inform the user and offer:
   1. Abandon migration and upvote the GitHub issue, OR
   2. Update each CS0118 location to use fully-qualified C# identifier names (e.g., `global::Some.Namespace.Type`).

### Resolving namespace/type conflicts

When the compiler emits an error about a type and namespace sharing the same name (where the identifier matches a directory name containing a .resx file):
- Move the .resx file outside that folder to remove the conflicting namespace declaration, OR
- Fully qualify the type reference to resolve the build break.

## Debugging tips

- Build with `/p:EmitCompilerGeneratedFiles=true` to write source-generated files to disk for inspection.
- You may also need `/p:CompilerGeneratedFilesOutputPath=<path>` to avoid Windows path length issues.

## Validation

Build the migrated project.

After the build succeeds, verify string resources are still accessible:

1. Load the built assembly in PowerShell.
2. Use reflection APIs to access at least one string from each resx file.
3. Verify property getters successfully return expected strings.
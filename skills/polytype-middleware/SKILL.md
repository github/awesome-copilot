---
name: polytype-middleware
description: "Design or review public APIs for a PolyType middleware library (serializer, comparer, schema exporter, or similar) that must stay complete on net472 and netstandard2.0 while modern .NET callers use where T : IShapeable<T> with no witness. Use when adding generic methods, witness/TProvider overloads, extension members, or a #if NET / #if !NET split. Reference implementation: Nerdbank.MessagePack."
---

# PolyType middleware APIs

A PolyType middleware library sits on `PolyType.IShapeable<T>` and ships one package to every target framework its consumers use. Modern .NET callers get a constrained, witness-free API. Downlevel callers (net472, netstandard2.0, Unity on .NET Standard) still get a complete API, usually with a witness type parameter.

Nerdbank.MessagePack is the reference. Copy the shape below. Do not invent a second public surface.

Repository: https://github.com/AArnott/Nerdbank.MessagePack

The library targets `net10.0`, `net472`, and `netstandard2.0` (`src/Nerdbank.MessagePack/Nerdbank.MessagePack.csproj`). `IShapeable<T>` constraints are part of the `net10.0` assembly only. `net472` and `netstandard2.0` each ship the downlevel surface. Applications that still run on .NET 8 or .NET 9 use those .NET Standard APIs (`docfx/docs/getting-started.md`).

## What the caller should be able to write

Self-describing type (`[GenerateShape]` on `T`, so `T : IShapeable<T>`):

```csharp
serializer.Serialize(value);
byte[] bytes = serializer.Serialize(value);
Person? person = serializer.Deserialize<Person>(bytes);
```

Type the consumer does not own, or a top-level array (`[GenerateShapeFor<T>]` on a witness):

```csharp
serializer.Serialize<ExternalType, Witness>(value);
ExternalType? value = serializer.Deserialize<ExternalType, Witness>(bytes);
```

Explicit shape, every target framework, no source generator required:

```csharp
serializer.Serialize(ref writer, value, shape, cancellationToken);
```

The first two call shapes compile on every TFM. On modern .NET they bind to members declared on the type. On downlevel they bind to extension members, so the file needs `using Nerdbank.MessagePack;` (`docfx/docs/unity.md`).

## Why the members are split

`IShapeable<T>.GetTypeShape()` is a static abstract interface member. `where T : IShapeable<T>` compiles only in the modern assembly. That constraint is the witness-free API: the caller names `T`, and `T` supplies its own shape.

A generic constraint is not part of the method signature. Two methods in the same declaration space cannot differ only by `where T : IShapeable<T>`.

The library therefore keeps two declarations with the same parameters:

1. An instance member (or a static member declared on the type) compiled only under `#if NET`, with the constraint, forwarding to `T.GetTypeShape()` or `TProvider.GetTypeShape()`.
2. An extension member compiled for every TFM, with no `IShapeable<T>` constraint, forwarding to `TypeShapeResolver.ResolveDynamicOrThrow<T>()` or `ResolveDynamicOrThrow<T, TProvider>()`.

Overload resolution prefers an applicable instance member over an extension. When `T : IShapeable<T>`, the constrained member wins. When the constraint is not met, the extension is still a candidate. Serialize and deserialize leave that candidate callable. `GetJsonSchema`, `GetConverter`, and structural equality mark it `Obsolete(error: true)` under `#if NET`, so a modern call that misses the constraint fails at compile time.

The extension stays in the modern assembly. The modern public surface is the downlevel surface plus the constrained members. Wrapping the extension in `#if !NET` would delete that surface from the modern build.

The constrained path is the fast, AOT-friendly one: the shape is a static call. The extension looks the shape up dynamically and throws `NotSupportedException` at runtime when the source generator did not emit it. See the remarks on `MessagePackSerializer` and `MessagePackSerializerExtensions`.

## Preprocessor convention

Use `#if NET` for members and attributes that exist only on modern .NET. Use `#if !NET` for implementations that exist only on downlevel TFMs (polyfills, missing runtime APIs).

The SDK defines `NET` for .NET 5+ target frameworks. In this library that is the `net10.0` output. `net472` and `netstandard2.0` are `!NET`.

Do not select this split with `NET8_0_OR_GREATER`, `NET8_0`, or any other leftover .NET 8 symbol. This library has no .NET 8 target.

`#if !NET` is for downlevel-only code, such as the ref-field fallback in `src/Nerdbank.MessagePack/MessagePackAsyncWriter.cs`. It is not a way to hide the public extension API from modern .NET.

## The three layers

Keep all three. Friendly overloads only obtain a shape and forward.

### 1. Shape-taking implementation, every TFM

The real work takes `ITypeShape<T>` or `ITypeShapeProvider`. No `#if`.

```csharp
public void Serialize<T>(ref MessagePackWriter writer, in T? value, ITypeShape<T> shape, CancellationToken cancellationToken = default)
```

`src/Nerdbank.MessagePack/MessagePackSerializer.cs` (`Serialize`, `Deserialize`, and the async and path overloads). Schema and converter equivalents take the same inputs in `MessagePackSerializer.GetSchema.cs`, `SerializationContext.cs`, and `ConverterContext.cs`.

### 2. Constrained members on the type, `#if NET` only

Two generic shapes, both on the type, both one line of forwarding:

- `where T : IShapeable<T>` calls `T.GetTypeShape()`. This is the no-witness API for `[GenerateShape]`.
- `where TProvider : IShapeable<T>` calls `TProvider.GetTypeShape()`. This is the witness API for `[GenerateShapeFor<T>]`. `T` itself is not constrained.

Abbreviated from `src/Nerdbank.MessagePack/MessagePackSerializer.AutomatedFriendlyOverloads.cs` (the whole partial is inside `#if NET`):

```csharp
public void Serialize<T>(ref MessagePackWriter writer, in T? value, CancellationToken cancellationToken = default)
    where T : IShapeable<T>
    => this.Serialize(ref writer, value, T.GetTypeShape(), cancellationToken);

public void Serialize<T, TProvider>(ref MessagePackWriter writer, in T? value, CancellationToken cancellationToken = default)
    where TProvider : IShapeable<T>
    => this.Serialize(ref writer, value, TProvider.GetTypeShape(), cancellationToken);
```

The same pair is hand-written for:

- `GetJsonSchema<T>` and `GetJsonSchema<T, TProvider>` in `src/Nerdbank.MessagePack/MessagePackSerializer.GetSchema.cs`
- `SerializationContext.GetConverter<T>` and `GetConverter<T, TProvider>` in `src/Nerdbank.MessagePack/SerializationContext.cs`
- `ConverterContext.GetConverter<T>` and `GetConverter<T, TProvider>` in `src/Nerdbank.MessagePack/ConverterContext.cs`
- `StructuralEqualityComparer.GetDefault<T>` and `GetDefault<T, TProvider>` (and the hash-collision-resistant pair) in `src/Nerdbank.MessagePack/StructuralEqualityComparer.cs`
- `DerivedShapeMapping<TBase>.Add<TDerived>` and `Add<TDerived, TProvider>` in `src/Nerdbank.MessagePack/DerivedShapeMapping`1.cs`

`Add<TDerived>` also keeps the base-type constraint the shape-taking method already had: `where TDerived : TBase, IShapeable<TDerived>`.

### 3. Unconstrained extension, every TFM including NET

Same parameters. No `IShapeable<T>` constraint. Dynamic resolve. Null-check the receiver.

Abbreviated from the extension half of `MessagePackSerializer.AutomatedFriendlyOverloads.cs`:

```csharp
#if NET
[PreferDotNetAlternativeApi(MessagePackSerializer.PreferTypeConstrainedInstanceOverloads)]
[EditorBrowsable(EditorBrowsableState.Never)]
#endif
public static void Serialize<T>(this MessagePackSerializer self, ref MessagePackWriter writer, in T? value, CancellationToken cancellationToken = default)
    => Requires.NotNull(self).Serialize(ref writer, value, ResolveTypeShapeOrThrow<T>(self.ConverterCache), cancellationToken);

#if NET
[PreferDotNetAlternativeApi(MessagePackSerializer.PreferTypeConstrainedInstanceOverloads)]
[EditorBrowsable(EditorBrowsableState.Never)]
#endif
public static void Serialize<T, TProvider>(this MessagePackSerializer self, ref MessagePackWriter writer, in T? value, CancellationToken cancellationToken = default)
    => Requires.NotNull(self).Serialize(ref writer, value, ResolveTypeShapeOrThrow<T, TProvider>(self.ConverterCache), cancellationToken);
```

`ResolveTypeShapeOrThrow<T>` and `ResolveTypeShapeOrThrow<T, TProvider>` live in `src/Nerdbank.MessagePack/MessagePackSerializerExtensions.cs`. They call `TypeShapeResolver.ResolveDynamicOrThrow` (or the serializer cache's equivalent) and add array-specific witness guidance to the `NotSupportedException`.

The witness extension takes `TProvider` as a type argument only. It does not say `where TProvider : IShapeable<T>`. That constraint is the modern member's job.

Both halves of the serializer overloads are emitted by one T4 template, `src/Nerdbank.MessagePack/MessagePackSerializer.AutomatedFriendlyOverloads.tt`. `WriteClass(targetNET: true)` writes the constrained instance members. `WriteClass(targetNET: false)` writes the extensions. The template chooses the constraint, the shape expression, and the `#if NET` attributes from that flag. Edit the template when adding a transport, then regenerate the `.cs`. Do not hand-edit one half.

Document on the main type that downlevel callers must import the namespace. `MessagePackSerializer` says so in its remarks.

## Attributes, and where they go

Apply these attributes only inside `#if NET`, on the downlevel member. The downlevel compilation of that same method stays an ordinary public API: visible, not obsolete, not hidden.

| Attribute | Role |
| --- | --- |
| `[EditorBrowsable(EditorBrowsableState.Never)]` | Hides the dynamic member from modern completion. Does not remove it from metadata or from overload resolution. |
| `[PreferDotNetAlternativeApi(message)]` | Internal marker. Analyzer NBMsgPack051 (`src/Nerdbank.MessagePack.Analyzers/DotNetApiUsageAnalyzer.cs`) warns when the marked member is actually invoked. The attribute type is `src/Nerdbank.MessagePack/PreferDotNetAlternativeApiAttribute.cs`. The serializer message is `MessagePackSerializer.PreferTypeConstrainedInstanceOverloads`: "Use a non-extension method that constrains the generic T : IShapeable<T>." |
| `[Obsolete("...", error: true)]` | Turns a modern binding to the dynamic member into a compile error. |

Which combination this library uses:

| Dynamic member | Attributes under `#if NET` |
| --- | --- |
| Serialize and deserialize extensions in `MessagePackSerializer.AutomatedFriendlyOverloads.cs` | `EditorBrowsable.Never`, `PreferDotNetAlternativeApi` |
| `DerivedShapeMapping<T>.AddSourceGenerated` | `EditorBrowsable.Never`, `PreferDotNetAlternativeApi` |
| `GetJsonSchema` and `GetConverter` extensions in `MessagePackSerializerExtensions.cs` | `EditorBrowsable.Never`, `PreferDotNetAlternativeApi`, `Obsolete(..., error: true)` |
| `StructuralEqualityComparer` extension members | `EditorBrowsable.Never`, `Obsolete(..., error: true)` |

Leave `Obsolete` off serialize and deserialize. An unconstrained `T` must still compile against the modern assembly and fail at runtime if no shape was generated. The analyzer warns (NBMsgPack051) so multi-targeting projects can suppress it instead of sprinkling `#if`. See `docfx/analyzers/NBMsgPack051.md`.

Put `Obsolete(..., error: true)` on members where a modern call that misses the constraint should not compile (`GetJsonSchema`, `GetConverter`, structural equality). The extension remains in the assembly. Call sites that satisfy `where T : IShapeable<T>` bind to the member on the type and never see the obsolete extension.

`EditorBrowsable.Never` on the modern build is what makes completion offer `Serialize<T>` and `Serialize<T, TProvider>` on the type. It must not be applied when compiling `net472` or `netstandard2.0`, or downlevel completion loses the only API those TFMs have.

## When both overloads are instance methods

Use a different name for the dynamic member when it cannot be an extension. `DerivedShapeMapping<TBase>.Add` is already an instance method on every TFM (the overloads that take `ITypeShape<TDerived>` or `ITypeShapeProvider`). A second `Add<TDerived>(alias)` that differs only by `where TDerived : IShapeable<TDerived>` is illegal.

The library's split, from `DerivedShapeMapping`1.cs`:

```csharp
#if NET
public void Add<TDerived>(DerivedTypeIdentifier alias)
    where TDerived : TBase, IShapeable<TDerived>
    => this.Add(alias, TDerived.GetTypeShape());

public void Add<TDerived, TProvider>(DerivedTypeIdentifier alias)
    where TDerived : TBase
    where TProvider : IShapeable<TDerived>
    => this.Add(alias, TProvider.GetTypeShape());
#endif

#if NET
[PreferDotNetAlternativeApi(UseDotNetAlternativeMessage)]
[EditorBrowsable(EditorBrowsableState.Never)]
#endif
public void AddSourceGenerated<TDerived>(DerivedTypeIdentifier alias)
    where TDerived : TBase
    => this.Add(alias, TypeShapeResolver.ResolveDynamicOrThrow<TDerived>());
```

`AddSourceGenerated<TDerived, TProvider>` is the witness twin and is also compiled for every TFM.

A multi-targeting caller then branches on the name, as in `samples/cs/AnalyzerDocs/NBMsgPack051.cs`:

```csharp
#if NET
mapping.Add<MyDerivedType>(1);
#else
mapping.AddSourceGenerated<MyDerivedType>(1);
#endif
```

Prefer suppressing NBMsgPack051 over repeating that `#if` at every call. The serialize and deserialize extensions do not need a call-site `#if`: the names match, so one call binds to the instance member or the extension depending on the TFM.

## Static APIs and C# 14 extension members

Classic extension methods only add instance methods. A static call such as `StructuralEqualityComparer.GetDefault<T>()` needs a C# 14 extension block on downlevel, and a real static method on the type under `#if NET`.

Constrained static method, from `StructuralEqualityComparer.cs`:

```csharp
#if NET
public static IEqualityComparer<T> GetDefault<T>()
    where T : IShapeable<T>
    => (IEqualityComparer<T>)DefaultEqualityComparerCache.GetOrAdd(T.GetTypeShape())!;

public static IEqualityComparer<T> GetDefault<T, TProvider>()
    where TProvider : IShapeable<T>
    => (IEqualityComparer<T>)DefaultEqualityComparerCache.GetOrAdd(TProvider.GetTypeShape())!;
#endif
```

Downlevel shape, from `StructuralEqualityComparerExtensions.cs`. The file is wrapped in `#if !DOCFX` because DocFX does not parse extension blocks. Use that guard only when the doc tool has the same limitation.

```csharp
extension(StructuralEqualityComparer)
{
#if NET
    [EditorBrowsable(EditorBrowsableState.Never)]
    [Obsolete("Use the StructuralEqualityComparer.GetDefault<T>() method instead. Check that T actually has a [GenerateShape] attribute or otherwise implements IShapeable<T> to avoid a runtime failure.", error: true)]
#endif
    public static IEqualityComparer<T> GetDefault<T>()
        => (IEqualityComparer<T>)StructuralEqualityComparer.DefaultEqualityComparerCache.GetOrAdd(TypeShapeResolver.ResolveDynamicOrThrow<T>())!;
}
```

Consumers need C# 14 (`LangVersion` 14) to call extension members, including when the project targets .NET Framework or .NET Standard. The runtime does not need to be modern. `docfx/docs/getting-started.md` states that.

## Do

- Put the implementation on `ITypeShape<T>` and `ITypeShapeProvider` methods that exist on every TFM. Friendly overloads only fetch a shape and forward.
- Under `#if NET`, add `where T : IShapeable<T>` and `where TProvider : IShapeable<T>` as members of the type. Call `T.GetTypeShape()` or `TProvider.GetTypeShape()`.
- Keep an unconstrained extension (or a differently named instance method) on every TFM, including the modern one. Resolve with `TypeShapeResolver.ResolveDynamicOrThrow<T>()` or `ResolveDynamicOrThrow<T, TProvider>()`.
- Keep the parameter list of the dynamic member identical to the constrained member. The declaration site and the constraint are what differ.
- Put `EditorBrowsable.Never`, `PreferDotNetAlternativeApi`, and `Obsolete` only inside `#if NET`.
- Offer both generic shapes whenever the operation can run on a type the caller owns and on a type they do not own. Top-level arrays need a witness even when the element type has `[GenerateShape]` (`docfx/docs/type-shapes.md`).
- State in the type remarks that downlevel projects need the namespace import to see the extensions.
- Generate repeated overload pairs from one template so the constrained half and the extension half cannot drift.
- If a warning is preferable to a hard error, ship an analyzer that reads an attribute on the dynamic member, and document a suppression for multi-targeting projects. This repo's diagnostic is NBMsgPack051.

## Do not

- Do not remove the dynamic member from the modern assembly, and do not wrap it in `#if !NET`. Constrained overloads are additive.
- Do not declare the constrained overload as a second extension with the same parameters. That is a duplicate signature. The member on the type is what overload resolution prefers.
- Do not put `where T : IShapeable<T>` or `where TProvider : IShapeable<T>` on the downlevel member. Those constraints do not compile for net472 or netstandard2.0, and they remove the dynamic fallback.
- Do not make the common case pass `ITypeShape<T>` or a witness. Witness-free `where T : IShapeable<T>` is the modern API for `[GenerateShape]` types.
- Do not drop the witness overload. External types and top-level arrays still need `TProvider`.
- Do not change the dynamic member's parameters, name, or visibility when adding the constrained member, except for the `Add` / `AddSourceGenerated` case where a second instance method needs a distinct name.
- Do not apply `EditorBrowsable.Never` or `Obsolete` to the downlevel compilation. That is the API those callers have.
- Do not mark serialize or deserialize extensions `Obsolete(error: true)`. That removes the unconstrained fallback the modern assembly still publishes.
- Do not choose the modern API with `NET8_0_OR_GREATER`, `NET8_0`, or any other .NET 8-specific symbol. Use `#if NET` and `#if !NET`.

## Review checklist

1. Every friendly operation has an `ITypeShape<T>` (or `ITypeShapeProvider`) implementation on every TFM.
2. `#if NET` adds `where T : IShapeable<T>` on the type, calling `T.GetTypeShape()`, with no witness parameter.
3. `#if NET` adds `where TProvider : IShapeable<T>` on the type, calling `TProvider.GetTypeShape()`.
4. The unconstrained extension, or the distinctly named instance method, is compiled into the modern assembly as well as net472 and netstandard2.0.
5. `EditorBrowsable`, `Obsolete`, and `PreferDotNetAlternativeApi` sit inside `#if NET` on that dynamic member.
6. The preprocessor symbols are `NET` and `!NET`.
7. A netstandard2.0 caller can finish the operation with a witness type argument and a namespace import.
8. A net10.0 caller whose type has `[GenerateShape]` can call the operation with a single type argument.
9. New serializer transports were added in the T4 template, and both generated halves match.

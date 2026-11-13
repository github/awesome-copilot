---
name: polytype-middleware
description: 'Design or review the public API of a PolyType middleware library so it stays complete on net472 and netstandard2.0 while modern .NET callers use where T : IShapeable<T> with no witness. Use when adding generic methods, witness or TProvider overloads, extension members, or a #if NET / #if !NET split.'
---

# PolyType middleware APIs

A PolyType middleware library sits on `PolyType.IShapeable<T>` and ships one package to every target framework its consumers use. Modern .NET callers get a constrained, witness-free API. Downlevel callers (`net472`, `netstandard2.0`) still get a complete API, usually with a witness type parameter. Callers that still run on .NET 8 or .NET 9 use that downlevel surface.

Use the same shape for every friendly operation. The modern assembly is the downlevel surface plus the constrained members.

## Why the members are split

`IShapeable<T>.GetTypeShape()` is a static abstract interface member. `where T : IShapeable<T>` compiles only in the modern assembly. That constraint is the witness-free API: the caller names `T`, and `T` supplies its own shape.

A generic constraint is not part of the method signature. Two methods in the same declaration space cannot differ only by `where T : IShapeable<T>`.

Keep two declarations with the same parameters:

1. A member declared on the type, compiled only under `#if NET`, with the constraint, forwarding to `T.GetTypeShape()` or `TProvider.GetTypeShape()`.
2. An extension member compiled for every TFM, with no `IShapeable<T>` constraint, forwarding to `TypeShapeResolver.ResolveDynamicOrThrow<T>()` or `ResolveDynamicOrThrow<T, TProvider>()`.

Overload resolution prefers an applicable instance member over an extension. When `T : IShapeable<T>`, the constrained member wins. When the constraint is not met, the extension is still a candidate.

The extension stays in the modern assembly. Wrapping it in `#if !NET` removes that surface from the modern build. Constrained overloads are additive.

The constrained path is the fast, AOT-friendly one: the shape is a static call. The extension looks the shape up dynamically and throws `NotSupportedException` at runtime when the source generator did not emit it.

## Preprocessor

Use `#if NET` for members and attributes that exist only on modern .NET. Use `#if !NET` for implementations that exist only on downlevel TFMs, such as polyfills and missing runtime APIs.

The SDK defines `NET` for .NET 5 and later. `net472` and `netstandard2.0` are `!NET`. Select this split with `NET` and `!NET`. Leave `NET8_0_OR_GREATER`, `NET8_0`, and other version-specific symbols unused.

`#if !NET` is for downlevel-only implementation. It is not a way to hide the public extension from modern .NET.

## The pattern

Friendly overloads only obtain a shape and forward. Real work takes `ITypeShape<T>` or `ITypeShapeProvider` and exists on every TFM, with no `#if`.

The sample is one method, `ShapeMiddleware.Process`. Copy this split for each operation. `IShapeable<T>`, `ITypeShape<T>`, and `TypeShapeResolver` come from PolyType. `PreferDotNetAlternativeApi` is an attribute the library defines so an analyzer can see the dynamic member.

```csharp
public sealed class ShapeMiddleware
{
    // Real work. Every TFM.
    public void Process<T>(T? value, ITypeShape<T> shape)
    {
        ArgumentNullException.ThrowIfNull(shape);
        // use shape
    }

#if NET
    public void Process<T>(T? value)
        where T : IShapeable<T>
        => this.Process(value, T.GetTypeShape());

    public void Process<T, TProvider>(T? value)
        where TProvider : IShapeable<T>
        => this.Process(value, TProvider.GetTypeShape());
#endif
}

extension(ShapeMiddleware self)
{
#if NET
    [PreferDotNetAlternativeApi("Use the method that constrains T : IShapeable<T>.")]
    [EditorBrowsable(EditorBrowsableState.Never)]
    [Obsolete("T must implement IShapeable<T>, or pass a witness type.", error: true)] // omit Obsolete when this fallback must still compile
#endif
    public void Process<T>(T? value)
    {
        ArgumentNullException.ThrowIfNull(self);
        self.Process(value, TypeShapeResolver.ResolveDynamicOrThrow<T>());
    }

#if NET
    [PreferDotNetAlternativeApi("Use the method that constrains T : IShapeable<T>.")]
    [EditorBrowsable(EditorBrowsableState.Never)]
    [Obsolete("T must implement IShapeable<T>, or pass a witness type.", error: true)] // omit Obsolete when this fallback must still compile
#endif
    public void Process<T, TProvider>(T? value)
    {
        ArgumentNullException.ThrowIfNull(self);
        self.Process(value, TypeShapeResolver.ResolveDynamicOrThrow<T, TProvider>());
    }
}
```

`where T : IShapeable<T>` calls `T.GetTypeShape()`. That is the witness-free API for `[GenerateShape]` on `T`. `where TProvider : IShapeable<T>` calls `TProvider.GetTypeShape()`. That is the witness API for `[GenerateShapeFor<T>]`. `T` itself is not constrained on the witness member. The witness extension takes `TProvider` as a type argument only. It does not repeat `where TProvider : IShapeable<T>`.

A caller whose type has `[GenerateShape]` writes `middleware.Process(value)` on modern .NET. A type the caller does not own, including a top-level array, needs a witness: `middleware.Process<ExternalType, Witness>(value)`. Passing an `ITypeShape<T>` or `ITypeShapeProvider` explicitly works on every TFM with no source generator: `middleware.Process(value, shape)`.

The first two calls compile on every TFM. On modern .NET they bind to the members declared on the type. On downlevel they bind to the extension, so the file needs the namespace import. State that in the remarks on the type.

A static operation uses the same split. Declare the constrained method on the type under `#if NET`. Put the unconstrained member in the extension block, on every TFM. Consumers need C# 14 (`LangVersion` 14) to call extension members, including when the project targets .NET Framework or .NET Standard. The runtime does not need to be modern. Guard the extension block from a documentation tool only when that tool cannot parse it.

When the dynamic member cannot be an extension because the type already has an instance method with those parameters, give the dynamic member a different name. A second instance method that differs only by the constraint is illegal. Keep the constrained member's name under `#if NET`, and compile the distinctly named dynamic member for every TFM with the same parameters and the same `#if NET` attributes.

## Attributes

Apply `EditorBrowsable`, `PreferDotNetAlternativeApi`, and `Obsolete` only inside `#if NET`, on the dynamic member. The downlevel compilation of that same method stays an ordinary public API: visible, not obsolete, and not hidden.

| Attribute | Role |
| --- | --- |
| `[EditorBrowsable(EditorBrowsableState.Never)]` | Hides the dynamic member from modern completion. It stays in metadata and in overload resolution. |
| `[PreferDotNetAlternativeApi(message)]` | Marker the library defines. An analyzer can warn when a caller actually invokes the marked member, so a multi-targeting project can suppress that warning. |
| `[Obsolete("...", error: true)]` | Turns a modern binding to the dynamic member into a compile error. |

Include `Obsolete(..., error: true)` when a modern call that misses the constraint should not compile. Leave it off when an unconstrained `T` must still compile against the modern assembly and fail at runtime if no shape was generated. The extension remains in the assembly either way. A call site that satisfies `where T : IShapeable<T>` binds to the member on the type and never sees the obsolete extension.

`EditorBrowsable.Never` on the modern build is what makes completion offer the constrained overloads on the type. Applying it while compiling `net472` or `netstandard2.0` hides the only API those TFMs have.

The library may ship an analyzer that reads the marker attribute and steers .NET callers toward the constrained overload. Document the suppression for multi-targeting projects.

## Do

- Put the implementation on an `ITypeShape<T>` or `ITypeShapeProvider` method that exists on every TFM. Friendly overloads only fetch a shape and forward.
- Under `#if NET`, add `where T : IShapeable<T>` and `where TProvider : IShapeable<T>` as members of the type. Call `T.GetTypeShape()` or `TProvider.GetTypeShape()`.
- Keep an unconstrained extension, or a differently named instance method, on every TFM, including the modern one. Resolve with `TypeShapeResolver.ResolveDynamicOrThrow<T>()` or `ResolveDynamicOrThrow<T, TProvider>()`.
- Keep the parameter list of the dynamic member identical to the constrained member. The declaration site and the constraint are what differ.
- Put `EditorBrowsable.Never`, `PreferDotNetAlternativeApi`, and `Obsolete` only inside `#if NET`.
- Offer both generic shapes when the operation can run on a type the caller owns and on a type they do not own. Top-level arrays need a witness even when the element type has `[GenerateShape]`.
- State in the type remarks that downlevel projects need the namespace import to see the extensions.
- Generate repeated overload pairs from one template so the constrained half and the extension half stay aligned.
- When a warning is preferable to a hard error, ship an analyzer that reads an attribute on the dynamic member, and document a suppression for multi-targeting projects.

## Do not

- Do not remove the dynamic member from the modern assembly, and do not wrap it in `#if !NET`. Constrained overloads are additive.
- Do not declare the constrained overload as a second extension with the same parameters. That is a duplicate signature. The member on the type is what overload resolution prefers.
- Do not put `where T : IShapeable<T>` or `where TProvider : IShapeable<T>` on the downlevel member. Those constraints do not compile for `net472` or `netstandard2.0`, and they remove the dynamic fallback.
- Do not make the common case pass `ITypeShape<T>` or a witness. Witness-free `where T : IShapeable<T>` is the modern API for `[GenerateShape]` types.
- Do not drop the witness overload. External types and top-level arrays still need `TProvider`.
- Do not change the dynamic member's parameters, name, or visibility when adding the constrained member, except when a second instance method needs a distinct name.
- Do not apply `EditorBrowsable.Never` or `Obsolete` to the downlevel compilation. That is the API those callers have.
- Do not mark the dynamic member `Obsolete(error: true)` when an unconstrained `T` must still compile against the modern assembly.
- Do not choose the modern API with `NET8_0_OR_GREATER`, `NET8_0`, or any other version-specific symbol. Use `#if NET` and `#if !NET`.

## Review checklist

1. Every friendly operation has an `ITypeShape<T>` or `ITypeShapeProvider` implementation on every TFM.
2. `#if NET` adds `where T : IShapeable<T>` on the type, calling `T.GetTypeShape()`, with no witness parameter.
3. `#if NET` adds `where TProvider : IShapeable<T>` on the type, calling `TProvider.GetTypeShape()`.
4. The unconstrained extension, or the distinctly named instance method, is compiled into the modern assembly as well as `net472` and `netstandard2.0`.
5. `EditorBrowsable`, `Obsolete`, and `PreferDotNetAlternativeApi` sit inside `#if NET` on that dynamic member.
6. The preprocessor symbols are `NET` and `!NET`.
7. A `netstandard2.0` caller can finish the operation with a witness type argument and a namespace import.
8. A modern caller whose type has `[GenerateShape]` can call the operation with a single type argument.
9. Generated overload pairs come from one template, and both halves match.

For more examples, see [Nerdbank.MessagePack](https://github.com/AArnott/Nerdbank.MessagePack).

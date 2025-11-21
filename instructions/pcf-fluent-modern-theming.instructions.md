---
description: 'Style components with modern theming using Fluent UI'
applyTo: '**/*.{ts,tsx,js,json,xml,pcfproj,csproj}'
---

# Style Components with Modern Theming (Preview)

[This topic is pre-release documentation and is subject to change.]

Developers need to be able to style their components so they look like the rest of the application they're included in. They can do this when modern theming is in effect for either a canvas app (via the [Modern controls and themes](https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/controls/modern-controls/overview-modern-controls) feature) or model-driven app (through the [new refreshed look](https://learn.microsoft.com/en-us/power-apps/user/modern-fluent-design)).

Use modern theming, which is based on [Fluent UI React v9](https://react.fluentui.dev/), to style your component. This approach is recommended to get the best performance and theming experience for your component.

## Four Ways to Apply Modern Theming

1. **Fluent UI v9 controls**
2. **Fluent UI v8 controls**
3. **Non-Fluent UI controls**
4. **Custom theme providers**

## Fluent UI v9 Controls

Wrapping Fluent UI v9 controls as a component is the easiest way to utilize modern theming because the modern theme is automatically applied to these controls. The only prerequisite is to ensure your component adds a dependency on the [React controls & platform libraries](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/react-controls-platform-libraries).

This approach allows your component to use the same React and Fluent libraries as the platform, and therefore share the same React context that passes the theme tokens down to the component.

```xml
<resources>
  <code path="index.ts" order="1"/>
  <!-- Dependency on React controls & platform libraries -->
  <platform-library name="React" version="16.14.0" />
  <platform-library name="Fluent" version="9.46.2" />
</resources>
```

## Fluent UI v8 Controls

Fluent provides a migration path for applying v9 theme constructs when you use Fluent UI v8 controls in your component. Use the `createV8Theme` function included in the [Fluent's v8 to v9 migration package](https://www.npmjs.com/package/@fluentui/react-migration-v8-v9) to create a v8 theme based on v9 theme tokens:

```typescript
const theme = createV8Theme(
  context.fluentDesignLanguage.brand,
  context.fluentDesignLanguage.theme
);
return <ThemeProvider theme={theme}></ThemeProvider>;
```

## Non-Fluent UI Controls

If your component doesn't use Fluent UI, you can take a dependency directly on the v9 theme tokens available through the `fluentDesignLanguage` context parameter. Use this parameter to get access to all [theme](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/reference/theming) tokens so it can reference any aspect of the theme to style itself.

```typescript
<span style={{ fontSize: context.fluentDesignLanguage.theme.fontSizeBase300 }}>
  {"Stylizing HTML with platform provided theme."}
</span>
```

## Custom Theme Providers

When your component requires styling that is different from the current theme of the app, create your own `FluentProvider` and pass your own set of theme tokens to be used by your component.

```typescript
<FluentProvider theme={context.fluentDesignLanguage.tokenTheme}>
  {/* your control */}
</FluentProvider>
```

## Sample Controls

Examples for each of these use cases are available at [Modern Theming API control](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/sample-controls/modern-theming-api-control).

## FAQ

### Q: My control uses Fluent UI v9 and has a dependency on the platform libraries, but I don't want to utilize modern theming. How can I disable it for my component?

A: You can do this two different ways:

**Option 1**: Create your own component-level `FluentProvider`

```typescript
<FluentProvider theme={customFluentV9Theme}>
  {/* your control */}
</FluentProvider>
```

**Option 2**: Wrap your control inside `IdPrefixContext.Provider` and set your own `idPrefix` value. This prevents your component from getting theme tokens from the platform.

```typescript
<IdPrefixProvider value="custom-control-prefix">
  <Label weight="semibold">This label is not getting Modern Theming</Label>
</IdPrefixProvider>
```

### Q: Some of my Fluent UI v9 controls aren't getting styles

A: Fluent v9 controls that rely on the React Portal need to be rewrapped in the theme provider to ensure styling is properly applied. You can use `FluentProvider`.

### Q: How can I check if modern theming is enabled?

A: You can check if tokens are available: `context.fluentDesignLanguage?.tokenTheme`. Or in model-driven applications you can check app settings: `context.appSettings.getIsFluentThemingEnabled()`.

## Related Articles

- [Theming (Power Apps component framework API reference)](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/reference/theming)
- [Modern Theming API control](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/sample-controls/modern-theming-api-control)
- [Use modern themes in canvas apps (preview)](https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/controls/modern-controls/modern-theming)

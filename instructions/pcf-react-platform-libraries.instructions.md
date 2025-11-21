---
description: 'React controls and platform libraries for PCF components'
applyTo: '**/*.{ts,tsx,js,json,xml,pcfproj,csproj}'
---

# React Controls & Platform Libraries

When you use React and platform libraries, you're using the same infrastructure used by the Power Apps platform. This means you no longer have to package React and Fluent libraries individually for each control. All controls share a common library instance and version to provide a seamless and consistent experience.

## Benefits

By reusing the existing platform React and Fluent libraries, you can expect:

- **Reduced control bundle size**
- **Optimized solution packaging**
- **Faster runtime transfer, scripting, and control rendering**
- **Design and theme alignment with the Power Apps Fluent design system**

> **Note**: With GA release, all existing virtual controls will continue to function. However, they should be rebuilt and deployed using the latest CLI version (>=1.37) to facilitate future platform React version upgrades.

## Prerequisites

As with any component, you must install [Visual Studio Code](https://code.visualstudio.com/Download) and the [Microsoft Power Platform CLI](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/powerapps-cli#install-microsoft-power-platform-cli).

> **Note**: If you have already installed Power Platform CLI for Windows, make sure you are running the latest version by using the `pac install latest` command. The Power Platform Tools for Visual Studio Code should update automatically.

## Create a React Component

> **Note**: These instructions expect that you have created code components before. If you have not, see [Create your first component](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/implementing-controls-using-typescript).

There's a new `--framework` (`-fw`) parameter for the `pac pcf init` command. Set the value of this parameter to `react`.

### Command Parameters

| Parameter | Value |
|-----------|-------|
| --name | ReactSample |
| --namespace | SampleNamespace |
| --template | field |
| --framework | react |
| --run-npm-install | true (default) |

### PowerShell Command

The following PowerShell command uses the parameter shortcuts and creates a React component project and runs `npm-install`:

```powershell
pac pcf init -n ReactSample -ns SampleNamespace -t field -fw react -npm
```

You can now build and view the control in the test harness as usual using `npm start`.

After you build the control, you can package it inside solutions and use it for model-driven apps (including custom pages) and canvas apps like standard code components.

## Differences from Standard Components

### ControlManifest.Input.xml

The [control element](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/manifest-schema-reference/control) `control-type` attribute is set to `virtual` rather than `standard`.

> **Note**: Changing this value does not convert a component from one type to another.

Within the [resources element](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/manifest-schema-reference/resources), find two new [platform-library element](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/manifest-schema-reference/platform-library) child elements:

```xml
<resources>
  <code path="index.ts" order="1" />
  <platform-library name="React" version="16.14.0" />
  <platform-library name="Fluent" version="9.46.2" />
</resources>
```

> **Note**: For more information about valid platform library versions, see Supported platform libraries list.

**Recommendation**: We recommend using platform libraries for Fluent 8 and 9. If you don't use Fluent, you should remove the `platform-library` element where the `name` attribute value is `Fluent`.

### Index.ts

The [ReactControl.init](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/reference/react-control/init) method for control initialization doesn't have `div` parameters because React controls don't render the DOM directly. Instead [ReactControl.updateView](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/reference/react-control/updateview) returns a ReactElement that has the details of the actual control in React format.

### bundle.js

React and Fluent libraries aren't included in the package because they're shared, therefore the size of bundle.js is smaller.

## Sample Controls

The following controls are included in the samples. They function the same as their standard versions but offer better performance since they are virtual controls.

| Sample | Description | Link |
|--------|-------------|------|
| ChoicesPickerReact | The standard ChoicesPickerControl converted to be a React Control | ChoicesPickerReact Sample |
| FacepileReact | The ReactStandardControl converted to be a React Control | FacepileReact |

## Supported Platform Libraries List

Platform libraries are made available both at the build and runtime to the controls that are using platform libraries capability. Currently, the following versions are provided by the platform and are the highest currently supported versions.

| Library | Package | Build Version | Runtime Version |
|---------|---------|---------------|-----------------|
| React | react | 16.14.0 | 17.0.2 (Model), 16.14.0 (Canvas) |
| Fluent | @fluentui/react | 8.29.0 | 8.29.0 |
| Fluent | @fluentui/react | 8.121.1 | 8.121.1 |
| Fluent | @fluentui/react-components | >=9.4.0 <=9.46.2 | 9.68.0 |

> **Note**: The application might load a higher compatible version of a platform library at runtime, but the version might not be the latest version available. Fluent 8 and Fluent 9 are each supported but can not both be specified in the same manifest.

## FAQ

### Q: Can I convert an existing standard control to a React control using platform libraries?

A: No. You must create a new control using the new template and then update the manifest and index.ts methods. For reference, compare the standard and react samples described above.

### Q: Can I use React controls & platform libraries with Power Pages?

A: No. React controls & platform libraries are currently only supported for canvas and model-driven apps. In Power Pages, React controls don't update based on changes in other fields.

## Related Articles

- [What are code components?](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/custom-controls-overview)
- [Code components for canvas apps](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/component-framework-for-canvas-apps)
- [Create and build a code component](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/create-custom-controls-using-pcf)
- [Learn Power Apps component framework](https://learn.microsoft.com/en-us/training/paths/use-power-apps-component-framework)
- [Use code components in Power Pages](https://learn.microsoft.com/en-us/power-apps/maker/portals/component-framework)

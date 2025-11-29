---
description: 'Application lifecycle management (ALM) for PCF code components'
applyTo: '**/*.{ts,tsx,js,json,xml,pcfproj,csproj,sln}'
---

# Code Components Application Lifecycle Management (ALM)

ALM is a term used to describe the lifecycle management of software applications, which includes development, maintenance, and governance. More information: [Application lifecycle management (ALM) with Microsoft Power Platform](https://learn.microsoft.com/en-us/power-platform/alm/overview-alm).

This article describes considerations and strategies for working with specific aspects of lifecycle management from the perspective of code components in Microsoft Dataverse:

1. Development and debugging ALM considerations
2. Code component solution strategies
3. Versioning and deploying updates
4. Canvas apps ALM considerations

## Development and Debugging ALM Considerations

When developing code components, you would follow the steps below:

1. Create code component project (`pcfproj`) from a template using `pac pcf init`. More information: [Create and build a code component](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/create-custom-controls-using-pcf).
2. Implement code component logic. More information: [Component implementation](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/custom-controls-overview#component-implementation).
3. Debug the code component using the local test harness. More information: [Debug code components](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/debugging-custom-controls).
4. Create a solution project (`cdsproj`) and add the code component project as a reference. More information: [Package a code component](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/import-custom-controls).
5. Build the code component in release mode for distribution and deployment.

### Two Deployment Methods to Dataverse

When your code component is ready for testing inside a model-driven app, canvas app, or portal:

1. **`pac pcf push`**: This deploys a single code component at a time to a solution specified by the `--solution-unique-name` parameter, or a temporary PowerAppsTools solution when no solution is specified.

2. **Using `pac solution init` and `msbuild`**: Build a `cdsproj` solution project that has references to one or more code components. Each code component is added to the `cdsproj` using `pac solution add-reference`. A solution project can contain references to multiple code components, whereas code component projects may only contain a single code component.

The following diagram shows the one-to-many relationship between `cdsproj` and `pcfproj` projects:

![One-to-many relationship between cdsproj and pcfproj projects](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/media/code-component-projects.png)

More information: [Package a code component](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/import-custom-controls#package-a-code-component).

## Building pcfproj Code Component Projects

When building `pcfproj` projects, the generated JavaScript depends on the command used to build and the `PcfBuildMode` in the `pcfproj` file.

You don't normally deploy a code component into Microsoft Dataverse that has been built in development mode since it's often too large to import and may result in slower runtime performance. More information: [Debugging after deploying into Microsoft Dataverse](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/debugging-custom-controls#debugging-after-deploying-into-microsoft-dataverse).

For `pac pcf push` to result in a release build, the `PcfBuildMode` is set inside the `pcfproj` by adding a new element under the `OutputPath` element:

```xml
<PropertyGroup>
   <Name>my-control</Name>
   <ProjectGuid>6aaf0d27-ec8b-471e-9ed4-7b3bbc35bbab</ProjectGuid>
   <OutputPath>$(MSBuildThisFileDirectory)out\controls</OutputPath>
   <PcfBuildMode>production</PcfBuildMode>
</PropertyGroup>
```

### Build Commands

| Command | Default Behavior | With PcfBuildMode=production |
|---------|-----------------|------------------------------|
| npm start watch | Always development |   |
| pac pcf push | Development build | Release build |
| npm run build | Development build | `npm run build -- --buildMode production` |

More information: [Package a code component](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/import-custom-controls#package-a-code-component).

## Building .cdsproj Solution Projects

When building a solution project (`.cdsproj`), you have the option to generate the output as a managed or unmanaged solution. Managed solutions are used to deploy to any environment that isn't a development environment for that solution. This includes test, UAT, SIT, and production environments. More information: [Managed and unmanaged solutions](https://learn.microsoft.com/en-us/power-platform/alm/solution-concepts-alm#managed-and-unmanaged-solutions).

The `SolutionPackagerType` is included in the `.cdsproj` file created by `pac solution init`, but initially commented out. Uncomment the section and set to Managed, Unmanaged, or Both.

```xml
<!-- Solution Packager overrides, un-comment to use: SolutionPackagerType (Managed, Unmanaged, Both) -->
<PropertyGroup>
   <SolutionPackageType>Managed</SolutionPackageType>
</PropertyGroup>
```

### Build Configuration Results

| Command | SolutionPackageType | Result |
|---------|-------------------|---------|
| msbuild | Managed | Development build inside Managed Solution |
| msbuild /p:configuration=Release | Managed | Release build inside Managed Solution |
| msbuild | Unmanaged | Development build inside Unmanaged Solution |
| msbuild /p:configuration=Release | Unmanaged | Release build inside Unmanaged Solution |

More information: [Package a code component](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/import-custom-controls#package-a-code-component).

## Source Code Control with Code Components

When developing code components, it's recommended that you use a source code control provider such as Azure DevOps or GitHub. When committing changes using git source control, the `.gitignore` file provided by the `pac pcf init` template will ensure that some files are not added to the source control because they're either restored by `npm` or are generated as part of the build process:

```
# dependencies
/node_modules

# generated directory
**/generated

# output directory
/out

# msbuild output directories
/bin
/obj
```

Since the `/out` folder is excluded, the resulting `bundle.js` file (and related resources) built will not be added to the source control. When your code components are built manually or as part of an automated build pipeline, the `bundle.js` would be built using the latest code to ensure that all changes are included.

Additionally, when a solution is built, any association solution zip files would not be committed to the source control. Instead, the output would be published as binary release artifacts.

## Using SolutionPackager with Code Components

In addition to source controlling the `pcfproj` and `cdsproj`, [SolutionPackager](https://learn.microsoft.com/en-us/power-platform/alm/solution-packager-tool) may be used to incrementally unpack a solution into its respective parts as a series of XML files that can be committed into source control. This has the advantage of creating a complete picture of your metadata in the human-readable format so you can track changes using pull requests or similar.

> **Note**: At this time, SolutionPackager differs from using `pac solution clone` in that it can be used incrementally to export changes from a Dataverse solution.

### Example Solution Structure

Once a solution that contains a code component is unpacked using `SolutionPackager /action: Extract`, it will look similar to:

```
.
├── Controls
│   └── prefix_namespace.ControlName
│       ├── bundle.js *
│       └── css
│          └── ControlName.css *
│       ├── ControlManifest.xml *
│       └── ControlManifest.xml.data.xml
├── Entities
│   └── Contact
│       ├── FormXml
│       │   └── main
│       │       └── {3d60f361-84c5-eb11-bacc-000d3a9d0f1d}.xml
│       ├── Entity.xml
│       └── RibbonDiff.xml
└── Other
    ├── Customizations.xml
    └── Solution.xml
```

Under the `Controls` folder, you can see there are subfolders for each code component included in the solution. When committing this folder structure to the source control, you would exclude the files marked with an asterisk (*) above, because they will be output when the `pcfproj` project is built for the corresponding component.

The only files that are required are the `*.data.xml` files since they contain metadata that describes the resources required by the packaging process.

More information: [SolutionPackager command-line arguments](https://learn.microsoft.com/en-us/power-platform/alm/solution-packager-tool#solutionpackager-command-line-arguments).

## Code Component Solution Strategies

Code components are deployed to downstream environments using Dataverse solutions. There are two strategies for deploying code components inside solutions:

### 1. Segmented Solutions

A solution project is created using `pac solution init` and then using `pac solution add-reference` to add one or more code components. This solution can then be exported and imported into downstream environments and other segmented solutions will take a dependency on the code component solution such that it must be deployed into that environment first.

**Reasons for adopting segmented solution approach:**

1. **Versioning lifecycle** - You want to develop, deploy, and version-control your code components on a separate lifecycle to the other parts of your solution. This is common in 'fusion team' scenarios where code components built by developers are being consumed by app makers.

2. **Shared use** - You want to share your code components between multiple environments and therefore don't want to couple your code components with any other solution components. This could be if you're an ISV or developing a code component for use by different parts of your organization.

### 2. Single Solution

A single solution is created inside a Dataverse environment and then code components are added along with other solution components (such as tables, model-driven apps, or canvas apps) that in turn reference those code components. This solution can be exported and imported into downstream environments without any inter-solution dependencies.

### Solution Lifecycle Overview

![Solution Strategies](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/media/solution-strategies.png)

More information: [Package and distribute extensions using solutions](https://learn.microsoft.com/en-us/powerapps/developer/data-platform/introduction-solutions).

## Code Components and Automated Build Pipelines

In addition to manually building and deploying your code component solutions, you can also build and package your code components using automated build pipelines.

- If you're using Azure DevOps, you can use the [Microsoft Power Platform Build Tool for Azure DevOps](https://learn.microsoft.com/en-us/power-platform/alm/devops-build-tools).
- If you're using GitHub, you can use the [Power Platform GitHub Actions](https://learn.microsoft.com/en-us/power-platform/alm/devops-github-actions).

### Advantages of Automated Build Pipelines

- **Time-efficient** - Removing the manual tasks makes building and packaging quicker
- **Repeatable** - Performed the same every time, not dependent on the team member
- **Versioning consistency** - Automatic versioning relative to previous versions
- **Maintainable** - Everything needed to build is contained in source control

## Versioning and Deploying Updates

When deploying and updating your code components, it's important to have a consistent versioning strategy. A common versioning strategy is [semantic versioning](https://semver.org/), which has the format: `MAJOR.MINOR.PATCH`.

### Incrementing the PATCH Version

The `ControlManifest.Input.xml` stores the code component version in the control element:

```xml
<control namespace="..." constructor="..." version="1.0.0" display-name-key="..." description-key="..." control-type="...">
```

When deploying an update to a code component, the version in the `ControlManifest.Input.xml` must at minimum have its PATCH (the last part of the version) incremented for the change to be detected.

**Commands to update version:**

```bash
# Advance the PATCH version by one
pac pcf version --strategy manifest

# Specify an exact PATCH value (e.g., in automated build pipeline)
pac pcf version --patchversion <PATCH VERSION>
```

### When to Increment the MAJOR and MINOR Version

It's recommended that the MAJOR and MINOR version of the code component's version are kept in sync with the Dataverse solution that is distributed.

A [Dataverse solution has four parts](https://learn.microsoft.com/en-us/powerapps/maker/data-platform/update-solutions#understanding-version-numbers-for-updates): `MAJOR.MINOR.BUILD.REVISION`.

| Code Component | Dataverse Solution | Notes |
|----------------|-------------------|--------|
| MAJOR | MAJOR | Set using Pipeline Variable or last committed value |
| MINOR | MINOR | Set using Pipeline Variable or last committed value |
| PATCH | BUILD | $(Build.BuildId) |
| --- | REVISION | $(Rev:r) |

## Canvas Apps ALM Considerations

Consuming code components in canvas apps is different from doing so in model-driven apps. Code components must be explicitly added to the app by selecting **Get more components** on the Insert panel. Once the code component is added to the canvas app, it's included as the content inside the app definition.

To update to a new version of the code component after it's deployed (and the control version incremented), the app maker must first open the app in Power Apps Studio and select **Update** when prompted on the Update code components dialog. The app must then be saved and published for the new version to be used when the app is played by users.

![Update code components](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/media/upgrade-code-component.png)

If the app is not updated or **Skip** is used, the app continues to use the older version of the code component, even though it doesn't exist in the environment since it's been overwritten by the newer version.

Since the app contains a copy of the code component, it's therefore possible to have different versions of the code components running side by side in a single environment from inside different canvas apps. However, you cannot have different versions of a code component running side by side in the same app.

> **Note**: Although, at this time, you can import a canvas app without the matching code component being deployed to that environment, it's recommended that you always ensure apps are updated to use the latest version of the code components and that the same version is deployed to that environment first or as part of the same solution.

## Related Articles

- [Application lifecycle management (ALM) with Microsoft Power Platform](https://learn.microsoft.com/en-us/power-platform/alm/overview-alm)
- [Power Apps component framework API reference](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/reference/)
- [Create your first component](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/implementing-controls-using-typescript)
- [Debug code components](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/debugging-custom-controls)

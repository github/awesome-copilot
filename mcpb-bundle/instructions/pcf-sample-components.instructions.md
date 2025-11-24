---
description: 'How to use and run PCF sample components from the PowerApps-Samples repository'
applyTo: '**/*.{ts,tsx,js,json,xml,pcfproj,csproj}'
---

# How to Use the Sample Components

All the sample components listed under this section are available to download from [github.com/microsoft/PowerApps-Samples/tree/master/component-framework](https://github.com/microsoft/PowerApps-Samples/tree/master/component-framework) so that you can try them out in your model-driven or canvas apps.

The individual sample component topics under this section provide you an overview of the sample component, its visual appearance, and a link to the complete sample component.

## Before You Can Try the Sample Components

To try the sample components, you must first:

- [Download](https://docs.github.com/repositories/working-with-files/using-files/downloading-source-code-archives#downloading-source-code-archives-from-the-repository-view) or [clone](https://docs.github.com/repositories/creating-and-managing-repositories/cloning-a-repository) this repository [github.com/microsoft/PowerApps-Samples](https://github.com/microsoft/PowerApps-Samples).
- Install [Install Power Platform CLI for Windows](https://learn.microsoft.com/en-us/power-platform/developer/cli/introduction#install-power-platform-cli-for-windows).

## Try the Sample Components

Follow the steps in the [README.md](https://github.com/microsoft/PowerApps-Samples/blob/master/component-framework/README.md) to generate solutions containing the controls so you can import and try the sample components in your model-driven or canvas app.

## How to Run the Sample Components

Use the following steps to import and try the sample components in your model-driven or canvas app.

### Step-by-Step Process

1. **Download or clone the repository**
   - [Download](https://docs.github.com/repositories/working-with-files/using-files/downloading-source-code-archives#downloading-source-code-archives-from-the-repository-view) or [clone](https://docs.github.com/repositories/creating-and-managing-repositories/cloning-a-repository) [github.com/microsoft/PowerApps-Samples](https://github.com/microsoft/PowerApps-Samples).

2. **Open Developer Command Prompt**
   - Open a [Developer Command Prompt for Visual Studio](https://learn.microsoft.com/visualstudio/ide/reference/command-prompt-powershell) and navigate to the `component-framework` folder.
   - On Windows, you can type `developer command prompt` in Start to open a developer command prompt.

3. **Install dependencies**
   - Navigate to the component you want to try, for example `IncrementControl`, and run:
   ```bash
   npm install
   ```

4. **Restore project**
   - After the command has completed, run:
   ```bash
   msbuild /t:restore
   ```

5. **Create solution folder**
   - Create a new folder inside the sample component folder:
   ```bash
   mkdir IncrementControlSolution
   ```

6. **Navigate to solution folder**
   ```bash
   cd IncrementControlSolution
   ```

7. **Initialize solution**
   - Inside the folder you created, run the `pac solution init` command:
   ```bash
   pac solution init --publisher-name powerapps_samples --publisher-prefix sample
   ```
   > **Note**: This command creates a new file named `IncrementControlSolution.cdsproj` in the folder.

8. **Add component reference**
   - Run the `pac solution add-reference` command with the `path` set to the location of the `.pcfproj` file:
   ```bash
   pac solution add-reference --path ../../IncrementControl
   ```
   or
   ```bash
   pac solution add-reference --path ../../IncrementControl/IncrementControl.pcfproj
   ```
   > **Important**: Reference the folder that contains the `.pcfproj` file for the control you want to add.

9. **Build the solution**
   - To generate a zip file from your solution project, run the following three commands:
   ```bash
   msbuild /t:restore
   msbuild /t:rebuild /restore /p:Configuration=Release
   msbuild
   ```
   - The generated solution zip file becomes in the `IncrementControlSolution\bin\debug` folder.

10. **Import the solution**
    - Now that you have the zip file, you have two options:
      - Manually [import the solution](https://learn.microsoft.com/powerapps/maker/data-platform/import-update-export-solutions) into your environment using [make.powerapps.com](https://make.powerapps.com/).
      - Alternatively, to import the solution using Power Apps CLI commands, see the [Connecting to your environment](https://learn.microsoft.com/powerapps/developer/component-framework/import-custom-controls#connecting-to-your-environment) and [Deployment](https://learn.microsoft.com/powerapps/developer/component-framework/import-custom-controls#deploying-code-components) sections.

11. **Add components to apps**
    - Finally, to add code components to your model-driven and canvas apps, see:
      - [Add components to model-driven apps](https://learn.microsoft.com/powerapps/developer/component-framework/add-custom-controls-to-a-field-or-entity)
      - [Add components to canvas apps](https://learn.microsoft.com/powerapps/developer/component-framework/component-framework-for-canvas-apps#add-components-to-a-canvas-app)

## Available Sample Components

The repository contains numerous sample components including:

- AngularJSFlipControl
- CanvasGridControl
- ChoicesPickerControl
- ChoicesPickerReactControl
- CodeInterpreterControl
- ControlStateAPI
- DataSetGrid
- DeviceApiControl
- FacepileReactControl
- FluentThemingAPIControl
- FormattingAPIControl
- IFrameControl
- ImageUploadControl
- IncrementControl
- LinearInputControl
- LocalizationAPIControl
- LookupSimpleControl
- MapControl
- ModelDrivenGridControl
- MultiSelectOptionSetControl
- NavigationAPIControl
- ObjectOutputControl
- PowerAppsGridCustomizerControl
- PropertySetTableControl
- ReactStandardControl
- TableControl
- TableGrid
- WebAPIControl

Each sample demonstrates different aspects of the Power Apps component framework and can serve as a learning resource or starting point for your own components.

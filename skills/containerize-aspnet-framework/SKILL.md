---
name: containerize-aspnet-framework
description: 'Containerize an ASP.NET .NET Framework project by creating Dockerfile and .dockerfile files customized for the project.'
---

# ASP.NET .NET Framework Containerization Prompt

Containerize the ASP.NET (.NET Framework) project specified in the containerization settings below, focusing **exclusively** on changes required for the application to run in a Windows Docker container. Containerization should consider all settings specified here.

**REMEMBER:** This is a .NET Framework application, not .NET Core. The containerization process will be different from that of a .NET Core application.

## Containerization Settings

This section of the prompt contains the specific settings and configurations required for containerizing the ASP.NET (.NET Framework) application. Prior to running this prompt, ensure that the settings are filled out with the necessary information. Note that in many cases, only the first few settings are required. Later settings can be left as defaults if they do not apply to the project being containerized.

Any settings that are not specified will be set to default values. The default values are provided in `[square brackets]`.

### Basic Project Information
1. Project to containerize: 
   - `[ProjectName (provide path to .csproj file)]`

2. Windows Server SKU to use:
   - `[Windows Server Core (Default) or Windows Server Full]`

3. Windows Server version to use:
   - `[2022, 2019, or 2016 (Default 2022)]`

4. Custom base image for the build stage of the Docker image ("None" to use standard Microsoft base image):
   - `[Specify base image to use for build stage (Default None)]`

5. Custom base image for the run stage of the Docker image ("None" to use standard Microsoft base image):
   - `[Specify base image to use for run stage (Default None)]`   

### Container Configuration
1. Ports that must be exposed in the container image:
   - Primary HTTP port: `[e.g., 80]`
   - Additional ports: `[List any additional ports, or "None"]`

2. User account the container should run as:
   - `[User account, or default to "ContainerUser"]`

3. IIS settings that must be configured in the container image:
   - `[List any specific IIS settings, or "None"]`

### Build configuration
1. Custom build steps that must be performed before building the container image:
   - `[List any specific build steps, or "None"]`

2. Custom build steps that must be performed after building the container image:
   - `[List any specific build steps, or "None"]`

### Dependencies
1. .NET assemblies that should be registered in the GAC in the container image:
   - `[Assembly name and version, or "None"]`

2. MSIs that must be copied to the container image and installed:
   - `[MSI names and versions, or "None"]`

3. COM components that must be registered in the container image:
   - `[COM component names, or "None"]`

### System Configuration
1. Registry keys and values that must be added to the container image:
   - `[Registry paths and values, or "None"]`

2. Environment variables that must be set in the container image:
   - `[Variable names and values, or "Use defaults"]`

3. Windows Server roles and features that must be installed in the container image:
   - `[Role/feature names, or "None"]`

### File System
1. Files/directories that need to be copied to the container image:
   - `[Paths relative to project root, or "None"]`
   - Target location in container: `[Container paths, or "Not applicable"]`

2. Files/directories to exclude from containerization:
   - `[Paths to exclude, or "None"]`

### .dockerignore Configuration
1. Patterns to include in the `.dockerignore` file (.dockerignore will already have common defaults; these are additional patterns):
   - Additional patterns: `[List any additional patterns, or "None"]`

### Health Check Configuration
1. Health check endpoint:
   - `[Health check URL path, or "None"]`

2. Health check interval and timeout:
   - `[Interval and timeout values, or "Use defaults"]`

### Additional Instructions
1. Other instructions that must be followed to containerize the project:
   - `[Specific requirements, or "None"]`

2. Known issues to address:
   - `[Describe any known issues, or "None"]`

## Scope

- ✅ App configuration modification to ensure config builders are used to read app settings and connection strings from the environment variables
- ✅ Dockerfile creation and configuration for an ASP.NET application
- ✅ Specifying multiple stages in the Dockerfile to build/publish the application and copy the output to the final image
- ✅ Configuration of Windows container platform compatibility (Windows Server Core or Full)
- ✅ Proper handling of dependencies (GAC assemblies, MSIs, COM components)
- ❌ No infrastructure setup (assumed to be handled separately)
- ❌ No code changes beyond those required for containerization

## Execution Process

1. Review the containerization settings above to understand the containerization requirements
2. Create a `progress.md` file to track changes with check marks
3. Determine the .NET Framework version from the project's .csproj file by checking the `TargetFrameworkVersion` element
4. Select the appropriate Windows Server container image based on:
   - The .NET Framework version detected from the project
   - The Windows Server SKU specified in containerization settings (Core or Full)
   - The Windows Server version specified in containerization settings (2016, 2019, or 2022)
   - Windows Server Core tags can be found at: https://github.com/microsoft/dotnet-framework-docker/blob/main/README.aspnet.md#full-tag-listing
5. Ensure that required NuGet packages are installed. **DO NOT** install these if they are missing. If they are not installed, the user must install them manually. If they are not installed, pause executing this prompt and ask the user to install them using the Visual Studio NuGet Package Manager or Visual Studio package manager console. The following packages are required:
   - `Microsoft.Configuration.ConfigurationBuilders.Environment`
6. Modify the `web.config` file to add configuration builders section and settings to read app settings and connection strings from environment variables:
   - Add ConfigBuilders section in configSections
   - Add configBuilders section in the root
   - Configure EnvironmentConfigBuilder for both appSettings and connectionStrings
   - Example pattern:
     ```xml
     <configSections>
       <section name="configBuilders" type="System.Configuration.ConfigurationBuildersSection, System.Configuration, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a" restartOnExternalChanges="false" requirePermission="false" />
     </configSections>
     <configBuilders>
       <builders>
         <add name="Environment" type="Microsoft.Configuration.ConfigurationBuilders.EnvironmentConfigBuilder, Microsoft.Configuration.ConfigurationBuilders.Environment" />
       </builders>
     </configBuilders>
     <appSettings configBuilders="Environment">
       <!-- existing app settings -->
     </appSettings>
     <connectionStrings configBuilders="Environment">
       <!-- existing connection strings -->
     </connectionStrings>
     ```
7. Create a `LogMonitorConfig.json` file in the folder where the Dockerfile will be created by copying the reference `LogMonitorConfig.json` file at the end of this prompt. The file's contents **MUST NOT** not be modified and should match the reference content exactly unless instructions in containerization settings specify otherwise.
   - In particular, make sure the level of issues to be logged is not changed as using `Information` level for EventLog sources will cause unnecessary noise.
8. Create a Dockerfile in the root of the project directory to containerize the application
   - The Dockerfile should use multiple stages:
     - Build stage: Use a Windows Server Core image to build the application
       - The build stage MUST use a `mcr.microsoft.com/dotnet/framework/sdk` base image unless a custom base image is specified in the settings file
       - Copy sln, csproj, and packages.config files first
       - Copy NuGet.config if one exists and configure any private feeds
       - Restore NuGet packages       
       - Then, copy the rest of the source code and build and publish the application to C:\publish using MSBuild
     - Final stage: Use the selected Windows Server image to run the application
       - The final stage MUST use a `mcr.microsoft.com/dotnet/framework/aspnet` base image unless a custom base image is specified in the settings file
       - Copy the `LogMonitorConfig.json` file to a directory in the container (e.g., C:\LogMonitor)
       - Download LogMonitor.exe from the Microsoft repository to the same directory
           - The correct LogMonitor.exe URL is: https://github.com/microsoft/windows-container-tools/releases/download/v2.1.1/LogMonitor.exe
       - Set the working directory to C:\inetpub\wwwroot
       - Copy the published output from the build stage (in C:\publish) to the final image
       - Set the container's entry point to run LogMonitor.exe with ServiceMonitor.exe to monitor the IIS service
           - `ENTRYPOINT [ "C:\\LogMonitor\\LogMonitor.exe", "C:\\ServiceMonitor.exe", "w3svc" ]`
   - Be sure to consider all requirements in the containerization settings:
     - Windows Server SKU and version
     - Exposed ports
     - User account for container
     - IIS settings
     - GAC assembly registration
     - MSI installation
     - COM component registration
     - Registry keys
     - Environment variables
     - Windows roles and features
     - File/directory copying
   - Model the Dockerfile after the example provided at the end of this prompt, but ensure it is customized to the specific project requirements and settings.
   - **IMPORTANT:** Use a Windows Server Core base image unless the user has **specifically requested** a full Windows Server image in the settings file
9. Create a `.dockerignore` file in the root of the project directory to exclude unnecessary files from the Docker image. The `.dockerignore` file **MUST** include at least the following elements as well as additional patterns as specified in the containerization settings:
   - packages/
   - bin/
   - obj/
   - .dockerignore
   - Dockerfile
   - .git/
   - .github/
   - .vs/
   - .vscode/
   - **/node_modules/
   - *.user
   - *.suo
   - **/.DS_Store
   - **/Thumbs.db
   - Any additional patterns specified in the containerization settings
10. Configure health checks if specified in the settings:
   - Add HEALTHCHECK instruction to Dockerfile if health check endpoint is provided
11. Add the dockerfile to the project by adding the following item to the project file: `<None Include="Dockerfile" />`
12. Mark tasks as completed: [ ] → [✓]
13. Continue until all tasks are complete and Docker build succeeds

## Build and Runtime Verification

confirm that Docker build succeeds once the Dockerfile is completed. Use the following command to build the Docker image:

```bash
docker build -t aspnet-app:latest .
```

If the build fails, review the error messages and make necessary adjustments to the Dockerfile or project configuration. Report success/failure.

## Progress Tracking

Maintain a `progress.md` file with the following structure:
```markdown
# Containerization Progress

## Environment Detection
- [ ] .NET Framework version detection (version: ___)
- [ ] Windows Server SKU selection (SKU: ___)
- [ ] Windows Server version selection (Version: ___)

## Configuration Changes
- [ ] Web.config modifications for configuration builders
- [ ] NuGet package source configuration (if applicable)
- [ ] Copy LogMonitorConfig.json and adjust if required by settings

## Containerization
- [ ] Dockerfile creation
- [ ] .dockerignore file creation
- [ ] Build stage created with SDK image
- [ ] sln, csproj, packages.config, and (if applicable) NuGet.config copied for package restore
- [ ] Runtime stage created with runtime image
- [ ] Non-root user configuration
- [ ] Dependency handling (GAC, MSI, COM, registry, additional files, etc.)
- [ ] Health check configuration (if applicable)
- [ ] Special requirements implementation

## Verification
- [ ] Review containerization settings and make sure that all requirements are met
- [ ] Docker build success
```

Do not pause for confirmation between steps. Continue methodically until the application has been containerized and Docker build succeeds.

**YOU ARE NOT DONE UNTIL ALL CHECKBOXES ARE MARKED!** This includes building the Docker image successfully and addressing any issues that arise during the build process.

## Reference Materials

### Example Dockerfile

An example Dockerfile for an ASP.NET (.NET Framework) application using a Windows Server Core base image.

```dockerfile
# escape=`
# The escape directive changes the escape character from \ to `
# This is especially useful in Windows Dockerfiles where \ is the path separator

# ============================================================
# Stage 1: Build and publish the application
# ============================================================

# Base Image - Select the appropriate .NET Framework version and Windows Server Core version
# Possible tags include:
# - 4.8.1-windowsservercore-ltsc2025 (Windows Server 2025)
# - 4.8-windowsservercore-ltsc2022 (Windows Server 2022)
# - 4.8-windowsservercore-ltsc2019 (Windows Server 2019)
# - 4.8-windowsservercore-ltsc2016 (Windows Server 2016)
# - 4.7.2-windowsservercore-ltsc2019 (Windows Server 2019)
# - 4.7.2-windowsservercore-ltsc2016 (Windows Server 2016)
# - 4.7.1-windowsservercore-ltsc2016 (Windows Server 2016)
# - 4.7-windowsservercore-ltsc2016 (Windows Server 2016)
# - 4.6.2-windowsservercore-ltsc2016 (Windows Server 2016)
# - 3.5-windowsservercore-ltsc2025 (Windows Server 2025)
# - 3.5-windowsservercore-ltsc2022 (Windows Server 2022)
# - 3.5-windowsservercore-ltsc2019 (Windows Server 2019)
# - 3.5-windowsservercore-ltsc2019 (Windows Server 2016)
# Uses the .NET Framework SDK image for building the application
FROM mcr.microsoft.com/dotnet/framework/sdk:4.8-windowsservercore-ltsc2022 AS build
ARG BUILD_CONFIGURATION=Release

# Set the default shell to PowerShell
SHELL ["powershell", "-command"]

WORKDIR /app

# Copy the solution and project files
COPY YourSolution.sln .
COPY YourProject/*.csproj ./YourProject/
COPY YourOtherProject/*.csproj ./YourOtherProject/

# Copy packages.config files
COPY YourProject/packages.config ./YourProject/
COPY YourOtherProject/packages.config ./YourOtherProject/

# Restore NuGet packages
RUN nuget restore YourSolution.sln

# Copy source code
COPY . .

# Perform custom pre-build steps here, if needed

# Build and publish the application to C:\publish
RUN msbuild /p:Configuration=$BUILD_CONFIGURATION `
            /p:WebPublishMethod=FileSystem `
            /p:PublishUrl=C:\publish `
            /p:DeployDefaultTarget=WebPublish

# Perform custom post-build steps here, if needed

# ============================================================
# Stage 2: Final runtime image
# ============================================================

# Base Image - Select the appropriate .NET Framework version and Windows Server Core version
# Possible tags include:
# - 4.8.1-windowsservercore-ltsc2025 (Windows Server 2025)
# - 4.8-windowsservercore-ltsc2022 (Windows Server 2022)
# - 4.8-windowsservercore-ltsc2019 (Windows Server 2019)
# - 4.8-windowsservercore-ltsc2016 (Windows Server 2016)
# - 4.7.2-windowsservercore-ltsc2019 (Windows Server 2019)
# - 4.7.2-windowsservercore-ltsc2016 (Windows Server 2016)
# - 4.7.1-windowsservercore-ltsc2016 (Windows Server 2016)
# - 4.7-windowsservercore-ltsc2016 (Windows Server 2016)
# - 4.6.2-windowsservercore-ltsc2016 (Windows Server 2016)
# - 3.5-windowsservercore-ltsc2025 (Windows Server 2025)
# - 3.5-windowsservercore-ltsc2022 (Windows Server 2022)
# - 3.5-windowsservercore-ltsc2019 (Windows Server 2019)
# - 3.5-windowsservercore-ltsc2019 (Windows Server 2016)
# Uses the .NET Framework ASP.NET image for running the application
FROM mcr.microsoft.com/dotnet/framework/aspnet:4.8-windowsservercore-ltsc2022

# Set the default shell to PowerShell
SHELL ["powershell", "-command"]

WORKDIR /inetpub/wwwroot

# Copy from build stage
COPY --from=build /publish .

# Add any additional environment variables needed for your application (uncomment and modify as needed)
# ENV KEY=VALUE

# Install MSI packages (uncomment and modify as needed)
# COPY ./msi-installers C:/Installers
# RUN Start-Process -Wait -FilePath 'msiexec.exe' -ArgumentList '/i', 'C:\Installers\your-package.msi', '/quiet', '/norestart'

# Install custom Windows Server roles and features (uncomment and modify as needed)
# RUN dism /Online /Enable-Feature /FeatureName:YOUR-FEATURE-NAME

# Add additional Windows features (uncomment and modify as needed)
# RUN Add-WindowsFeature Some-Windows-Feature; `
#    Add-WindowsFeature Another-Windows-Feature

# Install MSI packages if needed (uncomment and modify as needed)
# COPY ./msi-installers C:/Installers
# RUN Start-Process -Wait -FilePath 'msiexec.exe' -ArgumentList '/i', 'C:\Installers\your-package.msi', '/quiet', '/norestart'

# Register assemblies in GAC if needed (uncomment and modify as needed)
# COPY ./assemblies C:/Assemblies
# RUN C:\Windows\Microsoft.NET\Framework64\v4.0.30319\gacutil -i C:/Assemblies/YourAssembly.dll

# Register COM components if needed (uncomment and modify as needed)
# COPY ./com-components C:/Components
# RUN regsvr32 /s C:/Components/YourComponent.dll

# Add registry keys if needed (uncomment and modify as needed)
# RUN New-Item -Path 'HKLM:\Software\YourApp' -Force; `
#     Set-ItemProperty -Path 'HKLM:\Software\YourApp' -Name 'Setting' -Value 'Value'

# Configure IIS settings if needed (uncomment and modify as needed)
# RUN Import-Module WebAdministration; `
#     Set-ItemProperty 'IIS:\AppPools\DefaultAppPool' -Name somePropertyName -Value 'SomePropertyValue'; `
#     Set-ItemProperty 'IIS:\Sites\Default Web Site' -Name anotherPropertyName -Value 'AnotherPropertyValue'

# Expose necessary ports - By default, IIS uses port 80
EXPOSE 80
# EXPOSE 443  # Uncomment if using HTTPS

# Copy LogMonitor from the microsoft/windows-container-tools repository
WORKDIR /LogMonitor
RUN curl -fSLo LogMonitor.exe https://github.com/microsoft/windows-container-tools/releases/download/v2.1.1/LogMonitor.exe

# Copy LogMonitorConfig.json from local files
COPY LogMonitorConfig.json .

# Set non-administrator user
USER ContainerUser

# Override the container's default entry point to take advantage of the LogMonitor
ENTRYPOINT [ "C:\\LogMonitor\\LogMonitor.exe", "C:\\ServiceMonitor.exe", "w3svc" ]
```

## Adapting this Example

**Note:** Customize this template based on the specific requirements in the containerization settings. 

When adapting this example Dockerfile:

1. Replace `YourSolution.sln`, `YourProject.csproj`, etc. with your actual file names
2. Adjust the Windows Server and .NET Framework versions as needed
3. Modify the dependency installation steps based on your requirements and remove any unnecessary ones
4. Add or remove stages as needed for your specific workflow

## Notes on Stage Naming

- The `AS stage-name` syntax gives each stage a name
- Use `--from=stage-name` to copy files from a previous stage
- You can have multiple intermediate stages that aren't used in the final image

### LogMonitorConfig.json

The LogMonitorConfig.json file should be created in the root of the project directory. It is used to configure the LogMonitor tool, which monitors logs in the container. The contents of this file should look exactly like this to ensure proper logging functionality:
```json
{
  "LogConfig": {
    "sources": [
      {
        "type": "EventLog",
        "startAtOldestRecord": true,
        "eventFormatMultiLine": false,
        "channels": [
          {
            "name": "system",
            "level": "Warning"
          },
          {
            "name": "application",
            "level": "Error"
          }
        ]
      },
      {
        "type": "File",
        "directory": "c:\\inetpub\\logs",
        "filter": "*.log",
        "includeSubdirectories": true,
        "includeFileNames": false
      },
      {
        "type": "ETW",
        "eventFormatMultiLine": false,
        "providers": [
          {
            "providerName": "IIS: WWW Server",
            "providerGuid": "3A2A4E84-4C21-4981-AE10-3FDA0D9B0F83",
            "level": "Information"
          },
          {
            "providerName": "Microsoft-Windows-IIS-Logging",
            "providerGuid": "7E8AD27F-B271-4EA2-A783-A47BDE29143B",
            "level": "Information"
          }
        ]
      }
    ]
  }
}
```

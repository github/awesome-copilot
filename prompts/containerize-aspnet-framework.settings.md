# Containerization Setting

Any settings that are not specified will be set to default values. The default values are provided in `[square brackets]`. Please review and update the settings as needed.

## Basic Project Information
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

## Container Configuration
1. Ports that must be exposed in the container image:
   - Primary HTTP port: `[e.g., 80]`
   - Additional ports: `[List any additional ports, or "None"]`

2. User account the container should run as:
   - `[User account, or default to "ContainerUser"]`

3. IIS settings that must be configured in the container image:
   - `[List any specific IIS settings, or "None"]`

## Build configuration
1. Custom build steps that must be performed before building the container image:
   - `[List any specific build steps, or "None"]`

2. Custom build steps that must be performed after building the container image:
   - `[List any specific build steps, or "None"]`

## Dependencies
1. .NET assemblies that should be registered in the GAC in the container image:
   - `[Assembly name and version, or "None"]`

2. MSIs that must be copied to the container image and installed:
   - `[MSI names and versions, or "None"]`

3. COM components that must be registered in the container image:
   - `[COM component names, or "None"]`

## System Configuration
1. Registry keys and values that must be added to the container image:
   - `[Registry paths and values, or "None"]`

2. Environment variables that must be set in the container image:
   - `[Variable names and values, or "Use defaults"]`

3. Windows Server roles and features that must be installed in the container image:
   - `[Role/feature names, or "None"]`

## File System
1. Files/directories that need to be copied to the container image:
   - `[Paths relative to project root, or "None"]`
   - Target location in container: `[Container paths, or "Not applicable"]`

2. Files/directories to exclude from containerization:
   - `[Paths to exclude, or "None"]`

## .dockerignore Configuration
1. Patterns to include in the `.dockerignore` file (.dockerignore will already have common defaults; these are additional patterns):
   - Additional patterns: `[List any additional patterns, or "None"]`

## Health Check Configuration
1. Health check endpoint:
   - `[Health check URL path, or "None"]`

2. Health check interval and timeout:
   - `[Interval and timeout values, or "Use defaults"]`

## Additional Instructions
1. Other instructions that must be followed to containerize the project:
   - `[Specific requirements, or "None"]`

2. Known issues to address:
   - `[Describe any known issues, or "None"]`

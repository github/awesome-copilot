# Containerization Setting

This settings file is referenced from the prompt [`containerize-aspnetcore.prompt.md`](containerize-aspnetcore.prompt.md) and is used to configure the containerization of an ASP.NET Core application. It provides a structured way to specify settings required for building the Docker image.

Users should fill in the placeholders in this file prior to running the containerization prompt. Note that in many cases, only the first few settings are required. Later settings can be left as defaults if they do not apply to the project being containerized.

Any settings that are not specified will be set to default values. The default values are provided in `[square brackets]`.

## Basic Project Information
1. Project to containerize: 
   - `[ProjectName (provide path to .csproj file)]`

2. .NET version to use:
   - `[8.0 or 9.0 (Default 8.0)]`

3. Linux distribution to use:
   - `[debian, alpine, ubuntu, chiseled, or Azure Linux (mariner) (Default debian)]`

4. Custom base image for the build stage of the Docker image ("None" to use standard Microsoft base image):
   - `[Specify base image to use for build stage (Default None)]`

5. Custom base image for the run stage of the Docker image ("None" to use standard Microsoft base image):
   - `[Specify base image to use for run stage (Default None)]`   

## Container Configuration
1. Ports that must be exposed in the container image:
   - Primary HTTP port: `[e.g., 8080]`
   - Additional ports: `[List any additional ports, or "None"]`

2. User account the container should run as:
   - `[User account, or default to "$APP_UID"]`

3. Application URL configuration:
   - `[Specify ASPNETCORE_URLS, or default to "http://+:8080"]`

## Build configuration
1. Custom build steps that must be performed before building the container image:
   - `[List any specific build steps, or "None"]`

2. Custom build steps that must be performed after building the container image:
   - `[List any specific build steps, or "None"]`

3. NuGet package sources that must be configured:
   - `[List any private NuGet feeds with authentication details, or "None"]`

## Dependencies
1. System packages that must be installed in the container image:
   - `[Package names for the chosen Linux distribution, or "None"]`

2. Native libraries that must be copied to the container image:
   - `[Library names and paths, or "None"]`

3. Additional .NET tools that must be installed:
   - `[Tool names and versions, or "None"]`

## System Configuration
1. Environment variables that must be set in the container image:
   - `[Variable names and values, or "Use defaults"]`

## File System
1. Files/directories that need to be copied to the container image:
   - `[Paths relative to project root, or "None"]`
   - Target location in container: `[Container paths, or "Not applicable"]`

2. Files/directories to exclude from containerization:
   - `[Paths to exclude, or "None"]`

3. Volume mount points that should be configured:
   - `[Volume paths for persistent data, or "None"]`

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

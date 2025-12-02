---
agent: 'agent'
tools: ['search/codebase', 'edit/editFiles', 'terminalCommand']
description: 'Containerize an ASP.NET Core project by creating Dockerfile and .dockerfile files customized for the project.'
---

# ASP.NET Core Docker Containerization Prompt

## Containerization Request

Containerize the ASP.NET Core (.NET) project specified in the settings below, focusing **exclusively** on changes required for the application to run in a Linux Docker container. Containerization should consider all settings specified here.

Abide by best practices for containerizing .NET Core applications, ensuring that the container is optimized for performance, security, and maintainability.

## Containerization Settings

This section of the prompt contains the specific settings and configurations required for containerizing the ASP.NET Core application. Prior to running this prompt, ensure that the settings are filled out with the necessary information. Note that in many cases, only the first few settings are required. Later settings can be left as defaults if they do not apply to the project being containerized.

Any settings that are not specified will be set to default values. The default values are provided in `[square brackets]`.

### Basic Project Information
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

### Container Configuration
1. Ports that must be exposed in the container image:
   - Primary HTTP port: `[e.g., 8080]`
   - Additional ports: `[List any additional ports, or "None"]`

2. User account the container should run as:
   - `[User account, or default to "$APP_UID"]`

3. Application URL configuration:
   - `[Specify ASPNETCORE_URLS, or default to "http://+:8080"]`

### Build configuration
1. Custom build steps that must be performed before building the container image:
   - `[List any specific build steps, or "None"]`

2. Custom build steps that must be performed after building the container image:
   - `[List any specific build steps, or "None"]`

3. NuGet package sources that must be configured:
   - `[List any private NuGet feeds with authentication details, or "None"]`

### Dependencies
1. System packages that must be installed in the container image:
   - `[Package names for the chosen Linux distribution, or "None"]`

2. Native libraries that must be copied to the container image:
   - `[Library names and paths, or "None"]`

3. Additional .NET tools that must be installed:
   - `[Tool names and versions, or "None"]`

### System Configuration
1. Environment variables that must be set in the container image:
   - `[Variable names and values, or "Use defaults"]`

### File System
1. Files/directories that need to be copied to the container image:
   - `[Paths relative to project root, or "None"]`
   - Target location in container: `[Container paths, or "Not applicable"]`

2. Files/directories to exclude from containerization:
   - `[Paths to exclude, or "None"]`

3. Volume mount points that should be configured:
   - `[Volume paths for persistent data, or "None"]`

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

- ✅ App configuration modification to ensure application settings and connection strings can be read from environment variables
- ✅ Dockerfile creation and configuration for an ASP.NET Core application
- ✅ Specifying multiple stages in the Dockerfile to build/publish the application and copy the output to the final image
- ✅ Configuration of Linux container platform compatibility (Alpine, Ubuntu, Chiseled, or Azure Linux (Mariner))
- ✅ Proper handling of dependencies (system packages, native libraries, additional tools)
- ❌ No infrastructure setup (assumed to be handled separately)
- ❌ No code changes beyond those required for containerization

## Execution Process

1. Review the containerization settings above to understand the containerization requirements
2. Create a `progress.md` file to track changes with check marks
3. Determine the .NET version from the project's .csproj file by checking the `TargetFramework` element
4. Select the appropriate Linux container image based on:
   - The .NET version detected from the project
   - The Linux distribution specified in containerization settings (Alpine, Ubuntu, Chiseled, or Azure Linux (Mariner))
   - If the user does not request specific base images in the containerization settings, then the base images MUST be valid mcr.microsoft.com/dotnet images with a tag as shown in the example Dockerfile, below, or in documentation
   - Official Microsoft .NET images for build and runtime stages:
      - SDK image tags (for build stage): https://github.com/dotnet/dotnet-docker/blob/main/README.sdk.md
      - ASP.NET Core runtime image tags: https://github.com/dotnet/dotnet-docker/blob/main/README.aspnet.md
      - .NET runtime image tags: https://github.com/dotnet/dotnet-docker/blob/main/README.runtime.md
5. Create a Dockerfile in the root of the project directory to containerize the application
   - The Dockerfile should use multiple stages:
     - Build stage: Use a .NET SDK image to build the application
       - Copy csproj file(s) first
       - Copy NuGet.config if one exists and configure any private feeds
       - Restore NuGet packages
       - Then, copy the rest of the source code and build and publish the application to /app/publish
     - Final stage: Use the selected .NET runtime image to run the application
       - Set the working directory to /app
       - Set the user as directed (by default, to a non-root user (e.g., `$APP_UID`))
         - Unless directed otherwise in containerization settings, a new user does *not* need to be created. Use the `$APP_UID` variable to specify the user account.
       - Copy the published output from the build stage to the final image
   - Be sure to consider all requirements in the containerization settings:
     - .NET version and Linux distribution
     - Exposed ports
     - User account for container
     - ASPNETCORE_URLS configuration
     - System package installation
     - Native library dependencies
     - Additional .NET tools
     - Environment variables
     - File/directory copying
     - Volume mount points
     - Health check configuration
6. Create a `.dockerignore` file in the root of the project directory to exclude unnecessary files from the Docker image. The `.dockerignore` file **MUST** include at least the following elements as well as additional patterns as specified in the containerization settings:
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
7. Configure health checks if specified in the containerization settings:
   - Add HEALTHCHECK instruction to Dockerfile if health check endpoint is provided
   - Use curl or wget to check the health endpoint
8. Mark tasks as completed: [ ] → [✓]
9. Continue until all tasks are complete and Docker build succeeds

## Build and Runtime Verification

Confirm that Docker build succeeds once the Dockerfile is completed. Use the following command to build the Docker image:

```bash
docker build -t aspnetcore-app:latest .
```

If the build fails, review the error messages and make necessary adjustments to the Dockerfile or project configuration. Report success/failure.

## Progress Tracking

Maintain a `progress.md` file with the following structure:
```markdown
# Containerization Progress

## Environment Detection
- [ ] .NET version detection (version: ___)
- [ ] Linux distribution selection (distribution: ___)

## Configuration Changes
- [ ] Application configuration verification for environment variable support
- [ ] NuGet package source configuration (if applicable)

## Containerization
- [ ] Dockerfile creation
- [ ] .dockerignore file creation
- [ ] Build stage created with SDK image
- [ ] csproj file(s) copied for package restore
- [ ] NuGet.config copied if applicable
- [ ] Runtime stage created with runtime image
- [ ] Non-root user configuration
- [ ] Dependency handling (system packages, native libraries, tools, etc.)
- [ ] Health check configuration (if applicable)
- [ ] Special requirements implementation

## Verification
- [ ] Review containerization settings and make sure that all requirements are met
- [ ] Docker build success
```

Do not pause for confirmation between steps. Continue methodically until the application has been containerized and Docker build succeeds.

**YOU ARE NOT DONE UNTIL ALL CHECKBOXES ARE MARKED!** This includes building the Docker image successfully and addressing any issues that arise during the build process.

## Example Dockerfile

An example Dockerfile for an ASP.NET Core (.NET) application using a Linux base image.

```dockerfile
# ============================================================
# Stage 1: Build and publish the application
# ============================================================

# Base Image - Select the appropriate .NET SDK version and Linux distribution
# Possible tags include:
# - 8.0-bookworm-slim (Debian 12)
# - 8.0-noble (Ubuntu 24.04)
# - 8.0-alpine (Alpine Linux)
# - 9.0-bookworm-slim (Debian 12)
# - 9.0-noble (Ubuntu 24.04)
# - 9.0-alpine (Alpine Linux)
# Uses the .NET SDK image for building the application
FROM mcr.microsoft.com/dotnet/sdk:8.0-bookworm-slim AS build
ARG BUILD_CONFIGURATION=Release

WORKDIR /src

# Copy project files first for better caching
COPY ["YourProject/YourProject.csproj", "YourProject/"]
COPY ["YourOtherProject/YourOtherProject.csproj", "YourOtherProject/"]

# Copy NuGet configuration if it exists
COPY ["NuGet.config", "."]

# Restore NuGet packages
RUN dotnet restore "YourProject/YourProject.csproj"

# Copy source code
COPY . .

# Perform custom pre-build steps here, if needed
# RUN echo "Running pre-build steps..."

# Build and publish the application
WORKDIR "/src/YourProject"
RUN dotnet build "YourProject.csproj" -c $BUILD_CONFIGURATION -o /app/build

# Publish the application
RUN dotnet publish "YourProject.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

# Perform custom post-build steps here, if needed
# RUN echo "Running post-build steps..."

# ============================================================
# Stage 2: Final runtime image
# ============================================================

# Base Image - Select the appropriate .NET runtime version and Linux distribution
# Possible tags include:
# - 8.0-bookworm-slim (Debian 12)
# - 8.0-noble (Ubuntu 24.04)
# - 8.0-alpine (Alpine Linux)
# - 8.0-noble-chiseled (Ubuntu 24.04 Chiseled)
# - 8.0-azurelinux3.0 (Azure Linux)
# - 9.0-bookworm-slim (Debian 12)
# - 9.0-noble (Ubuntu 24.04)
# - 9.0-alpine (Alpine Linux)
# - 9.0-noble-chiseled (Ubuntu 24.04 Chiseled)
# - 9.0-azurelinux3.0 (Azure Linux)
# Uses the .NET runtime image for running the application
FROM mcr.microsoft.com/dotnet/aspnet:8.0-bookworm-slim AS final

# Install system packages if needed (uncomment and modify as needed)
# RUN apt-get update && apt-get install -y \
#     curl \
#     wget \
#     ca-certificates \
#     libgdiplus \
#     && rm -rf /var/lib/apt/lists/*

# Install additional .NET tools if needed (uncomment and modify as needed)
# RUN dotnet tool install --global dotnet-ef --version 8.0.0
# ENV PATH="$PATH:/root/.dotnet/tools"

WORKDIR /app

# Copy published application from build stage
COPY --from=build /app/publish .

# Copy additional files if needed (uncomment and modify as needed)
# COPY ./config/appsettings.Production.json .
# COPY ./certificates/ ./certificates/

# Set environment variables
ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:8080

# Add custom environment variables if needed (uncomment and modify as needed)
# ENV CONNECTIONSTRINGS__DEFAULTCONNECTION="your-connection-string"
# ENV FEATURE_FLAG_ENABLED=true

# Configure SSL/TLS certificates if needed (uncomment and modify as needed)
# ENV ASPNETCORE_Kestrel__Certificates__Default__Path=/app/certificates/app.pfx
# ENV ASPNETCORE_Kestrel__Certificates__Default__Password=your_password

# Expose the port the application listens on
EXPOSE 8080
# EXPOSE 8081  # Uncomment if using HTTPS

# Install curl for health checks if not already present
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Configure health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Create volumes for persistent data if needed (uncomment and modify as needed)
# VOLUME ["/app/data", "/app/logs"]

# Switch to non-root user for security
USER $APP_UID

# Set the entry point for the application
ENTRYPOINT ["dotnet", "YourProject.dll"]
```

## Adapting this Example

**Note:** Customize this template based on the specific requirements in containerization settings.

When adapting this example Dockerfile:

1. Replace `YourProject.csproj`, `YourProject.dll`, etc. with your actual project names
2. Adjust the .NET version and Linux distribution as needed
3. Modify the dependency installation steps based on your requirements and remove any unnecessary ones
4. Configure environment variables specific to your application
5. Add or remove stages as needed for your specific workflow
6. Update the health check endpoint to match your application's health check route

## Linux Distribution Variations

### Alpine Linux
For smaller image sizes, you can use Alpine Linux:

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build
# ... build steps ...

FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS final
# Install packages using apk
RUN apk update && apk add --no-cache curl ca-certificates
```

### Ubuntu Chiseled
For minimal attack surface, consider using chiseled images:

```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:8.0-jammy-chiseled AS final
# Note: Chiseled images have minimal packages, so you may need to use a different base for additional dependencies
```

### Azure Linux (Mariner)
For Azure-optimized containers:

```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:8.0-azurelinux3.0 AS final
# Install packages using tdnf
RUN tdnf update -y && tdnf install -y curl ca-certificates && tdnf clean all
```

## Notes on Stage Naming

- The `AS stage-name` syntax gives each stage a name
- Use `--from=stage-name` to copy files from a previous stage
- You can have multiple intermediate stages that aren't used in the final image
- The `final` stage is the one that becomes the final container image

## Security Best Practices

- Always run as a non-root user in production
- Use specific image tags instead of `latest`
- Minimize the number of installed packages
- Keep base images updated
- Use multi-stage builds to exclude build dependencies from the final image

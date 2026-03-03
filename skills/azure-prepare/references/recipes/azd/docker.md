# Dockerfile Generation

Create Dockerfiles for containerized services.

## When to Containerize

| Include | Exclude |
|---------|---------|
| APIs, microservices | Static websites (use Static Web Apps) |
| Web apps (SSR) | Azure Functions (native deploy) |
| Background workers | Database services |
| Message processors | Logic Apps |

## Templates by Language

### Node.js

```dockerfile
FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
```

### Python

```dockerfile
FROM python:3.13-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### .NET

```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["*.csproj", "./"]
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "App.dll"]
```

### Java

```dockerfile
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY . .
RUN ./mvnw package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### Go

```dockerfile
FROM golang:1.22-alpine AS build
WORKDIR /app
COPY go.* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o main .

FROM alpine:latest
WORKDIR /app
COPY --from=build /app/main .
EXPOSE 8080
CMD ["./main"]
```

## .dockerignore

```
.git
node_modules
__pycache__
*.pyc
.env
.azure
```

## Best Practices

- Use slim/alpine base images
- Multi-stage builds for compiled languages
- Non-root user when possible
- Include health check endpoint in app

## Runtime-Specific Configuration

For production settings specific to each runtime:

| Runtime | Reference |
|---------|-----------| 
| Node.js/Express | [runtimes/nodejs.md](../../runtimes/nodejs.md) |

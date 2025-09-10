# syntax=docker/dockerfile:1

FROM mcr.microsoft.com/dotnet/sdk:10.0-noble-aot AS build
WORKDIR /src

# Copy everything and restore/publish
COPY . .

ARG CONFIG=Release
ARG RUNTIME=linux-x64

RUN dotnet restore src/AwesomeCopilot.McpServer/AwesomeCopilot.McpServer.csproj

# Publish: if PUBLISH_AOT=true, enable Native AOT publish flags
RUN dotnet publish src/AwesomeCopilot.McpServer -c $CONFIG -r $RUNTIME -p:PublishAot=true -p:PublishTrimmed=true -p:TrimMode=link -p:PublishSingleFile=true -o /app/publish;

FROM mcr.microsoft.com/dotnet/runtime-deps:10.0-noble-chiseled AS release
WORKDIR /app
COPY --from=build /app/publish/ .
EXPOSE 8080
ENTRYPOINT ["/app/AwesomeCopilot.McpServer"]

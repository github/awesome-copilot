---
name: appinsights-instrumentation
description: "Guidance for instrumenting webapps with Azure Application Insights. Provides telemetry patterns, SDK setup, and configuration references. USE FOR: how to instrument app, App Insights SDK, telemetry patterns, what is App Insights, Application Insights guidance, instrumentation examples, APM best practices. DO NOT USE FOR: adding App Insights to my app (use azure-prepare), add telemetry to my project (use azure-prepare), add monitoring (use azure-prepare). This skill provides guidance - azure-prepare orchestrates component changes."
license: MIT
metadata:
  author: Microsoft
  version: "1.0.0"
---

# AppInsights Instrumentation Guide

This skill provides **guidance and reference material** for instrumenting webapps with Azure Application Insights.

> **⛔ ADDING COMPONENTS?**
>
> If the user wants to **add App Insights to their app**, invoke **azure-prepare** instead.
> This skill provides reference material—azure-prepare orchestrates the actual changes.

## When to Use This Skill

- User asks **how** to instrument (guidance, patterns, examples)
- User needs SDK setup instructions
- azure-prepare invokes this skill during research phase
- User wants to understand App Insights concepts

## When to Use azure-prepare Instead

- User says "add telemetry to my app"
- User says "add App Insights" 
- User wants to modify their project
- Any request to change/add components

## Prerequisites

The app in the workspace must be one of these kinds

- An ASP.NET Core app hosted in Azure
- A Node.js app hosted in Azure

## Guidelines

### Collect context information

Find out the (programming language, application framework, hosting) tuple of the application the user is trying to add telemetry support in. This determines how the application can be instrumented. Read the source code to make an educated guess. Confirm with the user on anything you don't know. You must always ask the user where the application is hosted (e.g. on a personal computer, in an Azure App Service as code, in an Azure App Service as container, in an Azure Container App, etc.). 

### Prefer auto-instrument if possible

If the app is a C# ASP.NET Core app hosted in Azure App Service, use [AUTO guide](references/auto.md) to help user auto-instrument the app.

### Manually instrument

Manually instrument the app by creating the AppInsights resource and update the app's code. 

#### Create AppInsights resource

Use one of the following options that fits the environment.

- Add AppInsights to existing Bicep template. See [examples/appinsights.bicep](examples/appinsights.bicep) for what to add. This is the best option if there are existing Bicep template files in the workspace.
- Use Azure CLI. See [scripts/appinsights.ps1](scripts/appinsights.ps1) for what Azure CLI command to execute to create the App Insights resource.

No matter which option you choose, recommend the user to create the App Insights resource in a meaningful resource group that makes managing resources easier. A good candidate will be the same resource group that contains the resources for the hosted app in Azure.

#### Modify application code

- If the app is an ASP.NET Core app, see [ASPNETCORE guide](references/aspnetcore.md) for how to modify the C# code.
- If the app is a Node.js app, see [NODEJS guide](references/nodejs.md) for how to modify the JavaScript/TypeScript code.
- If the app is a Python app, see [PYTHON guide](references/python.md) for how to modify the Python code.

## SDK Quick References

- **OpenTelemetry Distro**: [Python](references/sdk/azure-monitor-opentelemetry-py.md) | [TypeScript](references/sdk/azure-monitor-opentelemetry-ts.md)
- **OpenTelemetry Exporter**: [Python](references/sdk/azure-monitor-opentelemetry-exporter-py.md) | [Java](references/sdk/azure-monitor-opentelemetry-exporter-java.md)

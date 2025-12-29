## Modify code

Make these necessary changes to the app.

- Install client library
```
dotnet add package Azure.Monitor.OpenTelemetry.AspNetCore
```

- Configure the app to use Azure Monitor
An ASP.NET Core app typically has a Program.cs file that "builds" the app. Find this file and apply these changes.
  - Add `using Azure.Monitor.OpenTelemetry.AspNetCore;` at the top
  - Before calling `builder.Build()`, add this line `builder.Services.AddOpenTelemetry().UseAzureMonitor();`.

> Note: since we modified the code of the app, the app needs to be deployed to take effect.

## Configure App Insights connection string

The App Insights resource has a connection string. Add the connection string as an environment variable of the running app. You can use Azure CLI to query the connection string of the App Insights resource. See [scripts/appinsights.ps1](scripts/appinsights.ps1) for what Azure CLI command to execute for querying the connection string.

After getting the connection string, set this environment variable with its value.

```
"APPLICATIONINSIGHTS_CONNECTION_STRING={your_application_insights_connection_string}"
```

If the app has IaC template such as Bicep or terraform files representing its cloud instance, this environment variable should be added to the IaC template to be applied in each deployment. Otherwise, use Azure CLI to manually apply the environment variable to the cloud instance of the app. See [scripts/appinsights.ps1](scripts/appinsights.ps1) for what Azure CLI command to execute for setting this environment variable.

> Important: Don't modify appsettings.json. It was a deprecated way to configure App Insights. The environment variable is the new recommended way.

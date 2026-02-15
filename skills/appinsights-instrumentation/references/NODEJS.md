## Modify code

Make these necessary changes to the app.

- Install client library
```
npm install @azure/monitor-opentelemetry
```

- Configure the app to use Azure Monitor
A Node.js app typically has an entry file that is listed as the "main" property in package.json. Find this file and apply these changes in it.
  - Require the client library at the top. `const { useAzureMonitor } = require("@azure/monitor-opentelemetry");`
  - Call the setup method. `useAzureMonitor();`

> Note: The setup method should be called as early as possible but it must be after the environment variables are configured since it needs the App Insights connection string from the environment variable. For example, if the app uses dotenv to load environment variables, the setup method should be called after it but before anything else.
> Note: since we modified the code of the app, it needs to be deployed to take effect.

## Configure App Insights connection string

The App Insights resource has a connection string. Add the connection string as an environment variable of the running app. You can use Azure CLI to query the connection string of the App Insights resource. See [scripts/appinsights.ps1] for what Azure CLI command to execute for querying the connection string.

After getting the connection string, set this environment variable with its value.

```
"APPLICATIONINSIGHTS_CONNECTION_STRING={your_application_insights_connection_string}"
```

If the app has IaC template such as Bicep or terraform files representing its cloud instance, this environment variable should be added to the IaC template to be applied in each deployment. Otherwise, use Azure CLI to manually apply the environment variable to the cloud instance of the app. See what Azure CLI command to execute for setting this environment variable.

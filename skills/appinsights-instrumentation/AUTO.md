# Auto-instrument app

Use Azure Portal to auto-instrument a webapp hosted in Azure App Service for App Insights without making any code changes. Only the following types of app can be auto-instrumented. See [supported environments and resource providers](https://learn.microsoft.com/azure/azure-monitor/app/codeless-overview#supported-environments-languages-and-resource-providers).

- ASP.NET Core app hosted in Azure App Service
- Node.js app hosted in Azure App Service

Construct a url to bring the user to the Application Insights blade in Azure Portal for the App Service App.
```
https://portal.azure.com/#resource/subscriptions/{subscription_id}/resourceGroups/{resource_group_name}/providers/Microsoft.Web/sites/{app_service_name}/monitoringSettings
```

Use the context or ask the user to get the subscription_id, resource_group_name, and the app_service_name hosting the webapp.

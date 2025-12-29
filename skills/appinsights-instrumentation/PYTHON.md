## Modify code

Make these necessary changes to the app.

- Install client library
```
pip install azure-monitor-opentelemetry
```

- Configure the app to use Azure Monitor
Python applications send telemetry via the logger class in Python standard library. Create a module that configures and creates a logger that can send telemetry.

```python
import logging
from azure.monitor.opentelemetry import configure_azure_monitor

configure_azure_monitor(
    logger_name="<your_logger_namespace>"
)
logger = logging.getLogger("<your_logger_namespace>")
```

> Note: since we modified the code of the app, it needs to be deployed to take effect.

## Configure App Insights connection string

The App Insights resource has a connection string. Add the connection string as an environment variable of the running app. You can use Azure CLI to query the connection string of the App Insights resource. See [scripts/appinsights.ps1] for what Azure CLI command to execute for querying the connection string.

After getting the connection string, set this environment variable with its value.

```
"APPLICATIONINSIGHTS_CONNECTION_STRING={your_application_insights_connection_string}"
```

If the app has IaC template such as Bicep or terraform files representing its cloud instance, this environment variable should be added to the IaC template to be applied in each deployment. Otherwise, use Azure CLI to manually apply the environment variable to the cloud instance of the app. See what Azure CLI command to execute for setting this environment variable.

## Send data

Create a logger that is configured to send telemetry.
```python
logger = logging.getLogger("<your_logger_namespace>")
logger.setLevel(logging.INFO)
```

Then send telemetry events by calling its logging methods.
```python
logger.info("info log")
```

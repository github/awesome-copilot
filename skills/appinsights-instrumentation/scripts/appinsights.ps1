# Create App Insights resource (3 steps)
## Add the Application Insights extension
az extension add -n application-insights
## Create a Log Analytics workspace
az monitor log-analytics workspace create --resource-group $resourceGroupName --workspace-name $logAnalyticsWorkspaceName --location $azureRegionName
## Create the Application Insights resource
az monitor app-insights component create --app $applicationInsightsResourceName --location $azureRegionName --resource-group $resourceGroupName --workspace $logAnalyticsWorkspaceName

# Query connection string of App Insights
az monitor app-insights component show --app $applicationInsightsResourceName --resource-group $resourceGroupName --query connectionString --output tsv

# Set environment variable of App Service
az webapp config appsettings set --resource-group $resourceGroupName --name $appName --settings $key=$value

# Set environment variable of Container App
# Or update an existing container app
az containerapp update -n $containerAppName -g $resourceGroupName --set-env-vars $key=$value

# Set environment variable of Function App
az functionapp config appsettings set --name $functionName --resource-group $ResourceGroupName --settings $key=$value

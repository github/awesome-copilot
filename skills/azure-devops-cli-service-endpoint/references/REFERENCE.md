# Service Endpoints

- [Service Endpoints](#service-endpoints)
  - [Service Connection Automation](#service-connection-automation)
  - [Idempotent Service Connection](#idempotent-service-connection)

```bash
# List service endpoints
az devops service-endpoint list --project {project}
az devops service-endpoint list --project {project} --output table

# Show service endpoint
az devops service-endpoint show --id {endpoint-id} --project {project}

# Create service endpoint from configuration file
az devops service-endpoint create --service-endpoint-configuration endpoint.json --project {project}

# Delete service endpoint
az devops service-endpoint delete --id {endpoint-id} --project {project} --yes
```

## Service Connection Automation

```bash
# Create service connection using configuration file
cat > service-connection.json <<'EOF'
{
  "data": {
    "subscriptionId": "$SUBSCRIPTION_ID",
    "subscriptionName": "My Subscription",
    "creationMode": "Manual",
    "serviceEndpointId": "$SERVICE_ENDPOINT_ID"
  },
  "url": "https://management.azure.com/",
  "authorization": {
    "parameters": {
      "tenantid": "$TENANT_ID",
      "serviceprincipalid": "$SP_ID",
      "authenticationType": "spnKey",
      "serviceprincipalkey": "$SP_KEY"
    },
    "scheme": "ServicePrincipal"
  },
  "type": "azurerm",
  "isShared": false,
  "isReady": true
}
EOF

az devops service-endpoint create \
  --service-endpoint-configuration service-connection.json \
  --project "$PROJECT"
```

## Idempotent Service Connection

```bash
# Check if service connection exists, create if not
ensure_service_connection() {
  local name=$1
  local project=$2

  SC_ID=$(az devops service-endpoint list \
    --project "$project" \
    --query "[?name=='$name'].id" \
    -o tsv)

  if [[ -z "$SC_ID" ]]; then
    echo "Service connection not found. Creating..."
    # Create logic here
  else
    echo "Service connection exists: $name"
    echo "$SC_ID"
  fi
}
```

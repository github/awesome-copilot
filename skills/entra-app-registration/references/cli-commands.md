# Azure CLI Commands for App Registration

This document provides a comprehensive reference for managing Microsoft Entra app registrations using Azure CLI.

## Prerequisites

```bash
# Ensure Azure CLI is installed
az version

# Login to Azure
az login

# Set default subscription (optional)
az account set --subscription "Your Subscription Name"
```

## App Registration Management

### Create App Registration

**Basic app registration:**
```bash
az ad app create --display-name "MyApplication"
```

**Web application with redirect URI:**
```bash
az ad app create \
  --display-name "MyWebApp" \
  --web-redirect-uris "https://myapp.com/callback" \
  --sign-in-audience "AzureADMyOrg"
```

**Single Page Application (SPA):**
```bash
az ad app create \
  --display-name "MySpaApp" \
  --spa-redirect-uris "http://localhost:3000" \
  --sign-in-audience "AzureADMyOrg"
```

**Public client (Desktop/Mobile app):**
```bash
az ad app create \
  --display-name "MyDesktopApp" \
  --public-client-redirect-uris "http://localhost" \
  --sign-in-audience "AzureADMyOrg"
```

**Multi-tenant application:**
```bash
az ad app create \
  --display-name "MyMultiTenantApp" \
  --web-redirect-uris "https://myapp.com/callback" \
  --sign-in-audience "AzureADMultipleOrgs"
```

### Sign-in Audience Options

| Value | Description |
|-------|-------------|
| `AzureADMyOrg` | Single tenant (default) |
| `AzureADMultipleOrgs` | Multi-tenant (any Azure AD) |
| `AzureADandPersonalMicrosoftAccount` | Multi-tenant + personal Microsoft accounts |
| `PersonalMicrosoftAccount` | Personal Microsoft accounts only |

## List and Query Apps

### List all app registrations

```bash
az ad app list --output table
```

### List apps with custom query

```bash
# Filter by display name
az ad app list --display-name "MyApp" --output table

# Get specific fields
az ad app list --query "[].{Name:displayName, AppId:appId}" --output table
```

### Get app details

```bash
# By display name
az ad app show --id $(az ad app list --display-name "MyApp" --query "[0].appId" -o tsv)

# By application ID
az ad app show --id "YOUR_APPLICATION_ID"
```

### Get Application (Client) ID

```bash
APP_ID=$(az ad app list --display-name "MyApp" --query "[0].appId" -o tsv)
echo "Application ID: $APP_ID"
```

### Get Object ID

```bash
OBJECT_ID=$(az ad app list --display-name "MyApp" --query "[0].id" -o tsv)
echo "Object ID: $OBJECT_ID"
```

## Update App Registration

### Add redirect URIs

**Web app:**
```bash
az ad app update --id $APP_ID \
  --web-redirect-uris "https://myapp.com/callback" "https://myapp.com/auth"
```

**SPA:**
```bash
az ad app update --id $APP_ID \
  --spa-redirect-uris "http://localhost:3000" "http://localhost:5000"
```

**Public client:**
```bash
az ad app update --id $APP_ID \
  --public-client-redirect-uris "http://localhost" "myapp://auth"
```

## Client Credentials (Secrets & Certificates)

### Create client secret

```bash
# Create secret with default expiration
az ad app credential reset --id $APP_ID

# Create secret with custom expiration
az ad app credential reset --id $APP_ID --years 1

# Create secret with specific end date
az ad app credential reset --id $APP_ID --end-date "2025-12-31"
```

**Save the output:**
```json
{
  "appId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "password": "your-secret-value-SAVE-THIS",
  "tenant": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

**⚠️ Important:** Resetting Client credential will delete all existing credentials.
**⚠️ Important:** The secret value is only shown once. Store it securely (e.g., Azure Key Vault).

### List client credentials

```bash
# List all credentials (secrets and certificates)
az ad app credential list --id $APP_ID
```

### Delete client secret

```bash
# Get key ID from credential list
az ad app credential list --id $APP_ID --query "[].{KeyId:keyId, Type:type}" -o table

# Delete specific credential
az ad app credential delete --id $APP_ID --key-id "KEY_ID_HERE"
```

### Upload certificate

```bash
# Upload certificate from file
az ad app credential reset --id $APP_ID --cert "@path/to/cert.pem"
```

## API Permissions

### Add API permissions

**Microsoft Graph User.Read:**
```bash
GRAPH_RESOURCE_ID="00000003-0000-0000-c000-000000000000"  # Microsoft Graph
USER_READ_ID="e1fe6dd8-ba31-4d61-89e7-88639da4683d"      # User.Read permission

az ad app permission add --id $APP_ID \
  --api $GRAPH_RESOURCE_ID \
  --api-permissions "$USER_READ_ID=Scope"
```

**Microsoft Graph Mail.Read (delegated):**
```bash
MAIL_READ_ID="570282fd-fa5c-430d-a7fd-fc8dc98a9dca"      # Mail.Read permission

az ad app permission add --id $APP_ID \
  --api $GRAPH_RESOURCE_ID \
  --api-permissions "$MAIL_READ_ID=Scope"
```

**Microsoft Graph User.Read.All (application):**
```bash
USER_READ_ALL_ID="df021288-bdef-4463-88db-98f22de89214"  # User.Read.All application permission

az ad app permission add --id $APP_ID \
  --api $GRAPH_RESOURCE_ID \
  --api-permissions "$USER_READ_ALL_ID=Role"
```

**Note:** Use `Scope` for delegated permissions, `Role` for application permissions.

### Common Permission IDs

**Microsoft Graph (00000003-0000-0000-c000-000000000000):**

| Permission | ID | Type |
|------------|-----|------|
| User.Read | e1fe6dd8-ba31-4d61-89e7-88639da4683d | Delegated |
| User.ReadWrite | b4e74841-8e56-480b-be8b-910348b18b4c | Delegated |
| Mail.Read | 570282fd-fa5c-430d-a7fd-fc8dc98a9dca | Delegated |
| Mail.Send | e383f46e-2787-4529-855e-0e479a3ffac0 | Delegated |
| Calendars.Read | 465a38f9-76ea-45b9-9f34-9e8b0d4b0b42 | Delegated |
| User.Read.All | df021288-bdef-4463-88db-98f22de89214 | Application |
| Directory.Read.All | 7ab1d382-f21e-4acd-a863-ba3e13f7da61 | Application |

### Grant admin consent

```bash
# Grant admin consent for all permissions
az ad app permission admin-consent --id $APP_ID
```

**Note:** Admin consent is required for application permissions and some delegated permissions.

### List permissions

```bash
az ad app permission list --id $APP_ID
```

### Delete permission

```bash
# Remove specific permission
az ad app permission delete --id $APP_ID \
  --api $GRAPH_RESOURCE_ID \
  --permission-id $USER_READ_ID
```

## Service Principal Management

### Create service principal

```bash
# Create service principal for the app
az ad sp create --id $APP_ID
```

### List service principals

```bash
az ad sp list --display-name "MyApp"
```

### Get service principal details

```bash
az ad sp show --id $APP_ID
```

### Delete service principal

```bash
az ad sp delete --id $APP_ID
```

## App Roles and Claims

### Get app roles

```bash
az ad app show --id $APP_ID --query "appRoles"
```

### Get optional claims

```bash
az ad app show --id $APP_ID --query "optionalClaims"
```

## Owners

### List app owners

```bash
az ad app owner list --id $APP_ID
```

### Add owner

```bash
# Add user as owner
USER_OBJECT_ID=$(az ad user show --id "user@domain.com" --query "id" -o tsv)
az ad app owner add --id $APP_ID --owner-object-id $USER_OBJECT_ID
```

### Remove owner

```bash
az ad app owner remove --id $APP_ID --owner-object-id $USER_OBJECT_ID
```

## Delete App Registration

```bash
# Delete app registration (and associated service principal)
az ad app delete --id $APP_ID
```

## Tenant and Identity Information

### Get tenant ID

```bash
az account show --query tenantId -o tsv
```

### Get current user information

```bash
az ad signed-in-user show
```

### Get user by email

```bash
az ad user show --id "user@domain.com"
```

### Get user object ID

```bash
az ad user show --id "user@domain.com" --query "id" -o tsv
```

### List all users

```bash
az ad user list --output table
```

## Scripting Examples

### Complete app setup script

```bash
#!/bin/bash

# Variables
APP_NAME="MyApplication"
REDIRECT_URI="http://localhost:3000"

echo "Creating app registration..."
APP_ID=$(az ad app create \
  --display-name "$APP_NAME" \
  --spa-redirect-uris "$REDIRECT_URI" \
  --query "appId" -o tsv)

echo "App created with ID: $APP_ID"

echo "Adding Microsoft Graph permissions..."
GRAPH_RESOURCE_ID="00000003-0000-0000-c000-000000000000"
USER_READ_ID="e1fe6dd8-ba31-4d61-89e7-88639da4683d"

az ad app permission add --id $APP_ID \
  --api $GRAPH_RESOURCE_ID \
  --api-permissions "$USER_READ_ID=Scope"

echo "Granting admin consent..."
az ad app permission admin-consent --id $APP_ID

echo "Creating service principal..."
az ad sp create --id $APP_ID

TENANT_ID=$(az account show --query tenantId -o tsv)

echo ""
echo "App registration complete!"
echo "Application (Client) ID: $APP_ID"
echo "Tenant ID: $TENANT_ID"
echo "Redirect URI: $REDIRECT_URI"
```

### Cleanup script

```bash
#!/bin/bash

# Delete all apps matching pattern
az ad app list --display-name "Test*" --query "[].appId" -o tsv | while read APP_ID; do
  echo "Deleting app: $APP_ID"
  az ad app delete --id $APP_ID
done
```

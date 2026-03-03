# First App Registration - Step-by-Step Guide

This guide walks you through creating your first Microsoft Entra app registration from scratch.

## Overview

You'll learn how to:
1. Create an app registration in Azure Portal
2. Configure authentication settings
3. Add API permissions
4. Create client credentials
5. Test the authentication flow

## Prerequisites

- Azure subscription (free tier works)
- Azure Portal access: https://portal.azure.com
- Basic understanding of your application type (web, mobile, service)

## Step 1: Navigate to App Registrations

1. Open [Azure Portal](https://portal.azure.com)
2. Search for **"Microsoft Entra ID"**
3. In the left menu, click **"App registrations"**
4. Click **"+ New registration"** at the top

## Step 2: Register Your Application

You'll see a form with several fields:

### Application Name
- **What to enter:** A descriptive name for your app
- **Example:** "My First Console App" or "Product Inventory API"
- **Tip:** Use a name that clearly identifies the purpose

### Supported Account Types

Choose who can use your application:

| Option | When to Use |
|--------|-------------|
| **Accounts in this organizational directory only (Single tenant)** | Only users from the same tenant of this app registration need access |
| **Accounts in any organizational directory (Multi-tenant)** | Users from multiple organization tenants need access |
| **Accounts in any organizational directory + Personal Microsoft accounts** | Users from multiple organization tenants and MSA users need access |
| **Personal Microsoft accounts only** | Only MSA users need access |

**Note:** Once selected, users whose account type is not allowed will get errors when trying to get access token for the app registration.

### Redirect URI (optional)

The redirect URI is where authentication responses are sent.

**Platform:** Select the type:
- **Web** - Server-side web apps
- **Single-page application (SPA)** - React, Angular, Vue apps
- **Public client/native** - Mobile, desktop, console apps

**URI examples:**
- Web app: `https://localhost:5001/signin-oidc`
- SPA: `http://localhost:3000`
- Console/Desktop: `http://localhost`

**For your first app:** Select **"Public client/native"** and enter `http://localhost`

### Click "Register"

After clicking, you'll be redirected to your app's overview page.

## Step 3: Save Important Information

On the **Overview** page, you'll see critical information. **Copy and save these values:**

### Application (client) ID
- **What it is:** Unique identifier for your app
- **Format:** `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` (GUID)
- **When you need it:** Every time your app authenticates
- **Where to save:** Environment variables, configuration file

### Directory (tenant) ID
- **What it is:** Unique identifier for your Azure AD tenant
- **Format:** `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` (GUID)
- **When you need it:** Constructing authentication URLs

### Example values to save:
```bash
# Save these in a secure location
APPLICATION_CLIENT_ID="12345678-1234-1234-1234-123456789012"
TENANT_ID="87654321-4321-4321-4321-210987654321"
```

## Step 4: Configure Authentication (Optional)

Click **"Authentication"** in the left menu.

### Advanced Settings

**Allow public client flows:**
- **What it is:** Enables device code flow, resource owner password flow
- **For console apps:** Turn this **ON**
- **For web apps:** Keep **OFF**

### Supported account types

You can change this later if needed.

### Logout URL (optional)

Where to redirect users after logout.

**Click "Save"** at the top if you made changes.

## Step 5: Add API Permissions

Click **"API permissions"** in the left menu.

### Default Permission

You'll see one default permission:
- **Microsoft Graph → User.Read (Delegated)**

This allows your app to read the signed-in user's profile.

### Add More Permissions

1. Click **"+ Add a permission"**
2. Select **"Microsoft Graph"**
3. Choose **"Delegated permissions"** (for user context)
4. Search for and select permissions you need:
   - **User.Read** - Read user profile (already added)
   - **Mail.Read** - Read user's mail
   - **Calendars.Read** - Read user's calendar

5. Click **"Add permissions"**

### Admin Consent

Some permissions require admin consent:
- If you're an admin: Click **"Grant admin consent for [Your Org]"**
- If you're not: Ask your admin to grant consent

**Status indicator:**
- ✅ Green checkmark = Granted
- ⚠️ Yellow warning = Not granted (may still work for user consent)

## Step 6: Create Client Secret (If Needed)

**Skip this if:** You're building a desktop/mobile/console app (public client)

**Do this if:** You're building a web app, API, or service (confidential client)

1. Click **"Certificates & secrets"** in the left menu
2. Click **"+ New client secret"**
3. Enter a description: "Development Secret"
4. Choose expiration:
   - **Recommended for development:** 6 months
   - **For production:** 12-24 months (set up rotation)
5. Click **"Add"**

**⚠️ CRITICAL:** Copy the secret **Value** immediately!
- It's only shown once
- You cannot retrieve it later
- If you lose it, create a new one

```bash
# Save this securely (example)
CLIENT_SECRET="abc123~defGHI456jklMNO789pqrSTU"
```

**Security tips:**
- Never commit secrets to source control
- Use Azure Key Vault for production
- Use environment variables for development

## Step 7: Test Your App Registration

### Option A: Quick Test with Azure CLI

```bash
# Set your values
CLIENT_ID="your-client-id-here"
TENANT_ID="your-tenant-id-here"

# Interactive login
az login --scope "https://graph.microsoft.com/.default"

# Get an access token
az account get-access-token --resource "https://graph.microsoft.com"
```

### Option B: Test with MSAL Library

See the complete code example in [console-app-example.md](console-app-example.md)

### Expected Results

**Success:**
- Browser opens for authentication (or device code shown)
- You authenticate with your Azure AD account
- Access token is returned
- You can call Microsoft Graph API

**Common first-time issues:**
- Redirect URI mismatch → Double-check URI in Authentication settings
- Insufficient permissions → Add required API permissions
- User consent required → Grant admin consent or user must consent

**Tip:** Once you get the access token, you can use [jwt.ms](https://jwt.ms) to decode it and inspect its claims.

## Step 8: Review Configuration

### Checklist

- ✅ App registered with clear name
- ✅ Application ID and Tenant ID saved securely
- ✅ Redirect URI configured correctly
- ✅ API permissions added
- ✅ Admin consent granted (if required)
- ✅ Client secret created and saved (if needed)
- ✅ Authentication tested successfully

## Next Steps

- In your client app, implement the OAuth flow to acquire access tokens for your app registration.
- In your server app, implement token validation to protect your resources.

## Troubleshooting

### Redirect URI mismatch"

**Solution:**
- Check Authentication → Redirect URIs
- Ensure exact match (case-sensitive, trailing slash matters)
- Ensure correct platform (Web vs SPA vs Public client)

### User consent required

**Solution:**
- Grant admin consent in API permissions
- Or have user consent during first login

## Additional Resources

- [Microsoft Entra ID Documentation](https://learn.microsoft.com/en-us/entra/identity-platform/)

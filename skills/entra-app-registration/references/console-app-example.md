# Console Application Examples

This document provides complete working examples of console applications that authenticate with Microsoft Entra ID using MSAL (Microsoft Authentication Library).

## Table of Contents

- [C# (.NET) Example](#c-net-example)
- [Python Example](#python-example)
- [JavaScript (Node.js) Example](#javascript-nodejs-example)

## C# (.NET) Example

### Prerequisites

```bash
dotnet new console -n EntraAuthConsole
cd EntraAuthConsole
dotnet add package Microsoft.Identity.Client
```

### Complete Code

```csharp
using Microsoft.Identity.Client;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace EntraAuthConsole
{
    class Program
    {
        // Configuration - replace with your values
        private const string ClientId = "YOUR_APPLICATION_CLIENT_ID";
        private const string TenantId = "YOUR_TENANT_ID";
        private static readonly string[] Scopes = new[] { "User.Read" };

        static async Task Main(string[] args)
        {
            try
            {
                // Build the MSAL client
                var app = PublicClientApplicationBuilder
                    .Create(ClientId)
                    .WithAuthority(AzureCloudInstance.AzurePublic, TenantId)
                    .WithRedirectUri("http://localhost")
                    .Build();

                // Try to get token silently from cache first
                var accounts = await app.GetAccountsAsync();
                AuthenticationResult result;

                try
                {
                    result = await app.AcquireTokenSilent(Scopes, accounts.FirstOrDefault())
                        .ExecuteAsync();
                    Console.WriteLine("Token acquired from cache");
                }
                catch (MsalUiRequiredException)
                {
                    // Interactive authentication required
                    result = await app.AcquireTokenInteractive(Scopes)
                        .WithPrompt(Prompt.SelectAccount)
                        .ExecuteAsync();
                    Console.WriteLine("Token acquired interactively");
                }

                // Display user information
                Console.WriteLine($"\nWelcome, {result.Account.Username}!");
                Console.WriteLine($"Token expires: {result.ExpiresOn}");

                // Call Microsoft Graph API
                await CallGraphApiAsync(result.AccessToken);
            }
            catch (MsalException ex)
            {
                Console.WriteLine($"Error acquiring token: {ex.Message}");
            }
        }

        private static async Task CallGraphApiAsync(string accessToken)
        {
            using var httpClient = new System.Net.Http.HttpClient();
            httpClient.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);

            var response = await httpClient.GetAsync("https://graph.microsoft.com/v1.0/me");
            
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                Console.WriteLine("\nUser profile from Microsoft Graph:");
                Console.WriteLine(content);
            }
            else
            {
                Console.WriteLine($"API call failed: {response.StatusCode}");
            }
        }
    }
}
```

### Run the Application

```bash
dotnet run
```

### Device Code Flow (for headless scenarios)

```csharp
// Use this for servers or devices without a browser
result = await app.AcquireTokenWithDeviceCode(Scopes, deviceCodeResult =>
{
    Console.WriteLine(deviceCodeResult.Message);
    return Task.CompletedTask;
}).ExecuteAsync();
```

---

## Python Example

### Prerequisites

```bash
pip install msal requests
```

### Complete Code

```python
import msal
import requests
import json

# Configuration - replace with your values
CLIENT_ID = "YOUR_APPLICATION_CLIENT_ID"
TENANT_ID = "YOUR_TENANT_ID"
AUTHORITY = f"https://login.microsoftonline.com/{TENANT_ID}"
SCOPES = ["User.Read"]

def acquire_token_interactive():
    """Acquire token using interactive flow (opens browser)"""
    app = msal.PublicClientApplication(
        CLIENT_ID,
        authority=AUTHORITY
    )
    
    # Try to get token from cache first
    accounts = app.get_accounts()
    result = None
    
    if accounts:
        # Try silent acquisition
        result = app.acquire_token_silent(SCOPES, account=accounts[0])
        if result:
            print("Token acquired from cache")
    
    if not result:
        # Interactive authentication
        result = app.acquire_token_interactive(
            scopes=SCOPES,
            prompt="select_account"
        )
        print("Token acquired interactively")
    
    return result

def acquire_token_device_code():
    """Acquire token using device code flow (for headless scenarios)"""
    app = msal.PublicClientApplication(
        CLIENT_ID,
        authority=AUTHORITY
    )
    
    flow = app.initiate_device_flow(scopes=SCOPES)
    
    if "user_code" not in flow:
        raise Exception(f"Failed to create device flow: {flow.get('error_description')}")
    
    # Display instructions to user
    print(flow["message"])
    
    # Wait for user to complete authentication
    result = app.acquire_token_by_device_flow(flow)
    return result

def call_graph_api(access_token):
    """Call Microsoft Graph API with access token"""
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    
    response = requests.get(
        'https://graph.microsoft.com/v1.0/me',
        headers=headers
    )
    
    if response.status_code == 200:
        user_data = response.json()
        print("\nUser profile from Microsoft Graph:")
        print(json.dumps(user_data, indent=2))
    else:
        print(f"API call failed: {response.status_code}")
        print(response.text)

def main():
    # Choose authentication method
    print("Select authentication method:")
    print("1. Interactive (opens browser)")
    print("2. Device code (for headless scenarios)")
    choice = input("Enter choice (1 or 2): ")
    
    try:
        if choice == "1":
            result = acquire_token_interactive()
        elif choice == "2":
            result = acquire_token_device_code()
        else:
            print("Invalid choice")
            return
        
        if "access_token" in result:
            print(f"\nWelcome, {result.get('id_token_claims', {}).get('preferred_username', 'User')}!")
            print(f"Token expires in: {result.get('expires_in')} seconds")
            
            # Call Microsoft Graph API
            call_graph_api(result["access_token"])
        else:
            print(f"Error acquiring token: {result.get('error')}")
            print(f"Description: {result.get('error_description')}")
    
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
```

### Run the Application

```bash
python console_app.py
```

---

## JavaScript (Node.js) Example

### Prerequisites

```bash
npm init -y
npm install @azure/msal-node axios
```

### Complete Code

```javascript
const msal = require('@azure/msal-node');
const axios = require('axios');

// Configuration - replace with your values
const config = {
    auth: {
        clientId: "YOUR_APPLICATION_CLIENT_ID",
        authority: "https://login.microsoftonline.com/YOUR_TENANT_ID",
    }
};

const scopes = ["User.Read"];

// Interactive authentication (opens browser)
async function acquireTokenInteractive() {
    const pca = new msal.PublicClientApplication(config);
    
    const authCodeUrlParameters = {
        scopes: scopes,
        redirectUri: "http://localhost:3000",
    };

    // This opens the browser for authentication
    const response = await pca.acquireTokenInteractive(authCodeUrlParameters);
    return response;
}

// Device code flow (for headless scenarios)
async function acquireTokenDeviceCode() {
    const pca = new msal.PublicClientApplication(config);
    
    const deviceCodeRequest = {
        deviceCodeCallback: (response) => {
            console.log("\n" + response.message);
        },
        scopes: scopes,
    };

    const response = await pca.acquireTokenByDeviceCode(deviceCodeRequest);
    return response;
}

// Client credentials flow (service-to-service, no user)
async function acquireTokenClientCredentials() {
    const confidentialConfig = {
        auth: {
            clientId: "YOUR_APPLICATION_CLIENT_ID",
            authority: "https://login.microsoftonline.com/YOUR_TENANT_ID",
            clientSecret: "YOUR_CLIENT_SECRET", // From app registration
        }
    };
    
    const cca = new msal.ConfidentialClientApplication(confidentialConfig);
    
    const clientCredentialRequest = {
        scopes: ["https://graph.microsoft.com/.default"],
    };

    const response = await cca.acquireTokenByClientCredential(clientCredentialRequest);
    return response;
}

// Call Microsoft Graph API
async function callGraphApi(accessToken) {
    const options = {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    };

    try {
        const response = await axios.get('https://graph.microsoft.com/v1.0/me', options);
        console.log('\nUser profile from Microsoft Graph:');
        console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('API call failed:', error.response?.status, error.message);
    }
}

// Main function
async function main() {
    console.log("Select authentication method:");
    console.log("1. Device code flow (recommended for CLI)");
    console.log("2. Client credentials (service-to-service)");
    
    // For demonstration, using device code flow
    // In production, get user input with readline or similar
    const choice = "1";
    
    try {
        let result;
        
        if (choice === "1") {
            result = await acquireTokenDeviceCode();
        } else if (choice === "2") {
            result = await acquireTokenClientCredentials();
        }
        
        if (result.accessToken) {
            console.log('\nAuthentication successful!');
            console.log(`Token expires: ${new Date(result.expiresOn)}`);
            
            // Call Microsoft Graph API
            await callGraphApi(result.accessToken);
        } else {
            console.error('Failed to acquire token');
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

main();
```

### Run the Application

```bash
node console_app.js
```

## Next Steps

- Review [oauth-flows.md](oauth-flows.md) for flow details
- See [api-permissions.md](api-permissions.md) for permission setup
- Check [troubleshooting.md](troubleshooting.md) for common issues

## Additional Resources

- [MSAL Libraries](https://learn.microsoft.com/entra/msal/)

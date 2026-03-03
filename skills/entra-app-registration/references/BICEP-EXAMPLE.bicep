// Bicep template for Microsoft Entra App Registration
// Requires: Bicep v0.21.1+ with Microsoft Graph extension enabled

extension 'br:mcr.microsoft.com/bicep/extensions/microsoftgraph/v1.0:1.0.0'

@description('Display name for the application')
param appDisplayName string = 'MyEntraApp'

@description('Sign-in audience for the application')
@allowed([
  'AzureADMyOrg'
  'AzureADMultipleOrgs'
  'AzureADandPersonalMicrosoftAccount'
  'PersonalMicrosoftAccount'
])
param signInAudience string = 'AzureADMyOrg'

@description('Redirect URIs for web application')
param webRedirectUris array = [
  'https://localhost:5001/signin-oidc'
  'https://myapp.azurewebsites.net/signin-oidc'
]

@description('Redirect URIs for single-page application')
param spaRedirectUris array = [
  'http://localhost:3000'
  'https://myapp.azurewebsites.net'
]

@description('Tags for the application')
param tags array = [
  'Production'
  'WebApp'
]

// App Registration
resource appRegistration 'Microsoft.Graph/applications@v1.0' = {
  displayName: appDisplayName
  uniqueName: toLower(replace(appDisplayName, ' ', '-'))
  signInAudience: signInAudience
  tags: tags

  // Application identification
  identifierUris: [
    'api://${appDisplayName}'
  ]

  // Web application settings
  web: {
    redirectUris: webRedirectUris
    implicitGrantSettings: {
      enableIdTokenIssuance: true
      enableAccessTokenIssuance: false
    }
    homePageUrl: 'https://myapp.azurewebsites.net'
    logoutUrl: 'https://myapp.azurewebsites.net/signout-oidc'
  }

  // Single-page application settings
  spa: {
    redirectUris: spaRedirectUris
  }

  // Public client (mobile/desktop) settings
  publicClient: {
    redirectUris: [
      'http://localhost'
      'myapp://auth'
      'https://login.microsoftonline.com/common/oauth2/nativeclient'
    ]
  }

  // API definition (expose an API) 
  api: {
    // Version of the access token affects the values present in the token claims
    requestedAccessTokenVersion: 2
    oauth2PermissionScopes: [
      {
        id: '00000000-0000-0000-0000-000000000001'
        adminConsentDisplayName: 'Read user data'
        adminConsentDescription: 'Allows the app to read user data on behalf of the signed-in user'
        userConsentDisplayName: 'Read your data'
        userConsentDescription: 'Allows the app to read your data'
        value: 'User.Read'
        type: 'User'
        isEnabled: true
      }
      {
        id: '00000000-0000-0000-0000-000000000002'
        adminConsentDisplayName: 'Read and write user data'
        adminConsentDescription: 'Allows the app to read and write user data on behalf of the signed-in user'
        userConsentDisplayName: 'Read and write your data'
        userConsentDescription: 'Allows the app to read and write your data'
        value: 'User.ReadWrite'
        type: 'User'
        isEnabled: true
      }
    ]
  }

  // App roles for authorization
  appRoles: [
    {
      id: '00000000-0000-0000-0000-000000000010'
      displayName: 'Admin'
      description: 'Administrators can manage all aspects of the app'
      value: 'Admin'
      allowedMemberTypes: ['User', 'Application']
      isEnabled: true
    }
    {
      id: '00000000-0000-0000-0000-000000000011'
      displayName: 'Reader'
      description: 'Readers can view data but not modify'
      value: 'Reader'
      allowedMemberTypes: ['User']
      isEnabled: true
    }
  ]

  // Required API permissions (Microsoft Graph)
  requiredResourceAccess: [
    {
      // Microsoft Graph API
      resourceAppId: '00000003-0000-0000-c000-000000000000'
      resourceAccess: [
        {
          // User.Read - Delegated
          id: 'e1fe6dd8-ba31-4d61-89e7-88639da4683d'
          type: 'Scope'
        }
        {
          // User.ReadBasic.All - Delegated
          id: 'b340eb25-3456-403f-be2f-af7a0d370277'
          type: 'Scope'
        }
        {
          // Mail.Read - Delegated
          id: '570282fd-fa5c-430d-a7fd-fc8dc98a9dca'
          type: 'Scope'
        }
        {
          // User.Read.All - Application
          id: 'df021288-bdef-4463-88db-98f22de89214'
          type: 'Role'
        }
      ]
    }
  ]

  // Optional claims configuration
  optionalClaims: {
    idToken: [
      {
        name: 'email'
        essential: false
      }
      {
        name: 'upn'
        essential: false
      }
      {
        name: 'groups'
        essential: false
      }
    ]
    accessToken: [
      {
        name: 'email'
        essential: false
      }
    ]
  }

  // Information URLs
  info: {
    marketingUrl: 'https://myapp.example.com'
    privacyStatementUrl: 'https://myapp.example.com/privacy'
    supportUrl: 'https://myapp.example.com/support'
    termsOfServiceUrl: 'https://myapp.example.com/terms'
  }
}

// Service Principal (Enterprise Application)
resource servicePrincipal 'Microsoft.Graph/servicePrincipals@v1.0' = {
  appId: appRegistration.appId
  displayName: appDisplayName
  tags: [
    'WindowsAzureActiveDirectoryIntegratedApp'
  ]
  appRoleAssignmentRequired: false
  preferredSingleSignOnMode: 'oidc'
}

// Outputs
output applicationId string = appRegistration.appId
output objectId string = appRegistration.id
output servicePrincipalId string = servicePrincipal.id
output identifierUri string = appRegistration.identifierUris[0]

---
title: Power Platform Connectors Schema Development Instructions
description: 'Comprehensive development guidelines for Power Platform Custom Connectors using JSON Schema definitions. Covers API definitions (Swagger 2.0), API properties, and settings configuration with Microsoft extensions.'
applyTo: '**/*.{json,md}'
---

# Power Platform Connectors Schema Development Instructions

## Project Overview
This workspace contains JSON Schema definitions for Power Platform Custom Connectors, specifically for the `paconn` (Power Apps Connector) tool. The schemas validate and provide IntelliSense for:

- **API Definitions** (Swagger 2.0 format)
- **API Properties** (connector metadata and configuration)
- **Settings** (environment and deployment configuration)

## File Structure Understanding

### 1. apiDefinition.swagger.json
- **Purpose**: This file contains Swagger 2.0 API definitions with Power Platform extensions.
- **Key Features**:
  - Standard Swagger 2.0 properties including info, paths, definitions, and more.
  - Microsoft-specific extensions that begin with `x-ms-*` prefixes.
  - Custom format types specifically designed for Power Platform such as `date-no-tz` and `html`.
  - Dynamic schema support that provides runtime flexibility.
  - Security definitions that support OAuth2, API Key, and Basic Auth authentication methods.

### 2. apiProperties.json
- **Purpose**: This file defines connector metadata, authentication configurations, and policy configurations.
- **Key Components**:
  - **Connection Parameters**: These support various authentication types including OAuth, API Key, and Gateway configurations.
  - **Policy Template Instances**: These handle data transformation and routing policies for the connector.
  - **Connector Metadata**: This includes publisher information, capabilities, and branding elements.

### 3. settings.json
- **Purpose**: This file provides environment and deployment configuration settings for the paconn tool.
- **Configuration Options**:
  - Environment GUID targeting for specific Power Platform environments.
  - File path mappings for connector assets and configuration files.
  - API endpoint URLs for both production and testing environments (PROD/TIP1).
  - API version specifications to ensure compatibility with Power Platform services.

## Development Guidelines

### When Working with API Definitions (Swagger)
1. **Always validate against Swagger 2.0 spec** - The schema enforces strict Swagger 2.0 compliance

2. **Microsoft Extensions for Operations**:
   - `x-ms-summary`: Use this to provide user-friendly display names and ensure you use title case formatting.
   - `x-ms-visibility`: Use this to control parameter visibility with values of `important`, `advanced`, or `internal`.
   - `x-ms-trigger`: Use this to mark operations as triggers with values of `batch` or `single`.
   - `x-ms-trigger-hint`: Use this to provide helpful hint text that guides users when working with triggers.
   - `x-ms-trigger-metadata`: Use this to define trigger configuration settings including kind and mode properties.
   - `x-ms-notification`: Use this to configure webhook operations for real-time notifications.
   - `x-ms-pageable`: Use this to enable pagination functionality by specifying the `nextLinkName` property.
   - `x-ms-safe-operation`: Use this to mark POST operations as safe when they don't have side effects.
   - `x-ms-no-generic-test`: Use this to disable automatic testing for specific operations.
   - `x-ms-operation-context`: Use this to configure operation simulation settings for testing purposes.

3. **Microsoft Extensions for Parameters**:
   - `x-ms-dynamic-list`: Use this to enable dynamic dropdown lists populated from API calls.
   - `x-ms-dynamic-values`: Use this to configure dynamic value sources that populate parameter options.
   - `x-ms-dynamic-tree`: Use this to create hierarchical selectors for nested data structures.
   - `x-ms-dynamic-schema`: Use this to allow runtime schema changes based on user selections.
   - `x-ms-dynamic-properties`: Use this for dynamic property configuration that adapts to context.
   - `x-ms-enum-values`: Use this to provide enhanced enum definitions with display names for better user experience.
   - `x-ms-test-value`: Use this to provide sample values for testing, but never include secrets or sensitive data.
   - `x-ms-trigger-value`: Use this to specify values specifically for trigger parameters with `value-collection` and `value-path` properties.
   - `x-ms-url-encoding`: Use this to specify URL encoding style as either `single` or `double` (defaults to `single`).
   - `x-ms-parameter-location`: Use this to provide parameter location hints for the API (AutoRest extension - ignored by Power Platform).
   - `x-ms-localizeDefaultValue`: Use this to enable localization for default parameter values.
   - `x-ms-skip-url-encoding`: Use this to skip URL encoding for path parameters (AutoRest extension - ignored by Power Platform).

4. **Microsoft Extensions for Schemas**:
   - `x-ms-notification-url`: Use this to mark a schema property as a notification URL for webhook configurations.
   - `x-ms-media-kind`: Use this to specify the media type for content, with supported values of `image` or `audio`.
   - `x-ms-enum`: Use this to provide enhanced enum metadata (AutoRest extension - ignored by Power Platform).
   - Note that all parameter extensions listed above also apply to schema properties and can be used within schema definitions.

5. **Root-Level Extensions**:
   - `x-ms-capabilities`: Use this to define connector capabilities such as file-picker and testConnection functionality.
   - `x-ms-connector-metadata`: Use this to provide additional connector metadata beyond the standard properties.
   - `x-ms-docs`: Use this to configure documentation settings and references for the connector.
   - `x-ms-deployment-version`: Use this to track version information for deployment management.
   - `x-ms-api-annotation`: Use this to add API-level annotations for enhanced functionality.

6. **Path-Level Extensions**:
   - `x-ms-notification-content`: Use this to define notification content schemas for webhook path items.

7. **Operation-Level Capabilities**:
   - `x-ms-capabilities` (at operation level): Use this to enable operation-specific capabilities such as `chunkTransfer` for large file transfers.

8. **Security Considerations**:
   - You should define appropriate `securityDefinitions` for your API to ensure proper authentication.
   - **Multiple security definitions are allowed** - you can define up to two auth methods (e.g., oauth2 + apiKey, basic + apiKey).
   - **Exception**: If using "None" authentication, no other security definitions can be present in the same connector.
   - You should use `oauth2` for modern APIs, `apiKey` for simple token authentication, and consider `basic` auth only for internal/legacy systems.
   - Each security definition must be exactly one type (this constraint is enforced by oneOf validation).

9. **Parameter Best Practices**:
   - You should use descriptive `description` fields to help users understand each parameter's purpose.
   - You should implement `x-ms-summary` for better user experience (title case is required).
   - You must mark required parameters correctly to ensure proper validation.
   - You should use appropriate `format` values (including Power Platform extensions) to enable proper data handling.
   - You should leverage dynamic extensions for better user experience and data validation.

10. **Power Platform Format Extensions**:
   - `date-no-tz`: This represents a date-time that has no time-offset information.
   - `html`: This format tells clients to emit an HTML editor when editing and an HTML viewer when viewing content.
   - Standard formats include: `int32`, `int64`, `float`, `double`, `byte`, `binary`, `date`, `date-time`, `password`, `email`, `uri`, `uuid`.

### When Working with API Properties
1. **Connection Parameters**:
   - You should choose appropriate parameter types such as `string`, `securestring`, or `oauthSetting`.
   - You should configure OAuth settings with correct identity providers.
   - You should use `allowedValues` for dropdown options when appropriate.
   - You should implement parameter dependencies when needed for conditional parameters.

2. **Policy Templates**:
   - You should use `routerequesttoendpoint` for backend routing to different API endpoints.
   - You should implement `setqueryparameter` for setting default values on query parameters.
   - You should use `updatenextlink` for pagination scenarios to handle paging correctly.
   - You should apply `pollingtrigger` for trigger operations that require polling behavior.

3. **Branding and Metadata**:
   - You must always specify `iconBrandColor` as this property is required for all connectors.
   - You should define appropriate `capabilities` to specify whether your connector supports actions or triggers.
   - You should set meaningful `publisher` and `stackOwner` values to identify the connector's ownership.

### When Working with Settings
1. **Environment Configuration**:
   - You should use proper GUID format for `environment` that matches the validation pattern.
   - You should set correct `powerAppsUrl` and `flowUrl` for your target environment.
   - You should match API versions to your specific requirements.

2. **File References**:
   - You should maintain consistent file naming with the defaults of `apiProperties.json` and `apiDefinition.swagger.json`.
   - You should use relative paths for local development environments.
   - You should ensure icon file exists and is properly referenced in your configuration.

## Schema Validation Rules

### Required Properties
- **API Definition**: `swagger: "2.0"`, `info` (with `title` and `version`), `paths`
- **API Properties**: `properties` with `iconBrandColor`
- **Settings**: No required properties (all optional with defaults)

### Pattern Validation
- **Vendor Extensions**: Must match `^x-(?!ms-)` pattern for non-Microsoft extensions
- **Path Items**: Must start with `/` for API paths
- **Environment GUID**: Must match UUID format pattern `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`
- **URLs**: Must be valid URIs for endpoint configurations
- **Host Pattern**: Must match `^[^{}/ :\\\\]+(?::\\d+)?$` (no spaces, protocols, or paths)

### Type Constraints
- **Security Definitions**:
  - Up to two security definitions allowed in `securityDefinitions` object
  - Each individual security definition must be exactly one type (oneOf validation: `basic`, `apiKey`, `oauth2`)
  - **Exception**: "None" authentication cannot coexist with other security definitions
- **Parameter Types**: Limited to specific enum values (`string`, `number`, `integer`, `boolean`, `array`, `file`)
- **Policy Templates**: Type-specific parameter requirements
- **Format Values**: Extended set including Power Platform formats
- **Visibility Values**: Must be one of `important`, `advanced`, or `internal`
- **Trigger Types**: Must be `batch` or `single`

### Additional Validation Rules
- **$ref References**: Should only point to `#/definitions/`, `#/parameters/`, or `#/responses/`
- **Path Parameters**: Must be marked as `required: true`
- **Info Object**: Description should be different from title
- **Contact Object**: Email must be valid email format, URL must be valid URI
- **License Object**: Name is required, URL must be valid URI if provided
- **External Docs**: URL is required and must be valid URI
- **Tags**: Must have unique names within the array
- **Schemes**: Must be valid HTTP schemes (`http`, `https`, `ws`, `wss`)
- **MIME Types**: Must follow valid MIME type format in `consumes` and `produces`

## Common Patterns and Examples

### API Definition Examples

#### Basic Operation with Microsoft Extensions
```json
{
  "get": {
    "operationId": "GetItems",
    "summary": "Get items",
    "x-ms-summary": "Get Items",
    "x-ms-visibility": "important",
    "description": "Retrieves a list of items from the API",
    "parameters": [
      {
        "name": "category",
        "in": "query",
        "type": "string",
        "x-ms-summary": "Category",
        "x-ms-visibility": "important",
        "x-ms-dynamic-values": {
          "operationId": "GetCategories",
          "value-path": "id",
          "value-title": "name"
        }
      }
    ],
    "responses": {
      "200": {
        "description": "Success",
        "x-ms-summary": "Success",
        "schema": {
          "type": "object",
          "properties": {
            "items": {
              "type": "array",
              "x-ms-summary": "Items",
              "items": {
                "$ref": "#/definitions/Item"
              }
            }
          }
        }
      }
    }
  }
}
```

#### Trigger Operation Configuration
```json
{
  "get": {
    "operationId": "WhenItemCreated",
    "x-ms-summary": "When an Item is Created",
    "x-ms-trigger": "batch",
    "x-ms-trigger-hint": "To see it work now, create an item",
    "x-ms-trigger-metadata": {
      "kind": "query",
      "mode": "polling"
    },
    "x-ms-pageable": {
      "nextLinkName": "@odata.nextLink"
    }
  }
}
```

#### Dynamic Schema Example
```json
{
  "name": "dynamicSchema",
  "in": "body",
  "schema": {
    "x-ms-dynamic-schema": {
      "operationId": "GetSchema",
      "parameters": {
        "table": {
          "parameter": "table"
        }
      },
      "value-path": "schema"
    }
  }
}
```

#### File Picker Capability
```json
{
  "x-ms-capabilities": {
    "file-picker": {
      "open": {
        "operationId": "OneDriveFilePickerOpen",
        "parameters": {
          "dataset": {
            "value-property": "dataset"
          }
        }
      },
      "browse": {
        "operationId": "OneDriveFilePickerBrowse",
        "parameters": {
          "dataset": {
            "value-property": "dataset"
          }
        }
      },
      "value-title": "DisplayName",
      "value-collection": "value",
      "value-folder-property": "IsFolder",
      "value-media-property": "MediaType"
    }
  }
}
```

#### Test Connection Capability (Note: Not Supported for Custom Connectors)
```json
{
  "x-ms-capabilities": {
    "testConnection": {
      "operationId": "TestConnection",
      "parameters": {
        "param1": "literal-value"
      }
    }
  }
}
```

#### Operation Context for Simulation
```json
{
  "x-ms-operation-context": {
    "simulate": {
      "operationId": "SimulateOperation",
      "parameters": {
        "param1": {
          "parameter": "inputParam"
        }
      }
    }
  }
}
```

### Basic OAuth Configuration
```json
{
  "type": "oauthSetting",
  "oAuthSettings": {
    "identityProvider": "oauth2",
    "clientId": "your-client-id",
    "scopes": ["scope1", "scope2"],
    "redirectMode": "Global"
  }
}
```

#### Multiple Security Definitions Example
```json
{
  "securityDefinitions": {
    "oauth2": {
      "type": "oauth2",
      "flow": "accessCode",
      "authorizationUrl": "https://api.example.com/oauth/authorize",
      "tokenUrl": "https://api.example.com/oauth/token",
      "scopes": {
        "read": "Read access",
        "write": "Write access"
      }
    },
    "apiKey": {
      "type": "apiKey",
      "name": "X-API-Key",
      "in": "header"
    }
  }
}
```

**Note**: Maximum of two security definitions can coexist, but "None" authentication cannot be combined with other methods.

### Dynamic Parameter Setup
```json
{
  "x-ms-dynamic-values": {
    "operationId": "GetItems",
    "value-path": "id",
    "value-title": "name"
  }
}
```

### Policy Template for Routing
```json
{
  "templateId": "routerequesttoendpoint",
  "title": "Route to backend",
  "parameters": {
    "x-ms-apimTemplate-operationName": ["GetData"],
    "x-ms-apimTemplateParameter.newPath": "/api/v2/data"
  }
}
```

## Best Practices

1. **Use IntelliSense**: These schemas provide rich autocomplete and validation capabilities that help during development.
2. **Follow Naming Conventions**: Use descriptive names for operations and parameters to improve code readability.
3. **Implement Error Handling**: Define appropriate response schemas and error codes to handle failure scenarios properly.
4. **Test Thoroughly**: Validate schemas before deployment to catch issues early in the development process.
5. **Document Extensions**: Comment Microsoft-specific extensions for team understanding and future maintenance.
6. **Version Management**: Use semantic versioning in API info to track changes and compatibility.
7. **Security First**: Always implement appropriate authentication mechanisms to protect your API endpoints.

## Troubleshooting

### Common Schema Violations
- **Missing required properties**: `swagger: "2.0"`, `info.title`, `info.version`, `paths`
- **Invalid pattern formats**:
  - GUIDs must match exact format `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`
  - URLs must be valid URIs with proper scheme
  - Paths must start with `/`
  - Host must not include protocol, paths, or spaces
- **Incorrect vendor extension naming**: Use `x-ms-*` for Microsoft extensions, `^x-(?!ms-)` for others
- **Mismatched security definition types**: Each security definition must be exactly one type
- **Invalid enum values**: Check allowed values for `x-ms-visibility`, `x-ms-trigger`, parameter types
- **$ref pointing to invalid locations**: Must point to `#/definitions/`, `#/parameters/`, or `#/responses/`
- **Path parameters not marked as required**: All path parameters must have `required: true`
- **Type 'file' in wrong context**: Only allowed in `formData` parameters, not in schemas

### API Definition Specific Issues
- **Dynamic schema conflicts**: Can't use `x-ms-dynamic-schema` with fixed schema properties
- **Trigger configuration errors**: `x-ms-trigger-metadata` requires both `kind` and `mode`
- **Pagination setup**: `x-ms-pageable` requires `nextLinkName` property
- **File picker misconfiguration**: Must include both `open` operation and required properties
- **Capability conflicts**: Some capabilities may conflict with certain parameter types
- **Test value security**: Never include secrets or PII in `x-ms-test-value`
- **Operation context setup**: `x-ms-operation-context` requires a `simulate` object with `operationId`
- **Notification content schema**: Path-level `x-ms-notification-content` must define proper schema structure
- **Media kind restrictions**: `x-ms-media-kind` only supports `image` or `audio` values
- **Trigger value configuration**: `x-ms-trigger-value` must have at least one property (`value-collection` or `value-path`)

### Validation Tools
- Use JSON Schema validators to check your schema definitions for compliance.
- Leverage VS Code's built-in schema validation to catch errors during development.
- Test with paconn CLI before deployment using: `paconn validate --api-def apiDefinition.swagger.json`
- Validate against Power Platform connector requirements to ensure compatibility.
- Use the Power Platform Connector portal for validation and testing in the target environment.
- Check that operation responses match expected schemas to prevent runtime errors.

Remember: These schemas ensure your Power Platform connectors are properly formatted and will work correctly in the Power Platform ecosystem.

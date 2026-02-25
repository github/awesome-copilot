---
mode: 'agent'
tools: ['changes', 'search/codebase', 'edit/editFiles', 'problems']
description: 'Generate a TypeSpec API plugin with REST operations, authentication, and Adaptive Cards for Microsoft 365 Copilot'
model: 'gpt-4.1'
tags: [typespec, m365-copilot, api-plugin, rest-api]
---

# Create TypeSpec API Plugin

Create a complete TypeSpec API plugin for Microsoft 365 Copilot that integrates with external REST APIs.

## Requirements

Generate TypeSpec files with:

### main.tsp - Agent Definition
```typescript
import "@typespec/http";
import "@typespec/openapi3";
import "@microsoft/typespec-m365-copilot";
import "./actions.tsp";

using TypeSpec.Http;
using TypeSpec.M365.Copilot.Agents;
using TypeSpec.M365.Copilot.Actions;

@agent({
  name: "[Agent Name]",
  description: "[Description]"
})
@instructions("""
  [Instructions for using the API operations]
""")
namespace [AgentName] {
  // Reference operations from actions.tsp
  op operation1 is [APINamespace].operationName;
}
```

### actions.tsp - API Operations
```typescript
import "@typespec/http";
import "@microsoft/typespec-m365-copilot";

using TypeSpec.Http;
using TypeSpec.M365.Copilot.Actions;

@service
@actions(#{
    nameForHuman: "[API Display Name]",
    descriptionForModel: "[Model description]",
    descriptionForHuman: "[User description]"
})
@server("[API_BASE_URL]", "[API Name]")
@useAuth([AuthType]) // Optional
namespace [APINamespace] {
  
  @route("[/path]")
  @get
  @action
  op operationName(
    @path param1: string,
    @query param2?: string
  ): ResponseModel;

  model ResponseModel {
    // Response structure
  }
}
```

## Authentication Options

Choose based on API requirements:

1. **No Authentication** (Public APIs)
   ```typescript
   // No @useAuth decorator needed
   ```

2. **API Key**
   ```typescript
   @useAuth(ApiKeyAuth<ApiKeyLocation.header, "X-API-Key">)
   ```

3. **OAuth2**
   ```typescript
   @useAuth(OAuth2Auth<[{
     type: OAuth2FlowType.authorizationCode;
     authorizationUrl: "https://oauth.example.com/authorize";
     tokenUrl: "https://oauth.example.com/token";
     refreshUrl: "https://oauth.example.com/token";
     scopes: ["read", "write"];
   }]>)
   ```

4. **Registered Auth Reference**
   ```typescript
   @useAuth(Auth)
   
   @authReferenceId("registration-id-here")
   model Auth is ApiKeyAuth<ApiKeyLocation.header, "X-API-Key">
   ```

## Function Capabilities

### Confirmation Dialog
```typescript
@capabilities(#{
  confirmation: #{
    type: "AdaptiveCard",
    title: "Confirm Action",
    body: """
    Are you sure you want to perform this action?
      * **Parameter**: {{ function.parameters.paramName }}
    """
  }
})
```

### Adaptive Card Response
```typescript
@card(#{
  dataPath: "$.items",
  title: "$.title",
  url: "$.link",
  file: "cards/card.json"
})
```

### Reasoning & Response Instructions
```typescript
@reasoning("""
  Consider user's context when calling this operation.
  Prioritize recent items over older ones.
""")
@responding("""
  Present results in a clear table format with columns: ID, Title, Status.
  Include a summary count at the end.
""")
```

## Best Practices

1. **Operation Names**: Use clear, action-oriented names (listProjects, createTicket)
2. **Models**: Define TypeScript-like models for requests and responses
3. **HTTP Methods**: Use appropriate verbs (@get, @post, @patch, @delete)
4. **Paths**: Use RESTful path conventions with @route
5. **Parameters**: Use @path, @query, @header, @body appropriately
6. **Descriptions**: Provide clear descriptions for model understanding
7. **Confirmations**: Add for destructive operations (delete, update critical data)
8. **Cards**: Use for rich visual responses with multiple data items

## Workflow

Ask the user:
1. What is the API base URL and purpose?
2. What operations are needed (CRUD operations)?
3. What authentication method does the API use?
4. Should confirmations be required for any operations?
5. Do responses need Adaptive Cards?

Then generate:
- Complete `main.tsp` with agent definition
- Complete `actions.tsp` with API operations and models
- Optional `cards/card.json` if Adaptive Cards are needed

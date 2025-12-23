---
description: 'Guidelines and best practices for building TypeSpec-based declarative agents and API plugins for Microsoft 365 Copilot'
applyTo: '**/*.tsp'
---

# TypeSpec for Microsoft 365 Copilot Development Guidelines

## Core Principles

When working with TypeSpec for Microsoft 365 Copilot:

1. **Type Safety First**: Leverage TypeSpec's strong typing for all models and operations
2. **Declarative Approach**: Use decorators to describe intent, not implementation
3. **Scoped Capabilities**: Always scope capabilities to specific resources when possible
4. **Clear Instructions**: Write explicit, detailed agent instructions
5. **User-Centric**: Design for the end-user experience in Microsoft 365 Copilot

## File Organization

### Standard Structure
```
project/
├── appPackage/
│   ├── cards/              # Adaptive Card templates
│   │   └── *.json
│   ├── .generated/         # Generated manifests (auto-generated)
│   └── manifest.json       # Teams app manifest
├── src/
│   ├── main.tsp           # Agent definition
│   └── actions.tsp        # API operations (for plugins)
├── m365agents.yml         # Agents Toolkit configuration
└── package.json
```

### Import Statements
Always include required imports at the top of TypeSpec files:

```typescript
import "@typespec/http";
import "@typespec/openapi3";
import "@microsoft/typespec-m365-copilot";

using TypeSpec.Http;
using TypeSpec.M365.Copilot.Agents;  // For agents
using TypeSpec.M365.Copilot.Actions; // For API plugins
```

## Agent Development Best Practices

### Agent Declaration
```typescript
@agent({
  name: "Role-Based Name",  // e.g., "Customer Support Assistant"
  description: "Clear, concise description under 1,000 characters"
})
```

- Use role-based names that describe what the agent does
- Make descriptions informative but concise
- Avoid generic names like "Helper" or "Bot"

### Instructions
```typescript
@instructions("""
  You are a [specific role] specialized in [domain].
  
  Your responsibilities include:
  - [Key responsibility 1]
  - [Key responsibility 2]
  
  When helping users:
  - [Behavioral guideline 1]
  - [Behavioral guideline 2]
  
  You should NOT:
  - [Constraint 1]
  - [Constraint 2]
""")
```

- Write in second person ("You are...")
- Be specific about the agent's role and expertise
- Define both what to do AND what not to do
- Keep under 8,000 characters
- Use clear, structured formatting

### Conversation Starters
```typescript
@conversationStarter(#{
  title: "Action-Oriented Title",  // e.g., "Check Status"
  text: "Specific example query"   // e.g., "What's the status of my ticket?"
})
```

- Provide 2-4 diverse starters
- Make each showcase a different capability
- Use action-oriented titles
- Write realistic example queries

### Capabilities - Knowledge Sources

**Web Search** - Scope to specific sites when possible:
```typescript
op webSearch is AgentCapabilities.WebSearch<Sites = [
  { url: "https://learn.microsoft.com" },
  { url: "https://docs.microsoft.com" }
]>;
```

**OneDrive and SharePoint** - Use URLs or IDs:
```typescript
op oneDriveAndSharePoint is AgentCapabilities.OneDriveAndSharePoint<
  ItemsByUrl = [
    { url: "https://contoso.sharepoint.com/sites/Engineering" }
  ]
>;
```

**Teams Messages** - Specify channels/chats:
```typescript
op teamsMessages is AgentCapabilities.TeamsMessages<Urls = [
  { url: "https://teams.microsoft.com/l/channel/..." }
]>;
```

**Email** - Scope to specific folders:
```typescript
op email is AgentCapabilities.Email<
  Folders = [
    { folderId: "Inbox" },
    { folderId: "SentItems" }
  ],
  SharedMailbox = "support@contoso.com"  // Optional
>;
```

**People** - No scoping needed:
```typescript
op people is AgentCapabilities.People;
```

**Copilot Connectors** - Specify connection IDs:
```typescript
op copilotConnectors is AgentCapabilities.GraphConnectors<
  Connections = [
    { connectionId: "your-connector-id" }
  ]
>;
```

**Dataverse** - Scope to specific tables:
```typescript
op dataverse is AgentCapabilities.Dataverse<
  KnowledgeSources = [
    {
      hostName: "contoso.crm.dynamics.com";
      tables: [
        { tableName: "account" },
        { tableName: "contact" }
      ];
    }
  ]
>;
```

### Capabilities - Productivity Tools

```typescript
// Python code execution
op codeInterpreter is AgentCapabilities.CodeInterpreter;

// Image generation
op graphicArt is AgentCapabilities.GraphicArt;

// Meeting content access
op meetings is AgentCapabilities.Meetings;

// Specialized AI models
op scenarioModels is AgentCapabilities.ScenarioModels<
  ModelsById = [
    { id: "model-id" }
  ]
>;
```

## API Plugin Development Best Practices

### Service Definition
```typescript
@service
@actions(#{
  nameForHuman: "User-Friendly API Name",
  descriptionForHuman: "What users will understand",
  descriptionForModel: "What the model needs to know",
  contactEmail: "support@company.com",
  privacyPolicyUrl: "https://company.com/privacy",
  legalInfoUrl: "https://company.com/terms"
})
@server("https://api.example.com", "API Name")
@useAuth([AuthType])  // If authentication needed
namespace APINamespace {
  // Operations here
}
```

### Operation Definition
```typescript
@route("/resource/{id}")
@get
@action
@card(#{
  dataPath: "$.items",
  title: "$.title",
  file: "cards/card.json"
})
@capabilities(#{
  confirmation: #{
    type: "AdaptiveCard",
    title: "Confirm Action",
    body: "Confirm with {{ function.parameters.param }}"
  }
})
@reasoning("Consider X when Y")
@responding("Present results as Z")
op getResource(
  @path id: string,
  @query filter?: string
): ResourceResponse;
```

### Models
```typescript
model Resource {
  id: string;
  name: string;
  description?: string;  // Optional fields
  status: "active" | "inactive";  // Union types for enums
  @format("date-time")
  createdAt: utcDateTime;
  @format("uri")
  url?: string;
}

model ResourceList {
  items: Resource[];
  totalCount: int32;
  nextPage?: string;
}
```

### Authentication

**API Key**
```typescript
@useAuth(ApiKeyAuth<ApiKeyLocation.header, "X-API-Key">)

// Or with reference ID
@useAuth(Auth)
@authReferenceId("${{ENV_VAR_REFERENCE_ID}}")
model Auth is ApiKeyAuth<ApiKeyLocation.header, "X-API-Key">;
```

**OAuth2**
```typescript
@useAuth(OAuth2Auth<[{
  type: OAuth2FlowType.authorizationCode;
  authorizationUrl: "https://auth.example.com/authorize";
  tokenUrl: "https://auth.example.com/token";
  refreshUrl: "https://auth.example.com/refresh";
  scopes: ["read", "write"];
}]>)

// Or with reference ID
@useAuth(Auth)
@authReferenceId("${{OAUTH_REFERENCE_ID}}")
model Auth is OAuth2Auth<[...]>;
```

## Naming Conventions

### Files
- `main.tsp` - Agent definition
- `actions.tsp` - API operations
- `[feature].tsp` - Additional feature files
- `cards/*.json` - Adaptive Card templates

### TypeSpec Elements
- **Namespaces**: PascalCase (e.g., `CustomerSupportAgent`)
- **Operations**: camelCase (e.g., `listProjects`, `createTicket`)
- **Models**: PascalCase (e.g., `Project`, `TicketResponse`)
- **Model Properties**: camelCase (e.g., `projectId`, `createdDate`)

## Common Patterns

### Multi-Capability Agent
```typescript
@agent("Knowledge Worker", "Description")
@instructions("...")
namespace KnowledgeWorker {
  op webSearch is AgentCapabilities.WebSearch;
  op files is AgentCapabilities.OneDriveAndSharePoint;
  op people is AgentCapabilities.People;
}
```

### CRUD API Plugin
```typescript
namespace ProjectAPI {
  @route("/projects") @get @action
  op list(): Project[];
  
  @route("/projects/{id}") @get @action
  op get(@path id: string): Project;
  
  @route("/projects") @post @action
  @capabilities(#{confirmation: ...})
  op create(@body project: CreateProject): Project;
  
  @route("/projects/{id}") @patch @action
  @capabilities(#{confirmation: ...})
  op update(@path id: string, @body project: UpdateProject): Project;
  
  @route("/projects/{id}") @delete @action
  @capabilities(#{confirmation: ...})
  op delete(@path id: string): void;
}
```

### Adaptive Card Data Binding
```json
{
  "type": "AdaptiveCard",
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "version": "1.5",
  "body": [
    {
      "type": "Container",
      "$data": "${$root}",
      "items": [
        {
          "type": "TextBlock",
          "text": "Title: ${if(title, title, 'N/A')}",
          "wrap": true
        }
      ]
    }
  ]
}
```

## Validation and Testing

### Before Provisioning
1. Run TypeSpec validation: `npm run build` or use Agents Toolkit
2. Check all file paths in `@card` decorators exist
3. Verify authentication references match configuration
4. Ensure capability scoping is appropriate
5. Review instructions for clarity and length

### Testing Strategy
1. **Provision**: Deploy to development environment
2. **Test**: Use Microsoft 365 Copilot at https://m365.cloud.microsoft/chat
3. **Debug**: Enable Copilot developer mode for orchestrator insights
4. **Iterate**: Refine based on actual behavior
5. **Validate**: Test all conversation starters and capabilities

## Performance Optimization

1. **Scope Capabilities**: Don't grant access to all data if only subset needed
2. **Limit Operations**: Only expose API operations the agent actually uses
3. **Efficient Models**: Keep response models focused on necessary data
4. **Card Optimization**: Use conditional rendering (`$when`) in Adaptive Cards
5. **Caching**: Design APIs with appropriate caching headers

## Security Best Practices

1. **Authentication**: Always use authentication for non-public APIs
2. **Scoping**: Limit capability access to minimum required resources
3. **Validation**: Validate all inputs in API operations
4. **Secrets**: Use environment variables for sensitive data
5. **References**: Use `@authReferenceId` for production credentials
6. **Permissions**: Request minimum necessary OAuth scopes

## Error Handling

```typescript
model ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: ErrorDetail[];
  };
}

model ErrorDetail {
  field?: string;
  message: string;
}
```

## Documentation

Include comments in TypeSpec for complex operations:

```typescript
/**
 * Retrieves project details with associated tasks and team members.
 * 
 * @param id - Unique project identifier
 * @param includeArchived - Whether to include archived tasks
 * @returns Complete project information
 */
@route("/projects/{id}")
@get
@action
op getProjectDetails(
  @path id: string,
  @query includeArchived?: boolean
): ProjectDetails;
```

## Common Pitfalls to Avoid

1. ❌ Generic agent names ("Helper Bot")
2. ❌ Vague instructions ("Help users with things")
3. ❌ No capability scoping (accessing all data)
4. ❌ Missing confirmations on destructive operations
5. ❌ Overly complex Adaptive Cards
6. ❌ Hard-coded credentials in TypeSpec files
7. ❌ Missing error response models
8. ❌ Inconsistent naming conventions
9. ❌ Too many capabilities (use only what's needed)
10. ❌ Instructions over 8,000 characters

## Resources

- [TypeSpec Official Docs](https://typespec.io/)
- [Microsoft 365 Copilot Extensibility](https://learn.microsoft.com/microsoft-365-copilot/extensibility/)
- [Agents Toolkit](https://aka.ms/M365AgentsToolkit)
- [Adaptive Cards Designer](https://adaptivecards.io/designer/)

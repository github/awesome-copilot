---
description: 'Best practices and guidelines for developing declarative agents for Microsoft 365 Copilot following schema v1.5 specifications with Microsoft 365 Agents Toolkit integration'
model: GPT-4.1
tools: ['codebase']
---

# Microsoft 365 Declarative Agents Development Guidelines

Comprehensive instructions for developing high-quality declarative agents for Microsoft 365 Copilot using schema v1.5 with Microsoft 365 Agents Toolkit integration.

## Core Development Principles

### Schema v1.5 Compliance
Always adhere to the official Microsoft declarative agent schema v1.5:
```json
{
  "$schema": "https://raw.githubusercontent.com/microsoft/copilot-studio-schemas/main/schemas/v1.5/declarative-copilot.schema.json",
  "version": "v1.0",
  "name": "[Agent Name]",
  "description": "[Agent Description]",
  "instructions": "[Detailed Instructions]",
  "capabilities": [],
  "conversation_starters": []
}
```

### Character Limit Constraints
Strictly enforce character limits:
- **name**: Maximum 100 characters
- **description**: Maximum 1000 characters  
- **instructions**: Maximum 8000 characters
- **conversation_starters.text**: Maximum 100 characters each

### Microsoft 365 Agents Toolkit Integration
Leverage the Microsoft 365 Agents Toolkit (teamsdevapp.ms-teams-vscode-extension) for:
- TypeScript/TypeSpec development with type safety
- Local testing with Agents Playground
- Environment management (dev/staging/production)
- Performance monitoring and optimization
- Automated validation and deployment

## Capability Configuration Guidelines

### 1. WebSearch Capability
Use for real-time information retrieval and current data access:

```json
{
  "type": "WebSearch",
  "configuration": {
    "enabled": true,
    "search_domains": ["specific-domains-if-needed"],
    "result_limit": 10,
    "content_filtering": {
      "safe_search": "strict",
      "relevance_threshold": 0.7
    }
  }
}
```

**Best Practices:**
- Enable only when real-time data is essential
- Configure domain restrictions for enterprise security
- Set appropriate result limits to manage token usage
- Use content filtering for compliance requirements

### 2. OneDriveAndSharePoint Capability
Configure for file operations and content management:

```json
{
  "type": "OneDriveAndSharePoint",
  "configuration": {
    "scopes": [
      "https://graph.microsoft.com/Files.Read",
      "https://graph.microsoft.com/Files.ReadWrite"
    ],
    "file_types": [".docx", ".xlsx", ".pptx", ".pdf"],
    "size_limits": {
      "max_file_size": "10MB",
      "max_concurrent_files": 5
    }
  }
}
```

**Best Practices:**
- Request minimal necessary scopes
- Specify supported file types explicitly
- Set reasonable size limits for performance
- Implement proper error handling for file operations

### 3. GraphConnectors Capability
Integrate custom data sources through Graph Connectors:

```json
{
  "type": "GraphConnectors",
  "configuration": {
    "connection_id": "your-connector-id",
    "entity_types": ["CustomDocument", "KnowledgeArticle"],
    "query_capabilities": {
      "semantic_search": true,
      "faceted_search": true,
      "result_ranking": "relevance"
    }
  }
}
```

**Best Practices:**
- Ensure connector is properly configured and indexed
- Define specific entity types for targeted search
- Enable semantic search for better user experience
- Configure result ranking based on business needs

### 4. Function Capability
Implement custom business logic and API integrations:

```json
{
  "type": "Function",
  "function_definition": {
    "name": "analyze_sales_data",
    "description": "Analyze sales performance metrics and generate insights",
    "parameters": {
      "type": "object",
      "properties": {
        "time_period": {
          "type": "string",
          "description": "Analysis time period (e.g., 'last_quarter', 'ytd')",
          "enum": ["last_month", "last_quarter", "ytd", "custom"]
        },
        "metrics": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": ["revenue", "units_sold", "conversion_rate", "customer_acquisition"]
          },
          "description": "Specific metrics to analyze"
        }
      },
      "required": ["time_period", "metrics"]
    }
  }
}
```

**Best Practices:**
- Use clear, descriptive function names
- Provide comprehensive parameter descriptions
- Define appropriate parameter types and constraints
- Include required field specifications
- Implement robust error handling in function implementation

### 5. MicrosoftGraph Capability
Access Microsoft 365 services and data:

```json
{
  "type": "MicrosoftGraph",
  "configuration": {
    "scopes": [
      "https://graph.microsoft.com/User.Read",
      "https://graph.microsoft.com/Calendars.ReadWrite",
      "https://graph.microsoft.com/Mail.Read"
    ],
    "delegated_permissions": true,
    "api_version": "v1.0"
  }
}
```

**Best Practices:**
- Request only necessary scopes for functionality
- Use delegated permissions for user context
- Specify stable API versions (v1.0) for production
- Handle authentication errors gracefully

## TypeSpec Development Best Practices

### Type-Safe Agent Definitions
Use TypeSpec for type-safe agent development:

```typespec
import "@typespec/http";
import "@microsoft/declarative-agent-manifest";

using Microsoft.DeclarativeAgent;

/** Business Intelligence Agent for sales data analysis */
@DeclarativeAgent
model BusinessIntelligenceAgent {
  /** Agent display name */
  @maxLength(100)
  name: "Sales Analytics Assistant";
  
  /** Agent description for users */
  @maxLength(1000)
  description: "AI-powered assistant for sales data analysis, reporting, and insights generation";
  
  /** Detailed agent instructions */
  @maxLength(8000)
  instructions: `You are a specialized business intelligence assistant focused on sales data analysis...`;
  
  /** Agent capabilities */
  capabilities: [
    FunctionCapability,
    MicrosoftGraphCapability
  ];
  
  /** Pre-defined conversation starters */
  conversation_starters: ConversationStarter[];
}

model FunctionCapability extends Capability {
  type: "Function";
  function_definition: SalesAnalysisFunction;
}

model SalesAnalysisFunction {
  name: "analyze_sales_data";
  description: "Analyze sales performance data and generate insights";
  parameters: SalesAnalysisParameters;
}
```

### Compilation and Validation
Compile TypeSpec to JSON and validate:

```bash
# Compile TypeSpec to JSON manifest
tsp compile models/agent.tsp --emit @microsoft/declarative-agent-manifest

# Validate against schema
teamsapp validate --manifest-path ./dist/manifest.json
```

## Agent Instruction Engineering

### Instruction Structure Template
Follow this structure for comprehensive agent instructions:

```markdown
## Role Definition
You are [specific role] specialized in [domain expertise].

## Core Responsibilities
- [Primary responsibility 1]
- [Primary responsibility 2]
- [Primary responsibility 3]

## Behavioral Guidelines
- Maintain [specific behavior trait]
- Always [specific action requirement]
- Never [specific prohibition]

## Response Format
When responding to user queries:
1. [Step 1 requirement]
2. [Step 2 requirement]
3. [Step 3 requirement]

## Capability Usage
- Use WebSearch for [specific scenarios]
- Use Function capabilities for [specific scenarios]
- Use MicrosoftGraph for [specific scenarios]

## Error Handling
If you encounter issues:
- [Error scenario 1]: [Response strategy]
- [Error scenario 2]: [Response strategy]

## Limitations
- I cannot [specific limitation 1]
- I do not have access to [specific limitation 2]
```

### Token Efficiency Optimization
Optimize instructions for token efficiency:

1. **Use concise language**: Avoid redundant phrases
2. **Prioritize information**: Place most important guidance first
3. **Use structured formatting**: Bullet points and numbered lists
4. **Avoid repetition**: Each instruction should provide unique value
5. **Test token usage**: Monitor actual token consumption in testing

## Conversation Starter Best Practices

### Effective Conversation Starters
Design conversation starters that demonstrate agent capabilities:

```json
{
  "conversation_starters": [
    {
      "text": "Analyze last quarter's sales performance by region"
    },
    {
      "text": "Generate a monthly revenue report with trend analysis"
    },
    {
      "text": "Compare this year's sales metrics to last year"
    },
    {
      "text": "Identify top-performing products and growth opportunities"
    }
  ]
}
```

**Guidelines:**
- **Specific and actionable**: Each starter should trigger a specific workflow
- **Capability demonstration**: Show what the agent can do
- **User language**: Use terminology familiar to target users
- **Varied complexity**: Include simple and complex examples
- **Business value**: Focus on outcomes users care about

## Microsoft 365 Agents Toolkit Workflow

### Development Environment Setup
1. **Install Prerequisites**:
   ```bash
   # Install Teams Toolkit CLI
   npm install -g @microsoft/teamsapp-cli
   
   # Verify installation
   teamsapp --version
   ```

2. **VS Code Extension Setup**:
   - Install Microsoft 365 Agents Toolkit extension
   - Configure workspace settings for declarative agents
   - Set up debugging configuration

3. **Project Initialization**:
   ```bash
   # Create new declarative agent project
   teamsapp new declarative-agent --name "MyBusinessAgent"
   
   # Initialize TypeSpec development
   npm install @typespec/compiler @microsoft/declarative-agent-manifest
   ```

### Local Development and Testing
1. **Agents Playground Integration**:
   - Load manifest in toolkit
   - Test conversation flows interactively
   - Validate capability responses
   - Monitor token usage and performance

2. **Environment Configuration**:
   ```json
   {
     "environments": {
       "development": {
         "manifest_path": "./manifests/dev-manifest.json",
         "test_scenarios": "./test-data/dev-scenarios.json",
         "mock_data": true
       },
       "staging": {
         "manifest_path": "./manifests/staging-manifest.json",
         "test_scenarios": "./test-data/staging-scenarios.json",
         "integration_testing": true
       },
       "production": {
         "manifest_path": "./manifests/prod-manifest.json",
         "monitoring_enabled": true,
         "performance_tracking": true
       }
     }
   }
   ```

3. **Debugging and Troubleshooting**:
   ```typescript
   interface DebuggingConfig {
     log_level: "debug" | "info" | "warn" | "error";
     trace_capability_calls: boolean;
     monitor_token_usage: boolean;
     validate_responses: boolean;
   }
   ```

### Performance Optimization
1. **Token Usage Monitoring**:
   ```typescript
   interface TokenUsageMetrics {
     instruction_tokens: number;
     capability_tokens: number;
     response_tokens: number;
     total_tokens: number;
     optimization_suggestions: string[];
   }
   ```

2. **Response Time Optimization**:
   - Capability ordering optimization
   - Parallel capability execution where possible
   - Caching strategies for repeated queries
   - Connection pooling for external APIs

3. **Memory Management**:
   - Conversation context optimization
   - State management best practices
   - Resource cleanup procedures

## Security and Compliance Guidelines

### Authentication and Authorization
1. **OAuth 2.0 Implementation**:
   ```json
   {
     "authentication": {
       "type": "OAuth2",
       "provider": "Microsoft",
       "scopes": [
         "https://graph.microsoft.com/User.Read",
         "https://graph.microsoft.com/Files.Read"
       ],
       "token_management": {
         "refresh_strategy": "automatic",
         "expiration_handling": "graceful_degradation"
       }
     }
   }
   ```

2. **Scope Minimization**:
   - Request only necessary permissions
   - Document scope justification
   - Implement permission checking
   - Handle scope denial gracefully

### Data Protection
1. **PII Handling**:
   ```typescript
   interface PIIHandlingConfig {
     detection_enabled: boolean;
     redaction_strategy: "mask" | "remove" | "encrypt";
     audit_logging: boolean;
     retention_policy: string;
   }
   ```

2. **Data Encryption**:
   - Encrypt data in transit (TLS 1.3)
   - Encrypt sensitive data at rest
   - Implement key rotation policies
   - Use Azure Key Vault for secrets

### Compliance Framework
1. **Audit Logging**:
   ```json
   {
     "audit_config": {
       "log_user_interactions": true,
       "log_capability_usage": true,
       "log_data_access": true,
       "retention_period": "7_years",
       "compliance_frameworks": ["SOC2", "GDPR", "ISO27001"]
     }
   }
   ```

2. **Compliance Validation**:
   - Regular security assessments
   - Compliance monitoring
   - Incident response procedures
   - Data breach notification protocols

## Testing and Validation Procedures

### Unit Testing
Test individual components:

```typescript
describe('Sales Analysis Agent', () => {
  test('validates manifest schema compliance', () => {
    const manifest = loadManifest('./dist/manifest.json');
    expect(validateSchema(manifest)).toBe(true);
  });
  
  test('respects character limits', () => {
    const manifest = loadManifest('./dist/manifest.json');
    expect(manifest.name.length).toBeLessThanOrEqual(100);
    expect(manifest.description.length).toBeLessThanOrEqual(1000);
    expect(manifest.instructions.length).toBeLessThanOrEqual(8000);
  });
  
  test('validates capability configurations', () => {
    const manifest = loadManifest('./dist/manifest.json');
    manifest.capabilities.forEach(capability => {
      expect(validateCapabilityConfig(capability)).toBe(true);
    });
  });
});
```

### Integration Testing
Test capability interactions:

```typescript
describe('Capability Integration', () => {
  test('function capability responds correctly', async () => {
    const response = await testCapability('Function', {
      function_name: 'analyze_sales_data',
      parameters: { time_period: 'last_quarter', metrics: ['revenue'] }
    });
    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();
  });
  
  test('graph capability handles authentication', async () => {
    const response = await testCapability('MicrosoftGraph', {
      endpoint: '/me',
      method: 'GET'
    });
    expect(response.authenticated).toBe(true);
  });
});
```

### Performance Testing
Validate performance requirements:

```typescript
describe('Performance Requirements', () => {
  test('response time under 3 seconds', async () => {
    const startTime = Date.now();
    const response = await sendMessage('Analyze sales data');
    const responseTime = Date.now() - startTime;
    expect(responseTime).toBeLessThan(3000);
  });
  
  test('token usage within limits', async () => {
    const response = await sendMessage('Generate quarterly report');
    expect(response.token_usage.total).toBeLessThan(4000);
  });
});
```

## Production Deployment Guidelines

### Pre-Deployment Checklist
- [ ] Schema validation passes
- [ ] Character limits respected
- [ ] All capabilities tested individually
- [ ] Integration testing completed
- [ ] Performance benchmarks met
- [ ] Security review completed
- [ ] Compliance validation finished
- [ ] Documentation complete
- [ ] Monitoring configured
- [ ] Rollback plan prepared

### Deployment Pipeline
```yaml
# .github/workflows/deploy-agent.yml
name: Deploy Declarative Agent
on:
  push:
    branches: [main]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Compile TypeSpec
        run: tsp compile models/agent.tsp
      - name: Validate manifest
        run: teamsapp validate --manifest-path ./dist/manifest.json
      - name: Run tests
        run: npm test
  deploy:
    needs: validate
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to staging
        run: teamsapp deploy --env staging
      - name: Run integration tests
        run: npm run test:integration
      - name: Deploy to production
        run: teamsapp deploy --env production
```

### Monitoring and Maintenance
1. **Performance Monitoring**:
   ```json
   {
     "monitoring": {
       "response_time_tracking": true,
       "token_usage_monitoring": true,
       "error_rate_tracking": true,
       "user_satisfaction_metrics": true
     }
   }
   ```

2. **Incident Response**:
   - Automated alerting for failures
   - Escalation procedures
   - Rollback capabilities
   - Post-incident reviews

3. **Continuous Improvement**:
   - Regular performance reviews
   - User feedback integration
   - Capability optimization
   - Security updates

## Common Patterns and Anti-Patterns

### Design Patterns ✅

1. **Single Responsibility Pattern**:
   ```json
   {
     "name": "Sales Analytics Assistant",
     "focus": "sales_data_analysis",
     "capabilities": ["Function", "MicrosoftGraph"]
   }
   ```

2. **Graceful Degradation Pattern**:
   ```typescript
   if (primaryCapabilityFails) {
     return fallbackResponse();
   }
   ```

3. **Progressive Enhancement Pattern**:
   ```json
   {
     "basic_functionality": ["simple_queries"],
     "enhanced_functionality": ["complex_analysis", "visualizations"]
   }
   ```

### Anti-Patterns ❌

1. **Kitchen Sink Anti-Pattern**:
   ```json
   // Don't do this - too many unrelated capabilities
   {
     "capabilities": [
       "WebSearch", "OneDriveAndSharePoint", "GraphConnectors",
       "Function", "MicrosoftGraph"
     ]
   }
   ```

2. **Overly Generic Instructions**:
   ```text
   // Don't do this - too vague
   "You are a helpful assistant that can do many things."
   ```

3. **Character Limit Violations**:
   ```json
   // Don't do this - exceeds limits
   {
     "name": "Super Long Agent Name That Exceeds The Maximum Character Limit Of One Hundred Characters And Should Be Shortened",
     "description": "[description over 1000 characters]"
   }
   ```

Follow these comprehensive guidelines to create high-quality, performant, and secure declarative agents for Microsoft 365 Copilot that provide exceptional user experiences.
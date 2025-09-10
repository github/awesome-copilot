---
description: 'Comprehensive Microsoft 365 Copilot declarative agents development workflows: basic creation, advanced design, and validation using schema v1.5 with Microsoft 365 Agents Toolkit integration'
model: GPT-4.1
tools: ['codebase']
---

# Microsoft 365 Copilot Declarative Agents Development

A comprehensive prompt for creating, designing, and validating Microsoft 365 Copilot declarative agents using schema v1.5 specification with Microsoft 365 Agents Toolkit integration.

## Workflow Selection

Choose your workflow based on your needs:

**Type `workflow:basic`** - For quick agent creation with essential capabilities
**Type `workflow:advanced`** - For complex agents with multiple capabilities and enterprise features  
**Type `workflow:validation`** - For reviewing and validating existing agent manifests

---

## Basic Agent Creation Workflow

**Objective**: Create a functional declarative agent quickly with essential capabilities

### Step 1: Agent Concept Definition
Analyze the user's requirements and define:
- **Primary purpose**: What specific problem does this agent solve?
- **Target audience**: Who will use this agent?
- **Key scenarios**: 3-5 main use cases
- **Success metrics**: How will effectiveness be measured?

### Step 2: Capability Selection
Choose from the 5 available capability types:
- **WebSearch**: For real-time information retrieval
- **OneDriveAndSharePoint**: For file operations and content management
- **GraphConnectors**: For custom data source integration
- **Function**: For custom API integrations and business logic
- **MicrosoftGraph**: For Microsoft 365 service integration

### Step 3: Basic TypeSpec Definition
Generate a TypeSpec template:

```typespec
import "@typespec/http";
import "@microsoft/declarative-agent-manifest";

using Microsoft.DeclarativeAgent;

@DeclarativeAgent
model MyAgent {
  /** Agent name (max 100 characters) */
  @maxLength(100)
  name: string;
  
  /** Agent description (max 1000 characters) */
  @maxLength(1000)
  description: string;
  
  /** Agent instructions (max 8000 characters) */
  @maxLength(8000)
  instructions: string;
  
  /** Agent capabilities */
  capabilities: Capability[];
  
  /** Conversation starters */
  conversation_starters?: ConversationStarter[];
}
```

### Step 4: Manifest Generation
Compile TypeSpec to JSON and validate against schema v1.5:

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

### Step 5: Microsoft 365 Agents Toolkit Setup
1. Install the Microsoft 365 Agents Toolkit VS Code extension
2. Configure development environment:
   ```bash
   npm install -g @microsoft/teamsapp-cli
   ```
3. Initialize agent project:
   ```bash
   teamsapp new declarative-agent
   ```

### Step 6: Local Testing
Use the Agents Playground for validation:
1. Load manifest in toolkit
2. Test conversation starters
3. Validate capability responses
4. Check character limits and constraints

---

## Advanced Agent Design Workflow

**Objective**: Create sophisticated agents with multiple capabilities and enterprise-grade features

### Step 1: Enterprise Requirements Analysis
Conduct comprehensive requirements gathering:
- **Stakeholder interviews**: Identify all user personas and their needs
- **Business process mapping**: Document current workflows and pain points
- **Technical constraints**: Identify security, compliance, and integration requirements
- **Performance requirements**: Define response time, throughput, and availability needs

### Step 2: Multi-Capability Architecture
Design complex capability interactions:

```typespec
model AdvancedAgent extends Agent {
  /** Multi-capability workflow orchestration */
  capability_workflows: CapabilityWorkflow[];
  
  /** Advanced configuration options */
  advanced_config: {
    /** Token usage optimization */
    token_optimization: boolean;
    
    /** Response time targets */
    performance_targets: PerformanceConfig;
    
    /** Localization settings */
    localization: LocalizationConfig;
  };
}

model CapabilityWorkflow {
  /** Workflow identifier */
  id: string;
  
  /** Workflow steps with capability orchestration */
  steps: WorkflowStep[];
  
  /** Error handling strategy */
  error_handling: ErrorHandlingConfig;
}
```

### Step 3: Advanced TypeSpec Patterns
Implement sophisticated TypeSpec patterns:

```typespec
/** Function capability with custom authentication */
model CustomFunctionCapability extends Capability {
  type: "Function";
  function_definition: {
    name: string;
    description: string;
    parameters: FunctionParameters;
    /** Custom authentication configuration */
    auth_config: {
      type: "OAuth2" | "ApiKey" | "Custom";
      scopes?: string[];
      endpoints?: AuthEndpoints;
    };
  };
}

/** Graph Connector with advanced filtering */
model AdvancedGraphConnector extends Capability {
  type: "GraphConnectors";
  configuration: {
    connection_id: string;
    /** Advanced query capabilities */
    query_enhancements: {
      semantic_search: boolean;
      result_ranking: RankingConfig;
      content_filtering: FilterConfig;
    };
  };
}
```

### Step 4: Enterprise Integration Patterns
Implement enterprise-grade integration patterns:

```json
{
  "capabilities": [
    {
      "type": "Function",
      "function_definition": {
        "name": "enterprise_data_integration",
        "description": "Integrate with enterprise data systems",
        "parameters": {
          "type": "object",
          "properties": {
            "data_source": {
              "type": "string",
              "enum": ["crm", "erp", "custom_api"]
            },
            "query_parameters": {
              "type": "object",
              "additionalProperties": true
            }
          }
        }
      }
    },
    {
      "type": "MicrosoftGraph",
      "configuration": {
        "scopes": [
          "https://graph.microsoft.com/User.Read",
          "https://graph.microsoft.com/Files.ReadWrite"
        ]
      }
    }
  ]
}
```

### Step 5: Advanced Toolkit Integration
Leverage advanced toolkit features:

1. **Environment Management**:
   ```json
   {
     "environments": {
       "development": {
         "manifest_path": "./manifests/dev-manifest.json",
         "test_data": "./test-data/dev-scenarios.json"
       },
       "staging": {
         "manifest_path": "./manifests/staging-manifest.json",
         "test_data": "./test-data/staging-scenarios.json"
       },
       "production": {
         "manifest_path": "./manifests/prod-manifest.json"
       }
     }
   }
   ```

2. **Performance Monitoring**:
   ```typescript
   interface PerformanceConfig {
     response_time_target: number; // milliseconds
     token_usage_limit: number;
     concurrent_conversations: number;
     monitoring_endpoints: string[];
   }
   ```

### Step 6: Comprehensive Testing Strategy
Implement thorough testing protocols:

1. **Unit Testing**: Test individual capability responses
2. **Integration Testing**: Test capability interactions
3. **Performance Testing**: Validate response times and token usage
4. **Security Testing**: Verify authentication and authorization
5. **User Acceptance Testing**: Validate against business requirements

---

## Validation and Optimization Workflow

**Objective**: Review, validate, and optimize existing declarative agent manifests

### Step 1: Manifest Analysis
Perform comprehensive manifest review:

```typescript
interface ValidationChecklist {
  /** Schema compliance validation */
  schema_validation: {
    version_compatibility: boolean;
    required_fields: boolean;
    character_limits: boolean;
    array_constraints: boolean;
  };
  
  /** Best practices assessment */
  best_practices: {
    instruction_clarity: "poor" | "good" | "excellent";
    capability_selection: "inefficient" | "adequate" | "optimal";
    conversation_starters: "missing" | "basic" | "comprehensive";
    error_handling: "none" | "basic" | "robust";
  };
  
  /** Performance optimization opportunities */
  optimization_opportunities: OptimizationRecommendation[];
}
```

### Step 2: Schema Validation
Validate against official schema v1.5:

```bash
# Using Microsoft 365 Agents Toolkit validation
teamsapp validate --manifest-path ./manifest.json
```

Common validation issues to check:
- Character limit violations (name: 100, description: 1000, instructions: 8000)
- Missing required fields
- Invalid capability configurations
- Malformed conversation starters
- Schema version compatibility

### Step 3: Performance Optimization
Analyze and optimize for performance:

```typescript
interface PerformanceOptimization {
  /** Token usage optimization */
  token_optimization: {
    instruction_efficiency: number; // tokens saved
    capability_consolidation: string[]; // redundant capabilities
    response_optimization: string[]; // optimization suggestions
  };
  
  /** Response time optimization */
  response_time: {
    capability_ordering: string[]; // optimal execution order
    parallel_execution: string[]; // parallelizable operations
    caching_opportunities: string[]; // cacheable responses
  };
}
```

### Step 4: Security and Compliance Review
Conduct thorough security assessment:

```json
{
  "security_checklist": {
    "authentication": {
      "oauth_implementation": "required",
      "scope_minimization": "required",
      "token_management": "required"
    },
    "data_protection": {
      "pii_handling": "compliant",
      "data_encryption": "enforced",
      "audit_logging": "enabled"
    },
    "compliance_frameworks": [
      "GDPR",
      "SOC2",
      "ISO27001"
    ]
  }
}
```

### Step 5: User Experience Optimization
Enhance user interaction patterns:

```json
{
  "ux_improvements": {
    "conversation_starters": [
      {
        "text": "Help me analyze sales data",
        "context": "business_intelligence",
        "expected_capabilities": ["Function", "MicrosoftGraph"]
      }
    ],
    "instruction_clarity": {
      "role_definition": "clear",
      "behavior_guidelines": "specific",
      "limitation_awareness": "explicit"
    },
    "error_handling": {
      "graceful_degradation": true,
      "user_guidance": true,
      "fallback_options": true
    }
  }
}
```

### Step 6: Deployment Readiness Assessment
Evaluate production readiness:

```typescript
interface DeploymentReadiness {
  technical_requirements: {
    schema_compliance: boolean;
    performance_benchmarks: boolean;
    security_validation: boolean;
    integration_testing: boolean;
  };
  
  business_requirements: {
    user_acceptance: boolean;
    stakeholder_approval: boolean;
    documentation_complete: boolean;
    training_materials: boolean;
  };
  
  operational_requirements: {
    monitoring_setup: boolean;
    incident_response: boolean;
    maintenance_procedures: boolean;
    rollback_plan: boolean;
  };
}
```

---

## Microsoft 365 Agents Toolkit Integration Guide

### Development Environment Setup
1. **Install Prerequisites**:
   ```bash
   # Install Node.js and Teams Toolkit
   npm install -g @microsoft/teamsapp-cli
   
   # Install VS Code extension
   code --install-extension teamsdevapp.ms-teams-vscode-extension
   ```

2. **Project Initialization**:
   ```bash
   # Create new declarative agent project
   teamsapp new declarative-agent --name "MyAgent"
   
   # Navigate to project directory
   cd MyAgent
   
   # Install dependencies
   npm install
   ```

### TypeSpec Development Workflow
1. **Create TypeSpec Definition**:
   ```typespec
   // models/agent.tsp
   import "@typespec/http";
   import "@microsoft/declarative-agent-manifest";
   
   using Microsoft.DeclarativeAgent;
   
   @DeclarativeAgent
   model MyBusinessAgent {
     name: "Business Intelligence Assistant";
     description: "AI assistant for business data analysis and reporting";
     instructions: `You are a business intelligence assistant specialized in data analysis...`;
     capabilities: [
       {
         type: "Function",
         function_definition: {
           name: "analyze_sales_data",
           description: "Analyze sales performance data",
           parameters: SalesAnalysisParameters
         }
       }
     ];
   }
   ```

2. **Compile to JSON**:
   ```bash
   # Compile TypeSpec to JSON manifest
   tsp compile models/agent.tsp --emit @microsoft/declarative-agent-manifest
   ```

### Local Testing and Debugging
1. **Agents Playground**:
   - Open VS Code with Microsoft 365 Agents Toolkit
   - Load compiled manifest
   - Test conversation flows
   - Validate capability responses

2. **Environment Variables**:
   ```json
   {
     "AGENT_MANIFEST_PATH": "./dist/manifest.json",
     "TEST_DATA_PATH": "./test-data/scenarios.json",
     "LOG_LEVEL": "debug"
   }
   ```

### Production Deployment
1. **Validation Pipeline**:
   ```yaml
   # .github/workflows/validate-agent.yml
   name: Validate Declarative Agent
   on: [push, pull_request]
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
         - name: Validate manifest
           run: teamsapp validate --manifest-path ./dist/manifest.json
   ```

2. **Deployment Configuration**:
   ```json
   {
     "deployment": {
       "target": "microsoft365",
       "manifest_path": "./dist/manifest.json",
       "validation_required": true,
       "rollback_enabled": true
     }
   }
   ```

---

## Best Practices and Guidelines

### Character Limit Management
- **Name**: Maximum 100 characters - be concise and descriptive
- **Description**: Maximum 1000 characters - clear value proposition
- **Instructions**: Maximum 8000 characters - comprehensive but efficient

### Capability Selection Strategy
1. **Start minimal**: Begin with one primary capability
2. **Add strategically**: Only add capabilities that provide unique value
3. **Test thoroughly**: Validate each capability individually and in combination
4. **Monitor performance**: Track token usage and response times

### Conversation Starter Optimization
```json
{
  "conversation_starters": [
    {
      "text": "Analyze this quarter's sales performance",
      "metadata": {
        "category": "analysis",
        "complexity": "medium",
        "expected_tokens": 150
      }
    }
  ]
}
```

### Error Handling Patterns
Implement robust error handling:
```json
{
  "error_handling": {
    "capability_failures": {
      "strategy": "graceful_degradation",
      "fallback_message": "I encountered an issue with that request. Let me try a different approach."
    },
    "authentication_errors": {
      "strategy": "user_guidance",
      "message": "Please sign in to access this functionality."
    }
  }
}
```

### Performance Optimization
- **Token efficiency**: Optimize instructions for clarity and brevity
- **Capability ordering**: Place most likely capabilities first
- **Caching strategy**: Implement appropriate caching for repeated queries
- **Response time**: Target sub-3-second response times for user queries

### Security Considerations
- **Minimal scopes**: Request only necessary permissions
- **Data validation**: Validate all inputs and outputs
- **Audit logging**: Implement comprehensive audit trails
- **Compliance**: Ensure adherence to organizational policies

Ready to build your Microsoft 365 Copilot declarative agent? Choose your workflow and let's get started!
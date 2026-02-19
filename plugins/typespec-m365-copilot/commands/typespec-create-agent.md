---
mode: 'agent'
tools: ['changes', 'search/codebase', 'edit/editFiles', 'problems']
description: 'Generate a complete TypeSpec declarative agent with instructions, capabilities, and conversation starters for Microsoft 365 Copilot'
model: 'gpt-4.1'
tags: [typespec, m365-copilot, declarative-agent, agent-development]
---

# Create TypeSpec Declarative Agent

Create a complete TypeSpec declarative agent for Microsoft 365 Copilot with the following structure:

## Requirements

Generate a `main.tsp` file with:

1. **Agent Declaration**
   - Use `@agent` decorator with a descriptive name and description
   - Name should be 100 characters or less
   - Description should be 1,000 characters or less

2. **Instructions**
   - Use `@instructions` decorator with clear behavioral guidelines
   - Define the agent's role, expertise, and personality
   - Specify what the agent should and shouldn't do
   - Keep under 8,000 characters

3. **Conversation Starters**
   - Include 2-4 `@conversationStarter` decorators
   - Each with a title and example query
   - Make them diverse and showcase different capabilities

4. **Capabilities** (based on user needs)
   - `WebSearch` - for web content with optional site scoping
   - `OneDriveAndSharePoint` - for document access with URL filtering
   - `TeamsMessages` - for Teams channel/chat access
   - `Email` - for email access with folder filtering
   - `People` - for organization people search
   - `CodeInterpreter` - for Python code execution
   - `GraphicArt` - for image generation
   - `GraphConnectors` - for Copilot connector content
   - `Dataverse` - for Dataverse data access
   - `Meetings` - for meeting content access

## Template Structure

```typescript
import "@typespec/http";
import "@typespec/openapi3";
import "@microsoft/typespec-m365-copilot";

using TypeSpec.Http;
using TypeSpec.M365.Copilot.Agents;

@agent({
  name: "[Agent Name]",
  description: "[Agent Description]"
})
@instructions("""
  [Detailed instructions about agent behavior, role, and guidelines]
""")
@conversationStarter(#{
  title: "[Starter Title 1]",
  text: "[Example query 1]"
})
@conversationStarter(#{
  title: "[Starter Title 2]",
  text: "[Example query 2]"
})
namespace [AgentName] {
  // Add capabilities as operations here
  op capabilityName is AgentCapabilities.[CapabilityType]<[Parameters]>;
}
```

## Best Practices

- Use descriptive, role-based agent names (e.g., "Customer Support Assistant", "Research Helper")
- Write instructions in second person ("You are...")
- Be specific about the agent's expertise and limitations
- Include diverse conversation starters that showcase different features
- Only include capabilities the agent actually needs
- Scope capabilities (URLs, folders, etc.) when possible for better performance
- Use triple-quoted strings for multi-line instructions

## Examples

Ask the user:
1. What is the agent's purpose and role?
2. What capabilities does it need?
3. What knowledge sources should it access?
4. What are typical user interactions?

Then generate the complete TypeSpec agent definition.

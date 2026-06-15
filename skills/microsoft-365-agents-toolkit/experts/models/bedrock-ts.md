# bedrock-ts

## purpose

Calling AI models hosted on AWS Bedrock from TypeScript. Covers the Converse API (multi-model), Bedrock Agents, Knowledge Bases, guardrails, and IAM-based authentication. Supports Anthropic Claude, Meta Llama, Cohere, Amazon Titan, and other Bedrock-hosted models.

## rules

1. **Use `@aws-sdk/client-bedrock-runtime` for model invocation.** This is the primary package for calling models. `npm install @aws-sdk/client-bedrock-runtime`. For agent/KB management, use `@aws-sdk/client-bedrock-agent` and `@aws-sdk/client-bedrock-agent-runtime`. [docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/bedrock-runtime](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/bedrock-runtime)
2. **Prefer the Converse API over InvokeModel.** `ConverseCommand` provides a unified interface across all Bedrock models — same request/response format regardless of provider. `InvokeModelCommand` requires provider-specific request bodies. [docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference-call.html](https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference-call.html)
3. **Authentication uses AWS IAM, not API keys.** Bedrock uses standard AWS credential resolution: environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`), IAM roles, SSO, or credential files. No Anthropic/OpenAI-style API keys. [docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html)
4. **Model IDs follow the format `provider.model-name`.** Examples: `anthropic.claude-3-5-sonnet-20241022-v2:0`, `meta.llama3-2-90b-instruct-v1:0`, `amazon.titan-text-express-v1`. Check the Bedrock console for available model IDs in your region. [docs.aws.amazon.com/bedrock/latest/userguide/model-ids.html](https://docs.aws.amazon.com/bedrock/latest/userguide/model-ids.html)
5. **You must enable model access before use.** Go to the Bedrock console → Model access → Request access for each model. This is a one-time per-account setup. Without it, API calls return `AccessDeniedException`. [docs.aws.amazon.com/bedrock/latest/userguide/model-access.html](https://docs.aws.amazon.com/bedrock/latest/userguide/model-access.html)
6. **Region matters for model availability.** Not all models are available in all regions. Claude is typically in `us-east-1` and `us-west-2`. Llama and Titan have broader availability. Check the model access page in your target region.
7. **Use `ConverseStreamCommand` for streaming.** Returns a stream of events. Iterate with `for await (const event of response.stream)` and check `event.contentBlockDelta?.delta?.text` for incremental text. [docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference-call-streaming.html](https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference-call-streaming.html)
8. **Tool use with Converse API follows a unified format.** Define `toolConfig` with `tools` array. The model returns `toolUse` content blocks. Send `toolResult` blocks back. This works identically across all Bedrock models that support tool use. [docs.aws.amazon.com/bedrock/latest/userguide/tool-use.html](https://docs.aws.amazon.com/bedrock/latest/userguide/tool-use.html)
9. **Bedrock Agents provide autonomous tool orchestration.** Unlike raw tool use (where your code manages the loop), Bedrock Agents handle the tool-call loop internally. You invoke the agent and get a final answer. Use `@aws-sdk/client-bedrock-agent-runtime` with `InvokeAgentCommand`. [docs.aws.amazon.com/bedrock/latest/userguide/agents.html](https://docs.aws.amazon.com/bedrock/latest/userguide/agents.html)
10. **Attach guardrails to filter content.** Pass `guardrailConfig: { guardrailIdentifier, guardrailVersion }` in the Converse request to apply content filters, denied topics, and PII redaction. [docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html)

## patterns

### Converse API — basic chat completion

```typescript
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

const client = new BedrockRuntimeClient({ region: 'us-east-1' });

const response = await client.send(new ConverseCommand({
  modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
  messages: [
    {
      role: 'user',
      content: [{ text: userMessage }],
    },
  ],
  system: [{ text: 'You are a helpful assistant.' }],
  inferenceConfig: {
    maxTokens: 1024,
    temperature: 0.7,
  },
}));

const reply = response.output?.message?.content?.[0]?.text ?? '';
```

### Converse API — streaming

```typescript
import { BedrockRuntimeClient, ConverseStreamCommand } from '@aws-sdk/client-bedrock-runtime';

const client = new BedrockRuntimeClient({ region: 'us-east-1' });

const response = await client.send(new ConverseStreamCommand({
  modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
  messages: [{ role: 'user', content: [{ text: userMessage }] }],
  system: [{ text: 'You are a helpful assistant.' }],
  inferenceConfig: { maxTokens: 1024 },
}));

for await (const event of response.stream!) {
  if (event.contentBlockDelta?.delta?.text) {
    process.stdout.write(event.contentBlockDelta.delta.text);
  }
}
```

### Tool use with Converse API

```typescript
const response = await client.send(new ConverseCommand({
  modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
  messages: [{ role: 'user', content: [{ text: 'What is the weather in Seattle?' }] }],
  toolConfig: {
    tools: [{
      toolSpec: {
        name: 'get_weather',
        description: 'Get current weather for a location',
        inputSchema: {
          json: {
            type: 'object',
            properties: { location: { type: 'string', description: 'City name' } },
            required: ['location'],
          },
        },
      },
    }],
  },
}));

// Check for tool use
const toolUseBlock = response.output?.message?.content?.find((b) => b.toolUse);
if (toolUseBlock?.toolUse) {
  const result = await executeFunction(toolUseBlock.toolUse.name!, toolUseBlock.toolUse.input);

  const followUp = await client.send(new ConverseCommand({
    modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    messages: [
      { role: 'user', content: [{ text: 'What is the weather in Seattle?' }] },
      { role: 'assistant', content: response.output!.message!.content! },
      {
        role: 'user',
        content: [{
          toolResult: {
            toolUseId: toolUseBlock.toolUse.toolUseId!,
            content: [{ text: JSON.stringify(result) }],
          },
        }],
      },
    ],
    toolConfig: { tools: [/* same tools */] },
  }));
}
```

### Invoke a Bedrock Agent

```typescript
import { BedrockAgentRuntimeClient, InvokeAgentCommand } from '@aws-sdk/client-bedrock-agent-runtime';

const agentClient = new BedrockAgentRuntimeClient({ region: 'us-east-1' });

const response = await agentClient.send(new InvokeAgentCommand({
  agentId: process.env.BEDROCK_AGENT_ID,
  agentAliasId: process.env.BEDROCK_AGENT_ALIAS_ID,
  sessionId: `session-${userId}`,
  inputText: userMessage,
}));

let agentReply = '';
for await (const event of response.completion!) {
  if (event.chunk?.bytes) {
    agentReply += new TextDecoder().decode(event.chunk.bytes);
  }
}
```

## pitfalls

- **`AccessDeniedException` on first call.** You must enable model access in the Bedrock console before API calls work. This is per-account, per-region.
- **Wrong region.** Claude models are often only available in `us-east-1` and `us-west-2`. Creating a client in `eu-west-1` will fail for Claude.
- **Using `InvokeModel` instead of `Converse`.** `InvokeModel` requires provider-specific JSON payloads (Anthropic format, Titan format, etc.). `Converse` abstracts this — always prefer it.
- **Content block structure.** Converse API messages use `content: [{ text: '...' }]` (array of content blocks), not `content: '...'` (plain string). Missing the array wrapper causes validation errors.
- **Forgetting `system` is an array.** Converse API takes `system: [{ text: '...' }]`, not `system: '...'`.
- **Agent session management.** Bedrock Agents maintain conversation state per `sessionId`. Use consistent session IDs for multi-turn conversations, unique IDs for fresh conversations.
- **IAM policy missing Bedrock permissions.** The calling role needs `bedrock:InvokeModel`, `bedrock:Converse`, or `bedrock:InvokeAgent`. Without these, you get authorization errors.

## references

- [AWS SDK for JS v3 — BedrockRuntimeClient](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/bedrock-runtime)
- [Converse API — User Guide](https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference-call.html)
- [Bedrock Tool Use](https://docs.aws.amazon.com/bedrock/latest/userguide/tool-use.html)
- [Bedrock Agents](https://docs.aws.amazon.com/bedrock/latest/userguide/agents.html)
- [Bedrock Model IDs](https://docs.aws.amazon.com/bedrock/latest/userguide/model-ids.html)
- [Bedrock Guardrails](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html)

## instructions

This expert covers AWS Bedrock model invocation and agent usage from TypeScript. Use it when the developer is calling models through Bedrock (not the direct Anthropic API). For direct Anthropic API access, see `anthropic-ts.md`.

Pair with: `anthropic-ts.md` (direct Anthropic comparison), `../deploy/aws-cli-reference-ts.md` (Bedrock CLI commands for provisioning), `../deploy/aws-bot-deploy-ts.md` (Lambda/ECS deployment), `../security/secrets-ts.md` (IAM auth patterns).

## research

Deep Research prompt:

"Write a micro expert on using AWS Bedrock from TypeScript. Cover: @aws-sdk/client-bedrock-runtime Converse API vs InvokeModel, ConverseStreamCommand for streaming, tool use with toolConfig, IAM authentication, model ID formats, Bedrock Agents with InvokeAgentCommand, Knowledge Bases with RetrieveAndGenerateCommand, guardrails, model access enablement, region availability, and error handling."

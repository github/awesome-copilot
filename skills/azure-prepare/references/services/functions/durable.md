# Durable Functions

Long-running orchestrations with checkpointing and state management.

## When to Use

- Multi-step workflows
- Fan-out/fan-in patterns
- Human interaction workflows
- Long-running processes

## Orchestrator Pattern

```javascript
const df = require('durable-functions');

module.exports = df.orchestrator(function* (context) {
    const result1 = yield context.df.callActivity('Step1');
    const result2 = yield context.df.callActivity('Step2', result1);
    return result2;
});
```

## Activity Function

```javascript
module.exports = async function (context, input) {
    return `Processed: ${input}`;
};
```

## Client Starter

```javascript
const df = require('durable-functions');

module.exports = async function (context, req) {
    const client = df.getClient(context);
    const instanceId = await client.startNew('OrchestratorFunction', undefined, req.body);
    return client.createCheckStatusResponse(context.bindingData.req, instanceId);
};
```

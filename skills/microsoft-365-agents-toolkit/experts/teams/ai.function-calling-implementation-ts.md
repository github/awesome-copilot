# ai.function-calling-implementation-ts

## purpose

Implementing .function() handlers: registration, typed parameters, return values, and error handling.

## rules

1. Register functions on a `ChatPrompt` instance using the `.function(name, description, schema, handler)` chain API. Each call returns the prompt so you can chain multiple `.function()` calls fluently. Import `ChatPrompt` from `@microsoft/teams.ai`.
2. For simple functions with no parameters, omit the schema argument entirely and pass only `(name, description, handler)`. The handler receives no arguments and returns a value directly.
3. For typed parameter functions, provide a JSON Schema object as the third argument. Supported schema types are `string`, `number`, `integer`, `boolean`, `object`, `array`, and `null`. Always include `required` for mandatory fields.
4. Handlers can be synchronous or `async`. Async handlers must return a `Promise`. The return value is serialized and sent back to the LLM as the function result. Return structured objects when the LLM needs rich context; return simple strings for status confirmations.
5. Auto function calling is enabled by default. When `prompt.send()` is called, the SDK automatically executes matched functions and feeds results back to the LLM in a loop until the LLM produces a final text response.
6. To disable auto execution, pass `{ autoFunctionCalling: false }` as the second argument to `prompt.send()`. The response object will then contain a `function_calls` array you can inspect and execute manually.
7. Wrap handler bodies in try/catch and return descriptive error strings (e.g., `'Error: Pokemon not found'`) rather than throwing. Thrown exceptions break the auto-calling loop and surface as unhandled errors.
8. Use `.use(otherPrompt)` to compose sub-prompts. The parent prompt inherits all functions registered on the child prompt, enabling modular function libraries.
9. Keep function names short, camelCase, and descriptive. The LLM uses the `name` and `description` to decide when to call a function, so a clear description is critical for reliable tool selection.
10. Never register functions with side effects (database writes, API mutations) without confirming intent in the description. The LLM may call functions speculatively during auto function calling.

## patterns

### Simple function with no parameters

```typescript
import { ChatPrompt } from '@microsoft/teams.ai';
import { OpenAIChatModel } from '@microsoft/teams.openai';

const model = new OpenAIChatModel({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o',
});

let lightIsOn = false;

const prompt = new ChatPrompt({ model, instructions: 'You control smart home lights.' })
  .function('getLightStatus', 'Get the current light status', () => {
    return lightIsOn;
  })
  .function('turnOnLights', 'Turn the lights on', () => {
    lightIsOn = true;
    return 'Lights turned on';
  });

// Auto function calling (default): LLM calls functions and incorporates results
const response = await prompt.send('Are the lights on?');
console.log(response.content); // "The lights are currently off."
```

### Typed parameter function with async handler

```typescript
const prompt = new ChatPrompt({ model, instructions: 'You are a Pokemon expert.' })
  .function(
    'searchPokemon',
    'Search for a Pokemon by name',
    {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Pokemon name' },
      },
      required: ['name'],
    },
    async ({ name }: { name: string }) => {
      try {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
        if (!res.ok) return `Error: Pokemon "${name}" not found`;
        return await res.json();
      } catch (err) {
        return `Error: Failed to search for "${name}"`;
      }
    }
  );

const response = await prompt.send('What Pokemon is #25?');
```

### Manual function calling and sub-prompt composition

```typescript
// Manual: inspect function_calls without auto-executing
const response = await prompt.send('What Pokemon is #25?', {
  autoFunctionCalling: false,
});

if (response.function_calls) {
  for (const call of response.function_calls) {
    console.log(call.name, call.arguments);
    // call.name = 'searchPokemon', call.arguments = { name: 'pikachu' }
  }
}

// Sub-prompt composition: modular function libraries
const weatherPrompt = new ChatPrompt({ model, instructions: 'Weather helper' })
  .function(
    'getWeather',
    'Get weather for a city',
    {
      type: 'object',
      properties: {
        city: { type: 'string', description: 'City name' },
        units: { type: 'string', description: 'Temperature units: celsius or fahrenheit' },
      },
      required: ['city'],
    },
    async ({ city }: { city: string }) => {
      return { city, temp: 72, condition: 'sunny' };
    }
  );

const mainPrompt = new ChatPrompt({ model, instructions: 'Main assistant' })
  .use(weatherPrompt); // Inherits weather functions
```

## pitfalls

- **Throwing exceptions in handlers**: Unhandled throws break the auto-calling loop. Always catch errors inside the handler and return a descriptive error string so the LLM can report the failure gracefully.
- **Missing `required` in schema**: If you omit the `required` array, the LLM may call the function without mandatory parameters, producing undefined values in your handler.
- **Overly generic function names**: Names like `getData` or `run` give the LLM insufficient signal. Use specific names like `searchPokemon` or `getWeather` so the LLM selects the right tool.
- **Side effects during auto calling**: The LLM may call a function multiple times in a single turn. Functions that mutate state (write to DB, send email) should be idempotent or guarded against duplicate execution.
- **Forgetting `autoFunctionCalling: false`**: If you intend to inspect `function_calls` manually but forget to disable auto calling, the SDK will execute the functions automatically and you will only see the final text response.
- **Returning non-serializable values**: Handler return values are serialized to JSON. Returning class instances, circular references, or `undefined` can produce unexpected results. Return plain objects or strings.
- **Schema type mismatches**: Using `type: 'int'` instead of `type: 'integer'` silently fails validation. Stick to the seven supported JSON Schema types.

## references

- [Teams AI Library v2 -- GitHub](https://github.com/microsoft/teams.ts)
- [OpenAI Function Calling Guide](https://platform.openai.com/docs/guides/function-calling)
- [JSON Schema Specification](https://json-schema.org/understanding-json-schema/)
- [@microsoft/teams.ai -- npm](https://www.npmjs.com/package/@microsoft/teams.ai)

## instructions

This expert covers implementing function calling on `ChatPrompt` in Teams AI v2. Use it when you need to:

- Register functions with `.function(name, description, schema, handler)` on a ChatPrompt
- Define typed parameter schemas using JSON Schema
- Handle async operations (API calls, database queries) inside function handlers
- Choose between auto function calling (default) and manual inspection of `function_calls`
- Compose modular function libraries using `.use()` sub-prompts
- Handle errors gracefully inside function handlers

Pair with `ai.function-calling-design-ts.md` for schema design principles, `ai.chatprompt-basics-ts.md` for prompt.send() options, and `mcp.expose-chatprompt-tools-ts.md` for bridging functions to MCP tools.

## research

Deep Research prompt:

"Write a micro expert on implementing function calling in Teams ChatPrompt (TypeScript). Cover chaining .function calls, handler signatures, async handlers, autoFunctionCalling defaults, manual inspection of function_calls, and error handling. Include canonical patterns for: read-only tools, state-mutating tools, and tools that call external APIs."

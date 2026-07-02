# ai.function-calling-design-ts

## purpose

Designing AI functions for Teams AI v2: naming conventions, parameter schemas, descriptions, and composition patterns.

## rules

1. Name functions with `camelCase` verbs that clearly describe the action: `getWeather`, `searchDocuments`, `createTicket`. The LLM uses the function name as a primary signal for when to call it. Avoid generic names like `doAction` or `process`. [OpenAI -- Function Calling](https://platform.openai.com/docs/guides/function-calling)
2. Write function descriptions from the LLM's perspective -- explain what the function does and when to use it. Good: `'Search the knowledge base for documents matching a query'`. Bad: `'Calls the search API'`. The description is part of the system prompt the model sees. [OpenAI -- Function Calling](https://platform.openai.com/docs/guides/function-calling)
3. Define parameter schemas using JSON Schema with `type: 'object'` at the root. Supported property types are `string`, `number`, `integer`, `boolean`, `object`, `array`, and `null`. Always include `description` on every property. [json-schema.org](https://json-schema.org/)
4. Mark parameters as required in the `required` array. Only include parameters that the function truly cannot operate without. Optional parameters give the LLM flexibility to omit them. [OpenAI -- Function Calling](https://platform.openai.com/docs/guides/function-calling)
5. Use `enum` constraints on string parameters when there is a fixed set of valid values (e.g., `{ type: 'string', enum: ['celsius', 'fahrenheit'] }`). This prevents the LLM from hallucinating invalid values. [json-schema.org -- enum](https://json-schema.org/understanding-json-schema/reference/generic.html)
6. Keep the total number of functions per prompt under 20. Each function definition consumes tokens in every request. Too many functions slow down inference and increase cost. Group related operations or use sub-prompts via `.use()`. [OpenAI -- Function Calling Best Practices](https://platform.openai.com/docs/guides/function-calling)
7. Use `.use(otherPrompt)` to compose function sets from separate ChatPrompt instances. This enables modular organization -- e.g., a `weatherPrompt` and a `calendarPrompt` composed into a `mainPrompt`. The main prompt inherits all functions from sub-prompts. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
8. For functions with no parameters, omit the schema argument entirely. The `.function(name, description, handler)` three-argument overload registers a zero-parameter function. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
9. Return structured data (objects, arrays) from function handlers -- the SDK serializes them to JSON for the LLM. Return human-readable strings for simple status messages. Never return `undefined`. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
10. Decide between auto and manual function calling at design time. Use auto (default) for straightforward tool use where the LLM should handle the full loop. Use manual (`autoFunctionCalling: false`) when you need to validate, log, or gate function calls before execution. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)

## patterns

### Well-designed function schema with enum and optional fields

```typescript
import { ChatPrompt } from '@microsoft/teams.ai';

const prompt = new ChatPrompt({ model, instructions: 'You help users find weather information.' })
  .function(
    'getWeather',
    'Get the current weather for a city. Use celsius unless the user specifies fahrenheit.',
    {
      type: 'object',
      properties: {
        city: {
          type: 'string',
          description: 'The city name, e.g. "London" or "New York"',
        },
        units: {
          type: 'string',
          description: 'Temperature units',
          enum: ['celsius', 'fahrenheit'],
        },
      },
      required: ['city'],
    },
    async ({ city, units }: { city: string; units?: string }) => {
      const u = units || 'celsius';
      const res = await fetch(`https://api.weather.example.com/${city}?units=${u}`);
      return await res.json();
    }
  );
```

### Composing function sets with .use()

```typescript
import { ChatPrompt } from '@microsoft/teams.ai';

// Separate prompt for weather functions
const weatherPrompt = new ChatPrompt({ model, instructions: 'Weather tools' })
  .function('getWeather', 'Get weather for a city', {
    type: 'object',
    properties: { city: { type: 'string', description: 'City name' } },
    required: ['city'],
  }, async ({ city }: { city: string }) => {
    return { temp: 22, condition: 'sunny', city };
  });

// Separate prompt for calendar functions
const calendarPrompt = new ChatPrompt({ model, instructions: 'Calendar tools' })
  .function('listEvents', 'List upcoming calendar events', {
    type: 'object',
    properties: {
      days: { type: 'integer', description: 'Number of days ahead to check (1-30)' },
    },
    required: ['days'],
  }, async ({ days }: { days: number }) => {
    return [{ title: 'Team standup', date: '2025-01-15', time: '09:00' }];
  });

// Main prompt composes both function sets
const mainPrompt = new ChatPrompt({
  model,
  instructions: 'You are a personal assistant with weather and calendar capabilities.',
})
  .use(weatherPrompt)
  .use(calendarPrompt);
```

### Zero-parameter function and state-modifying function

```typescript
import { ChatPrompt } from '@microsoft/teams.ai';

let lightIsOn = false;

const prompt = new ChatPrompt({
  model,
  instructions: 'You control smart home lights. Report status when asked.',
})
  // Zero-parameter function: no schema argument
  .function('getLightStatus', 'Get the current light on/off status', () => {
    return { isOn: lightIsOn };
  })
  // State-modifying function
  .function(
    'setLight',
    'Turn the light on or off',
    {
      type: 'object',
      properties: {
        state: {
          type: 'string',
          description: 'Desired light state',
          enum: ['on', 'off'],
        },
      },
      required: ['state'],
    },
    ({ state }: { state: 'on' | 'off' }) => {
      lightIsOn = state === 'on';
      return `Light turned ${state}`;
    }
  );
```

## pitfalls

- **Vague function names**: Names like `handleRequest` or `getData` give the LLM no semantic signal. Use specific verb-noun pairs: `searchProducts`, `sendEmail`, `getOrderStatus`.
- **Missing `description` on schema properties**: Without property descriptions, the LLM guesses what values to pass. Always describe expected format, range, and examples.
- **Too many functions**: Registering 30+ functions bloats every request with function definitions. Split into sub-prompts with `.use()` or create specialized prompts for different conversation flows.
- **Returning undefined from handlers**: If a function handler returns `undefined`, the LLM receives no result and may retry or hallucinate. Always return a value, even if it is an empty string or `{ success: true }`.
- **Not using `required` array**: Omitting the `required` array means all parameters are optional. The LLM may skip parameters you assumed would always be provided.
- **Deeply nested schemas**: Complex nested `object` schemas with multiple levels are harder for the LLM to fill correctly. Flatten when possible or break into multiple simpler functions.
- **Enum values not matching descriptions**: If the enum is `['c', 'f']` but the description says "celsius or fahrenheit", the LLM may hallucinate `'celsius'` instead of `'c'`. Keep enum values readable.

## references

- [OpenAI -- Function Calling Guide](https://platform.openai.com/docs/guides/function-calling)
- [JSON Schema Reference](https://json-schema.org/understanding-json-schema/)
- [Teams AI Library v2 -- GitHub](https://github.com/microsoft/teams.ts)
- [@microsoft/teams.ai -- npm](https://www.npmjs.com/package/@microsoft/teams.ai)
- [Teams AI v2 Lights Example](https://github.com/microsoft/teams.ts/tree/main/examples/lights)

## instructions

This expert covers the design aspects of AI function calling in Teams AI v2. Use it when you need to:

- Design function names, descriptions, and parameter schemas for LLM tool use
- Choose JSON Schema types and constraints (enums, required fields, descriptions)
- Organize functions into modular sub-prompts with `.use()` composition
- Decide between auto and manual function calling modes
- Understand how function definitions affect token consumption and LLM behavior

Pair with `ai.function-calling-implementation-ts.md` for the actual `.function()` handler registration and execution patterns, and `ai.chatprompt-basics-ts.md` for ChatPrompt construction.

## research

Deep Research prompt:

"Write a micro expert on designing AI functions for the Teams AI Library v2 (TypeScript). Cover function naming conventions, JSON Schema parameter definitions (supported types: string, number, integer, boolean, object, array, null), writing effective descriptions for LLM comprehension, enum constraints, required vs optional parameters, composing sub-prompts with .use(), function count limits, auto vs manual function calling trade-offs, and return value best practices."

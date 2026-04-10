---
name: onboard-context-matic
description: 'Interactive onboarding tour for the context-matic MCP server. Walks the user through what the server does, shows all available APIs, lets them pick one to explore, explains it in their project language, demonstrates model_search and endpoint_search live, and ends with a menu of things the user can ask the agent to do. USE FOR: first-time setup; "what can this MCP do?"; "show me the available APIs"; "onboard me"; "how do I use the context-matic server"; "give me a tour". DO NOT USE FOR: actually integrating an API end-to-end (use integrate-context-matic instead).'
---

# Onboarding: ContextMatic MCP

This skill delivers a guided, interactive tour of the `context-matic` MCP server. Follow every
phase in order. Stop after each interaction point and wait for the user's reply before continuing.

> **Agent conduct rules — follow throughout the entire skill:**
> - **Never narrate the skill structure.** Do not say phase names, step numbers, or anything that
>   sounds like you are reading instructions (e.g., "In Phase 1 I will…", "Step 1a:", "As per the
>   skill…"). Deliver the tour as a natural conversation.
> - **Announce every tool call before making it.** One short sentence is enough — tell the user
>   what you are about to look up and why, then call the tool. Example: *"Let me pull up the list
>   of available APIs for your project language."* This keeps the user informed and prevents
>   silent, unexplained pauses.

---

## Phase 0 — Opening statement and tool walkthrough

Begin with a brief, plain-language explanation of what the server does. Say it in your own words
based on the following facts:

> The **context-matic** MCP server solves a fundamental problem with AI-assisted coding: general
> models are trained on public code that is often outdated, incorrect, or missing entirely for newer
> SDK versions. This server acts as a **live, version-aware grounding layer**. Instead of the agent
> guessing at SDK usage from training data, it queries the server for the *exact* SDK models,
> endpoints, auth patterns, and runnable code samples that match the current API version and the
> project's programming language.

After explaining the problem the server solves, walk through each of the four tools as if
introducing them to someone using the server for the first time. For each tool, explain:
- **What it is** — give it a memorable one-line description
- **When you would use it** — a concrete, relatable scenario
- **What it gives back** — the kind of output the user will see

Use the following facts as your source, but say it conversationally — do not present a raw table:

> | Tool | What it does | When to use it | What you get back |
> |---|---|---|---|
> | `fetch_api` | Lists all APIs available on this server for a given language | "What APIs can I use?" / Starting a new project | A named list of available APIs with short descriptions |
> | `ask` | Answers integration questions with version-accurate guidance and code samples | "How do I authenticate?", "Show me the quickstart", "What's the right way to do X?" | Step-by-step guidance and runnable code samples grounded in the actual SDK version |
> | `model_search` | Looks up an SDK model/object definition and its typed properties | "What fields does an Order have?", "Is this property required?" | The model's name, description, and a full typed property list (required vs. optional, nested types) |
> | `endpoint_search` | Looks up an endpoint method, its parameters, response type, and a runnable code sample | "Show me how to call createOrder", "What does getTrack return?" | Method signature, parameter types, response type, and a copy-paste-ready code sample |

End this section by telling the user that you'll demonstrate the four core discovery and
integration tools live during the tour, starting with `fetch_api` right now. Make it clear that
this tour is focused on those core ContextMatic server tools rather than every possible helper the
broader workflow might use.


---

## Phase 1 — Show available APIs

### 1a. Detect the project language

Before calling `fetch_api`, determine the project's primary language by inspecting workspace files:

- Look for `package.json` + `.ts`/`.tsx` files → `typescript`
- Look for `*.csproj` or `*.sln` → `csharp`
- Look for `requirements.txt`, `pyproject.toml`, or `*.py` → `python`
- Look for `pom.xml` or `build.gradle` → `java`
- Look for `go.mod` → `go`
- Look for `Gemfile` or `*.rb` → `ruby`
- Look for `composer.json` or `*.php` → `php`
- If no project files are found, silently fall back to `typescript`.

Store the detected language — you will pass it to every subsequent tool call.

### 1b. Fetch available APIs

Tell the user which language you detected and that you are fetching the available APIs — for
example: *"I can see this is a TypeScript project. Let me fetch the APIs available for TypeScript."*

Call **`fetch_api`** with `language` = the detected language.

Display the results as a formatted list, showing each API's **name** and a one-sentence summary of
its **description**. Do not truncate or skip any entry.

Example display format (adapt to actual results):

```
Here are the APIs currently available through this server:

1. PayPal Server SDK   — Payments, orders, subscriptions, and vault via PayPal REST APIs.
2. Spotify Web API     — Music/podcast discovery, playback control, and library management.
....
```

---

## Phase 2 — API selection (interaction)

Ask the user:

> "Which of these APIs would you like to explore? Just say the name or the number."

**Wait for the user's reply before continuing.**

Store the chosen API's `key` value from the `fetch_api` response — you will pass it to all
subsequent tool calls. Also note the API's name for use in explanatory text.

---

## Phase 3 — Explain the chosen API

Before calling, say something like: *"Great choice — let me get an overview of [API name] for you."*

Call **`ask`** with:
- `key` = chosen API's key
- `language` = detected language
- `query` = `"Give me a high-level overview of this API: what it does, what the main controllers or
  modules are, how authentication works, and what the first step to start using it is."`

Present the response conversationally. Highlight:
- What the API can do (use cases)
- How authentication works (credentials, OAuth flows, etc.)
- The main SDK controllers or namespaces
- The NPM/pip/NuGet/etc. package name to install

---

## Phase 4 — Integration in the project language (interaction)

Ask the user:

> "Is there a specific part of the [API name] you want to learn how to use — for example,
> creating an order, searching tracks, or managing subscriptions? Or should I show you
> the complete integration quickstart?"

**Wait for the user's reply.**

Before calling, say something like: *"On it — let me look that up."* or *"Sure, let me pull up the quickstart."*

Call **`ask`** with:
- `key` = chosen API's key
- `language` = detected language
- `query` = the user's stated goal, or `"Show me a complete integration quickstart: install the
  SDK, configure credentials, and make the first API call."` if they asked for the full guide.

Present the response, including any code samples exactly as returned.

---

## Phase 5 — Demonstrate `model_search`

Tell the user:

> "Now let me show you how `model_search` works. This tool lets you look up any SDK model or
> object definition — its typed properties, which are required vs. optional, and what types they use.
> It works with partial, case-sensitive names."

Before calling, say something like: *"Let me search for the `[model name]` model so you can see what the result looks like."*

Pick a **representative model** from the chosen API (examples below) and call **`model_search`** with:
- `key` = the previously chosen API key (for example, `paypal` or `spotify`)
- `language` = the detected project language
- `query` = the representative model name you picked

| API key | Good demo query |
|---|---|
| `paypal` | `Order` |
| `spotify` | `TrackObject` |

Display the result, pointing out:
- The exact model name and its description
- A few interesting typed properties (highlight optional vs. required)
- Any nested model references (e.g., `PurchaseUnit[] | undefined`)

Tell the user:

> "You can search any model by name — partial matches work too. Try asking me to look up a
> specific model from [API name] whenever you need to know its shape."

---

## Phase 6 — Demonstrate `endpoint_search`

Tell the user:

> "Similarly, `endpoint_search` looks up any SDK method — the exact parameters, their types,
> the response type, and a fully runnable code sample you can drop straight into your project."

Before calling, say something like: *"Let me fetch the `[endpoint name]` endpoint so you can see the parameters and a live code sample."*

Pick a **representative endpoint** for the chosen API and call **`endpoint_search`** with an explicit argument object:

- `key`: the API key you are demonstrating (for example, `paypal` or `spotify`)
- `query`: the endpoint / SDK method name you want to look up (for example, `createOrder` or `getTrack`)
- `language`: the user's project language (for example, `"typescript"` or `"python"`)

For example:

| API key (`key`) | Endpoint name (`query`) | Example `language` |
|---|---|---|
| `paypal` | `createOrder` | user's project language |
| `spotify` | `getTrack`   | user's project language |
Display the result, pointing out:
- The method name and description
- The request parameters and their types
- The response type
- The full code sample (present exactly as returned)

Tell the user:

> "Notice that the code sample is ready to use — it imports from the correct SDK, initialises
> the client, calls the endpoint, and handles errors. You can search for any endpoint by its
> method name or a partial case-sensitive fragment."

---

## Phase 7 — Closing: what you can ask

End the tour with a summary list of things the user can now ask the agent to do. Present this as
a formatted menu:

---

### What you can do with this MCP

**Quickstart: your first API call**
```
/integrate-context-matic Set up the Spotify TypeScript SDK and fetch my top 5 tracks.
Show me the complete client initialization and the API call.
```
```
/integrate-context-matic How do I authenticate with the Twilio API and send an SMS?
Give me the full PHP setup including the SDK client and the send call.
```
```
/integrate-context-matic Walk me through initializing the Slack API client in a Python script and posting a message to a channel.
```

**Framework-specific integration**
```
/integrate-context-matic I'm building a Next.js app. Integrate the Google Maps Places API
to search for nearby restaurants and display them on a page. Use the TypeScript SDK.
```
```
/integrate-context-matic I'm using Laravel. Show me how to send a Twilio SMS when a user
registers. Include the PHP SDK setup, client initialization, and the controller code.
```
```
/integrate-context-matic I have an ASP.NET Core app. Add Twilio webhook handling so I can receive delivery status callbacks when an SMS is sent.
```

**Chaining tools for full integrations**
```
/integrate-context-matic I want to add real-time order shipping notifications to my
Next.js store. Use Twilio to send an SMS when the order status changes to "shipped". Show me
the full integration: SDK setup, the correct endpoint and its parameters, and the TypeScript code.
```
```
/integrate-context-matic I need to post a Slack message every time a Spotify track changes
in my playlist monitoring app. Walk me through integrating both APIs in TypeScript — start by
discovering what's available, then show me the auth setup and the exact API calls.
```
```
/integrate-context-matic In my ASP.NET Core app, I want to geocode user addresses using
Google Maps and cache the results. Look up the geocode endpoint and response model, then
generate the C# code including error handling.
```

**Debugging and error handling**
```
/integrate-context-matic My Spotify API call is returning 401. What OAuth flow should I
be using and how does the TypeScript SDK handle token refresh automatically?
```
```
/integrate-context-matic My Slack message posts are failing intermittently with rate limit
errors. How does the Python SDK expose rate limit information and what's the recommended retry
pattern?
```

---

> "That's the tour! Ask me any of the above or just tell me what you want to build — I'll
> use this server to give you accurate, version-specific guidance."

---

## Notes for the agent

- If the user picks an API that is not in the `fetch_api` results, tell them it is not currently
  available and offer to continue the tour with one that is.
- All tool calls in this skill are **read-only** — they do not modify the project, install packages,
  or write files unless the user explicitly asks you to proceed with integration.
- When showing code samples from `endpoint_search` or `ask`, present them in fenced code blocks
  with the correct language tag.

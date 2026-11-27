# Quick Start

**Scope**: This guide is a step-by-step walkthrough that demonstrates semantic search (using Automated Embedding), keyword search (using MongoDB Search), and hybrid search against the `sample_mflix` sample dataset in the user's cluster. It prescribes an exact interaction sequence, index names, and queries. For the underlying reference material behind each step, see `automated-embedding.md`, `vector-search.md`, `lexical-search-indexing.md`, `lexical-search-querying.md`, and `hybrid-search.md`.

**Only run this once the user has chosen the sample-data tour.** It teaches how search works on a fixed dataset; it does not build search for the user's own collections. If you arrived here from a general request like "I'm new to search, help me get started" without the user picking the tour over working on their own data, go back to `SKILL.md` Step 0 and offer that choice first.

**This walkthrough requires an Atlas cloud cluster.** The sample dataset loads from the Atlas UI, and Automated Embedding works on every Atlas tier with no key management. Atlas Local and self-managed MongoDB are out of scope — Step 0.2 covers how they get detected and routed out.

## Interaction Principle

**Act first. Explain second. Then ask.**

Every step follows the same rhythm:
1. Do something automatically (create an index, run a query)
2. Explain what just happened in plain language
3. Ask if the user wants to go one step further

Never ask the user to decide something they haven't seen yet.

**Never end a turn without the next step.** Every turn closes with an AskUserQuestion or a completed action, and a step's question goes in the same turn as its explanation. The only valid stopping points are the user choosing to stop, or Wrap Up.

**"No" does not end the walkthrough, except at a bridge step.**

- **Enrichment questions** (6a, 7a, 5b, 6b, 9c) offer an optional extra inside the current path. A decline advances to that path's bridge step: 8a for Path A, 6a2 for Path A2, 7b for Path B, Wrap Up for Path C.
- **Bridge questions** offer the next search mode. A decline goes to Wrap Up, the only place an intermediate "No" ends the tour.

Never re-offer a declined branch, and never substitute one the user didn't ask for.

## Creating an Index

Four steps create one: Step 4a (`quickstart_semantic`), Step 4a2 (`quickstart_manual`), Step 3b (`quickstart_text`), and Step 6b (`quickstart_autocomplete`). Both rules below apply at every one of them.

**1 — Ask first.** `create-index` mutates the cluster, so it needs the explicit approval `SKILL.md` requires, in the turn immediately before the call. Steps 4a, 3b, and 6b each carry their own confirmation question; Step 4a2 is reached only by the user picking **Try with existing embeddings** or **Switch to manual embeddings**, which is itself the approval. Never treat a path choice as index approval: picking Hybrid at Step 2, or answering yes at Step 8a or Step 7b, selects a route, not consent to each index along it.

**2 — Check the name before using it.** Run `collection-indexes` on the target collection first, because re-running the tour on a cluster that already has these index names is the common case.

- **Name free** → create it.
- **Name taken, definition matches what the step would create** → create nothing. Tell the user you're reusing it and skip to that step's query if the status is `READY`. `Building` or `Pending` → poll per Step 3a.3 ②. `Stale` → handle per Step 3a.3 ②.
- **Name taken by a different definition** → do **not** drop it. Say the name is in use and create `<name>_2` instead. That name then replaces the original everywhere downstream: the step's own queries, Path C's pipelines, and the matching `SEMANTIC_INDEX_NAME`, `TEXT_INDEX_NAME`, or `AUTOCOMPLETE_INDEX_NAME` constant if the Wrap Up script is handed over. Carry any collision name you created to Wrap Up; left at its default, the script stops on the conflicting index instead of reusing yours.

## Step 0 — Check Connection and Deployment

**0.1 — Verify the MongoDB MCP is connected** by calling `list-databases`.

- If it **succeeds**: continue to 0.2.
- If it **fails**: get the connection working before continuing. If the `mongodb-mcp-setup` skill is available, invoke it inline. If it is not available (it does not ship in every plugin), tell the user:
  > "I can't reach your cluster through the MongoDB MCP server. Check that the server is running and that `MDB_MCP_CONNECTION_STRING` (or your Atlas service account credentials) is set in your client config, then restart the client and tell me when it's ready."

  Do not continue until `list-databases` succeeds.

**0.2 — Determine the deployment without asking (silent).** Do **not** ask the user what kind of deployment they have.

**Principle, used again in Step 3a: never block a beginner on a question they can't answer. Try the real operation and let its result tell you what the deployment supports.**

- **Opportunistic confirmation only.** If `atlas-local-list-deployments` exists *and* reports a running deployment you are connected to, that is positive evidence of **Atlas Local**: route out with the message below. Neither tool's absence or failure proves anything, because `atlas-local-list-deployments` ships only with the local MCP server and `atlas-inspect-cluster` is unregistered whenever the server has a connection string but no Atlas API service account.
- **Otherwise default to Atlas cloud** and proceed silently to Step 1. That is the overwhelmingly common case and the one this walkthrough is written for. Attempt no other probe: the MongoDB MCP server exposes no tool that returns cluster hostnames or raw command output.

**Where non-Atlas deployments actually get caught:** Step 1 cannot find or load `sample_mflix`, or Step 4a's `autoEmbed` index build fails. Both are real evidence; use the routing message below at that point.

**If there is real evidence of Atlas Local or self-managed MongoDB:** stop the walkthrough. Do not suggest starting a local deployment — they are already running MongoDB somewhere. Tell the user:
> "This guided walkthrough is only available for a cluster with the sample movies dataset on Atlas. Two options:
>
> 1. **Connect to a free Atlas cluster** (M0, no card required), load the sample dataset, and we'll run this tour end to end.
> 2. **Skip the tour and build search on your own data here.** Tell me what you want to search and I'll design the index and queries against your actual collections."

Use AskUserQuestion with those two options. If the user picks 1, wait for the Atlas cloud connection and restart at Step 0. If they pick 2, leave this walkthrough and use the main skill workflow in `SKILL.md`; without Voyage AI keys configured, semantic search there means manual embeddings (`vector-search.md`), not `autoEmbed`.

**0.3 — Confirm index creation is available.** Every path here creates at least one search index, so check for a `create-index` tool before starting one. If it is absent, the session is read-only in the sense `SKILL.md` defines (no `create`, `update`, or `delete` operation tools) and the walkthrough cannot complete. Do not enter a path and stop at its creation step. Tell the user:
> "I can read your cluster in this session but not create search indexes, so I can't run the guided tour for you. What I can do is design the indexes and queries and hand you the index JSON to create in the Atlas UI yourself."

Then leave this walkthrough and use the main skill workflow in `SKILL.md`, which handles read-only mode.

## Step 1 — Load Sample Data

Use `list-databases` to check if `sample_mflix` exists on the cluster.

**If it does not exist:** tell the user:
> "We'll use a sample movies dataset that Atlas provides. To load it: go to cloud.mongodb.com → your cluster → click the vertical ellipses → select **Load Sample Dataset**. Come back once it's loaded."

Wait for confirmation, then re-run `list-databases` to verify `sample_mflix` now appears. If it does not appear yet, tell the user:
> "It's not available yet. Give it another moment and let me know when it's loaded."

Repeat until `sample_mflix` is confirmed present before continuing.

**If the user reports there is no Load Sample Dataset option**, that is the real evidence Step 0.2 was waiting for: the deployment is not Atlas cloud. Stop here and use the routing message in Step 0.2. Do not ask which kind of non-Atlas deployment it is — the routing message is the same either way.

**For everyone (whether dataset was just loaded or already present):**

**Confirm the collection, not just the database name.** A cluster can carry a `sample_mflix` database that is not the Atlas sample dataset, so run `list-collections` on it before anything else. Only `movies` matters here; `embedded_movies` is checked at Step 3a2, and its absence does not block Path A, B, or C.

- **`movies` missing:** the sample dataset is not loaded, whatever the database name suggests. Repeat the Load Sample Dataset instructions above and re-verify, treating "there is no Load Sample Dataset option" exactly as described above — the Step 0.2 routing message.
- **`movies` present but `collection-schema` shows no `title`, `plot`, or `genres`:** this is the user's own collection, not the sample one. Do not index it and do not rename anything. Use the Step 0.2 routing message; its second option, building search on their own data through `SKILL.md`, is the fit here.

Otherwise use `collection-schema` on `sample_mflix.movies`, show a condensed example document (`title`, `plot`, `genres` only), and tell the user this is a real dataset of ~21,000 movies already on their cluster, one document per movie, with `title`, `plot`, and `genres` being the fields the walkthrough makes searchable — the same structure they would use for their own content.

## Step 2 — Choose Your Path

**Skip this step if the user already named a search type** when they asked ("I want to try vector search", "show me keyword search") — go straight to Path A, Path B, or, for hybrid, the hybrid route below. Do not re-ask a question they already answered. Skip only this question: Step 0's connection check and Step 1's `sample_mflix` check still have to pass before any path starts.

Otherwise use AskUserQuestion to ask:

> "What kind of search do you want to try?"

- **Semantic Search** *(Recommended)* — Find results by meaning, even when words don't match. Best for discovery, recommendations, and natural language queries.
- **Keyword Search** — Find results by exact words, with typo tolerance and autocomplete. Best for search boxes where users type specific terms.
- **Hybrid Search** — Run both at once and merge the rankings. Best when queries mix exact terms with open-ended intent.
- **I'm not sure** — routes to Semantic Search with an extra line of explanation.

**If the user picks Hybrid, or asked for hybrid by name:** hybrid needs a semantic index *and* a keyword index on `sample_mflix.movies`, so create both before Path C, in this order, confirming each.

1. Say so before creating anything:
   > "Hybrid search runs keyword and semantic search together, so it needs both kinds of index on the movies collection. I'll build the semantic one first, then the keyword one, and I'll check with you before each. Then we'll run the hybrid query."
2. **Semantic index.** Run Step 3a and Step 4a in full, Step 4a's AskUserQuestion confirmation included. Skip Steps 5a through 8a.
3. **Keyword index.** Run Step 3b only. Skip Steps 4b through 7b.
4. Go to Path C.

If at Step 4a the user takes **Try with existing embeddings** instead, hybrid on `movies` is off the table, because Path A2 builds on `embedded_movies`. Run Path A2 from Step 3a2 and let Step 6a2's disclosure offer the second index.

## Path A: Semantic Search (Automated Embedding)

### Step 3a — Cluster Readiness

Apply the Step 0.2 principle to cluster tier: try the real operation and let its result tell you what the tier supports. Do NOT ask the user "what tier are you on?" up front.

**3a.1 — Try to auto-detect the tier (silent, best-effort).**

Attempt `atlas-inspect-cluster`. It returns cluster metadata, of which two fields matter here:

- `instanceType`, one of `FREE`, `FLEX`, or `DEDICATED`
- `instanceSize`, populated only when `instanceType` is `DEDICATED` (`M10`, `M20`, and so on)

`instanceType` is what drives the index caps in 3a.3 ①.

**Storage auto-scaling is not readable.** No MCP tool returns it. Never gate on it, and never claim to have checked it. On `DEDICATED`, treat it as unknown, continue to the build, and rely on the `Stale` signal in 3a.3 ② as the only evidence that disk ran out.

- **If it succeeds:** note `instanceType` internally and apply the tier-specific guidance in 3a.3. Don't make the user do anything.
- **If it fails** (401 Unauthorized / no Atlas Admin API key / any error): do NOT stop and do NOT interrogate the user. Ask and continue:
  > "I couldn't automatically read your cluster tier — that needs a separate Atlas management key, which isn't required for anything we're doing. No problem: I'll just build the index, and if your tier can't support it, the build itself will tell us and I'll walk you through the fix."

  (Optional, offered as help — never required:)
  > "If you're curious, your tier is shown right under your cluster's name in the Atlas UI — e.g. 'M0 Sandbox', 'Flex', or 'M10'."

**3a.2 — Proceed straight to the index build (the real test).** Go to Step 4a, which walks through the cost and creates the `quickstart_semantic` auto-embed index. The creation call is the source of truth — it either succeeds or returns one of the two catchable errors in 3a.3.

**3a.3 — Catch the only two real failures.**

**① Index-count cap (Free/Flex).** Current limits: **M0 = 3** search/vector indexes total, **Flex = 10** total — and these counts include indexes already on the collection. If `create-index` returns an error about exceeding the maximum number of indexes:
  > "Heads up — you've hit your cluster's index limit. Free (M0) clusters allow **3 search/vector indexes total** and Flex allows **10**. These counts include any indexes already on the cluster.
  >
  > Two ways forward:
  > - **Make room:** delete an unused search index, or
  > - **Scale up:** move to Flex (10) or a dedicated tier for more headroom.
  >
  > Want me to list your existing indexes so we can see what's using the budget?"

  If they agree, run `collection-indexes` and show the current indexes so they can choose which ones to remove. Never delete anything without explicit confirmation. After freeing room or scaling, retry the build.

**② Dedicated cluster without storage auto-scaling (auto-embed only).** Automated Embedding on dedicated (`M10+`) clusters **requires storage auto-scaling**. This is a *disk* requirement, not a compute/tier one: do **not** tell users to raise their max cluster tier.

  The failure mode is **not** a failed build. Out of disk, MongoDB *pauses* embedding generation and the index goes **`Stale`**, resuming on its own once disk is freed. A `Stale` status from `collection-indexes` is the only signal; `create-index` never errors.

  **Polling procedure.** Once `create-index` returns, poll `collection-indexes` on `sample_mflix.movies` roughly every 30 seconds, reporting progress instead of going quiet:

  1. `READY` → continue to the next step in the current path.
  2. `Building` or `Pending` → keep polling. Expect 2 to 5 minutes for ~21,000 movies. Past 10 minutes with no change, say so and keep polling.
  3. `Stale` → stop polling and show the message below. Never drop or re-create the index, because the embeddings generated so far are kept.

  On `Stale`:
  > "Automated Embedding on a dedicated cluster **requires storage auto-scaling**. MongoDB stores the generated embeddings on your own cluster, so the index needs room to grow as it embeds your documents. Your cluster ran out of disk, so embedding generation paused and the index went into a `Stale` state. Nothing is lost, and it resumes on its own once there's space again.
  >
  > To enable it: Atlas UI → your cluster → **Edit Configuration** → **Storage** → turn on **storage auto-scaling**, then tell me when it's on.
  >
  > Prefer not to change cluster settings? We can switch to the manual-embeddings path instead. It uses pre-computed vectors already in the sample data, with no embedding generation and no token usage."

  Then use AskUserQuestion with exactly these two options:

  - **I enabled storage auto-scaling** → resume polling the *same* index from step 1 above. Do not call `create-index` again, and do not repeat Step 4a's explanation or confirmation.
  - **Switch to manual embeddings** → go to Path A2.

  Do not poll while waiting for that answer, and do not wait for the status to clear by itself. Nothing changes until the user acts.

  **Note on tiers:** this requirement is scoped to dedicated clusters and does **not** mean autoEmbed requires `M10+`. Free and Flex can use Automated Embedding, subject to ①'s caps and Free Tier rate limits. Never tell a Free/Flex user it is unavailable to them.

### Step 4a — Recommend AutoEmbed Index

**Cost is an FYI, not a gate.** The token note below is part of explaining how Automated Embedding works. Never turn it into a separate decision the user has to settle first, and never ask them to approve spend before they have seen what the feature does.

Before creating anything, explain the value and cost:

> **Here's how Automated Embedding works:**
>
> MongoDB handles everything — you don't write any embedding code. When you create this index, MongoDB reads every movie plot and converts it into a **vector** (a list of numbers that captures its meaning) using a Voyage AI model called **voyage-4**. It does this automatically, in the background, every time you add or update a document.
>
> **Token allocation:**
> - You get **200 million free tokens** per model, per organization — one-time, shared across all your Atlas projects
> - After that, voyage-4 costs **$0.06 per million tokens**
> - For reference: ~21,000 movie plots is roughly 5–10M tokens total for the initial sync
>
> **If you're on M0:** Once your 200M free tokens are exhausted, MongoDB automatically invoices you for additional usage — index builds and queries don't stop. You can add a payment method to your Atlas account without upgrading your cluster (Atlas → Billing → Payment Method). Charges are only for embedding model usage.
>
> **Two more things worth knowing before you commit:**
> - **Where the embedding happens.** The embedding model runs on inference infrastructure that MongoDB operates — a multi-tenant service on Google Cloud in a **US region** — *regardless of which cloud provider or region your cluster is in*. Your text is sent there to be embedded. **Data transfer costs apply** on top of the token costs above. If you have data-residency requirements, this is the detail to check first.
> - **Where the embeddings are stored.** They live on *your* cluster, in a dedicated internal database (one generated-embeddings collection per autoEmbed index). So they consume your disk, which is why dedicated clusters need storage auto-scaling.
>
> **The index we'd create looks like this:**
> ```json
> {
>   "fields": [
>     { "type": "autoEmbed", "modality": "text", "path": "plot", "model": "voyage-4" },
>     { "type": "filter", "path": "genres" }
>   ]
> }
> ```

Use AskUserQuestion:
> "Want to create this index and try semantic search?"

- **Yes, create it** → proceed to create the index
- **Try with existing embeddings** → route to Path A2 (manual vector search using pre-embedded data, no auto embedding needed)

If yes, apply the name check in **Creating an Index** rule 2 to `sample_mflix.movies`, then use `create-index` (or `mcp__mongodb-mcp-server__create-index`) to create a Vector Search index with `autoEmbed` type on it using the definition above.

Name the index: `quickstart_semantic`, or the collision name rule 2 produced. If rule 2 found a matching `READY` index, create nothing and go straight to Step 5a — skip the build message below.

**While the index builds, tell the user:**
> "MongoDB is now generating embeddings for all ~21,000 movie plots. This runs in the background and typically takes a few minutes for a collection of this size. I'll check when it's ready."

Wait for status `READY` with `collection-indexes` before running any queries, following the polling procedure in Step 3a.3 ②.

### Step 5a — First Semantic Query

Tell the user:
> "Let's run your first semantic query: **'a story about growing up'**"

Run this aggregation with `aggregate`:

```javascript
db.movies.aggregate([
  {
    $vectorSearch: {
      index: "quickstart_semantic",
      path: "plot",
      query: "a story about growing up",
      numCandidates: 100,
      limit: 3
    }
  },
  {
    $project: {
      _id: 0,
      title: 1,
      plot: 1,
      score: { $meta: "vectorSearchScore" }
    }
  }
])
```

Display results in a clean table: Title | Score | Plot (truncated to ~100 chars).

**Explain to the user:**
> "None of those movie titles or plots contain the words 'growing up', but MongoDB found them anyway. That's semantic search: it matched the **meaning** of your query, not the words. The score shows how similar each result is to what you asked for: closer to 1.0 means more similar."

Point out one detail of the query you just ran: `query` is a plain text string, not a vector. With auto embedding MongoDB converts it internally, so the application never generates query vectors.

### Step 6a — Explore Another Query

Use AskUserQuestion:
> "Want to try another query to see it work on a different theme?"

- **"unlikely friendship"** → run and show results
- **"revenge and justice"** → run and show results
- **Type your own** → run whatever they enter
- **Skip, move on** → proceed to Step 7a

After results: point out which movies surfaced and note whether any of the query words appear in the plot. If they don't — highlight it.

### Step 7a — Try Filtering

Use AskUserQuestion:
> "Want to narrow the results to a specific genre? Filters let you combine semantic similarity with exact criteria like 'find me something emotionally similar to this query, but only in the Drama genre.'"

- **Yes, show me filtered search** → proceed
- **No, move on** → skip to Step 8a

If yes, run the same query with a genre filter:

```javascript
db.movies.aggregate([
  {
    $vectorSearch: {
      index: "quickstart_semantic",
      path: "plot",
      query: "a story about growing up",
      filter: { genres: { $eq: "Drama" } },
      numCandidates: 150,
      limit: 3
    }
  },
  {
    $project: {
      _id: 0,
      title: 1,
      genres: 1,
      score: { $meta: "vectorSearchScore" }
    }
  }
])
```

**Explain:**
> "MongoDB applied the genre filter **before** computing similarity. This narrows the candidate pool first, then finds the most semantically similar ones within it. This is faster than filtering after the fact."

Note that `filter` takes standard MongoDB query syntax and works on any field indexed as `type: filter`. Raising `numCandidates` (150 here versus 100 unfiltered) compensates for the narrowed pool.

### Step 8a — Bridge to Keyword / Hybrid

Use AskUserQuestion:
> "Semantic search is great for open-ended queries. Keyword search is better when users type specific titles or names. Want to see them side by side, then combine them into hybrid search?"

- **Yes** → run the abbreviated Path B below, then go to Path C
- **No, I'm done** → skip to Wrap Up

**Abbreviated Path B, reached only from here.** Run Steps 3b, 4b, and 5b, then go straight to Path C. **Skip Step 6b** (autocomplete is a detour from the comparison the user just asked for; offer it in Wrap Up only if they raise it) and **skip Step 7b's question** (they answered it here).

## Path A2: Semantic Search (Bring Your Own Embeddings)

*This path is for users who prefer not to use Automated Embedding. Uses the `sample_mflix.embedded_movies` collection, which already has pre-computed 1536-dimensional plot embeddings from OpenAI's text-embedding-ada-002 model.*

**Path A2 replaces Path A. It is not a continuation of it.** Two entry points lead here: Step 4a's **Try with existing embeddings** option, before any autoEmbed index exists, and Step 3a.3 ②'s **Switch to manual embeddings** option, after one went `Stale`. Either way, Path A's remaining steps are skipped and `quickstart_semantic` does not exist on `sample_mflix.movies`. Returning to Path A later means running Step 4a in full, explanation and AskUserQuestion confirmation included, because it builds a different index on a different collection. There is no shortened return route.

### Step 3a2 — Explain Manual Vector Search

Tell the user the sample dataset already includes an `embedded_movies` collection with pre-computed vectors on every document, so no embedding API is needed. With manual vector search the application generates embeddings with a model of its choice (OpenAI, Cohere, Hugging Face) and stores them as a document field; MongoDB only does the similarity search. Show the document shape:

```json
{
  "title": "Toy Story",
  "plot": "A cowboy doll is profoundly threatened...",
  "plot_embedding": [0.0007, -0.0268, 0.0135, ...]  // 1536 numbers
}
```

Because the vectors are supplied rather than generated, the index definition must declare the dimension count and similarity metric itself — both are shown in Step 4a2 and must match the model that produced the vectors.

### Step 4a2 — Create Manual Vector Index

Apply the name check in **Creating an Index** rule 2 to `sample_mflix.embedded_movies`, then use `create-index` to create a vectorSearch index on it:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "plot_embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    }
  ]
}
```

Name the index: `quickstart_manual`, or the collision name rule 2 produced.

**While it builds, explain:**
> "The index organizes the embeddings that are already stored in your documents into a structure that makes similarity lookups fast."

Wait for status `READY` with `collection-indexes`.

### Step 5a2 — Run a "Find Similar Movies" Query

Explain to the user:

> "To query a manual vector search index, you need to pass a vector, which is an array of numbers representing the query terms. Normally your app generates this by sending the user's search text to an embedding model. Because we don't have an embedding API connected here, we take a movie we already know and find others with similar plots. This is exactly how recommendation systems work."

Use `find` on `sample_mflix.embedded_movies` to fetch the `plot_embedding` for **"Toy Story"**: filter `{"title": "Toy Story"}`, projection `{"plot_embedding": 1, "title": 1}`, limit 1. Use this movie rather than picking one, so the results below are reproducible. If it returns nothing, fall back to `{"title": "The Matrix"}`; if that also returns nothing, take the first document that has a `plot_embedding` field and tell the user which movie you used.

Then run:

```javascript
db.embedded_movies.aggregate([
  {
    $vectorSearch: {
      index: "quickstart_manual",
      path: "plot_embedding",
      queryVector: <the plot_embedding array fetched for "Toy Story" above>,
      numCandidates: 100,
      limit: 5
    }
  },
  {
    $project: {
      _id: 0,
      title: 1,
      plot: 1,
      score: { $meta: "vectorSearchScore" }
    }
  }
])
```

Display results in a table: Title | Score | Plot snippet. Exclude the source movie from the display.

**Explain:**
> "MongoDB compared the query vector against every stored embedding and returned the most similar ones. The top result is the source movie itself (score ~1.0), so skip that one. The rest are movies whose plots are mathematically closest in meaning. No keyword matching. Instead, it's pure similarity between vectors."

> **In your own app:** instead of using an existing document's embedding as the query, you'd call your embedding model with the user's search text and pass the result as `queryVector`. The query structure is identical.

### Step 6a2 — Bridge to Keyword / Hybrid

Use AskUserQuestion:
> "Do you want to also see keyword search and hybrid, where both approaches run together? One thing to flag first: keyword search runs on the `movies` collection, and hybrid needs a semantic index on that same collection. The one we just built is on `embedded_movies`, so hybrid would mean creating a second semantic index on `movies` with Automated Embedding. I'll ask before creating it."

- **Yes** → proceed to Path B, then Path C. Path C's Path A2 branch handles that second index, with its own confirmation.
- **No, I'm done** → skip to Wrap Up

## Path B: Keyword Search (Atlas Search)

### Step 3b — Create Text Search Index

Ask before creating anything, with AskUserQuestion:
> "Keyword search needs a MongoDB Search index on the movies collection — a separate structure MongoDB builds alongside your data, like the index at the back of a book. It doesn't change your documents, it just makes specific fields fast to search. Want me to create it?"

- **Yes, create it** → continue below
- **No** → Path B and Path C both need this index, so skip to Wrap Up and do not re-offer it

This question is required on every route in, including Step 2's hybrid route, Step 8a's abbreviated Path B, and Step 7b. Those answers chose a path; none of them approved this index.

Then apply the name check in **Creating an Index** rule 2 to `sample_mflix.movies` and use `create-index` to create an Atlas Search index on it:

```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "title": { "type": "string" },
      "plot": { "type": "string" },
      "genres": { "type": "token" }
    }
  }
}
```

Name the index: `quickstart_text`, or the collision name rule 2 produced — that name then goes in every `$search` stage below and in Path C's keyword pipeline.

**Explain while it builds:**
> "We're indexing title and plot as searchable text, plus genres as an exact-match field you can filter on. It builds in the background and your documents stay exactly as they are."

The queries in this path search `title` and `plot` only. `genres` is indexed as `token` so exact-match filtering is available, mirroring the `filter` field in Path A's vector index. Do not claim the queries below search `genres`.

### Step 4b — First Keyword Search

Run with `aggregate`:

```javascript
db.movies.aggregate([
  {
    $search: {
      index: "quickstart_text",
      text: {
        query: "space adventure",
        path: ["title", "plot"]
      }
    }
  },
  {
    $project: {
      _id: 0,
      title: 1,
      plot: 1,
      score: { $meta: "searchScore" }
    }
  },
  { $limit: 3 }
])
```

Display results in a table: Title | Score | Plot snippet.

**Explain:**
> "MongoDB Search found movies where 'space' and 'adventure' appear across the title or plot, and ranked them by how relevant they are. The score reflects relevance, not just whether the word appeared."

Contrast it with `$vectorSearch`: `$search` takes a `text` operator and matches words, `$vectorSearch` takes `query` and matches meaning. `path` accepts an array, so one `text` operator covers several fields at once.

### Step 5b — Try Fuzzy Matching

Use AskUserQuestion:
> "Want to see what happens with a typo? Fuzzy matching is one of the most practical features for real search boxes."

If yes, run with intentional typos (`"sapce adventre"`):

```javascript
db.movies.aggregate([
  {
    $search: {
      index: "quickstart_text",
      text: {
        query: "sapce adventre",
        path: ["title", "plot"],
        fuzzy: { maxEdits: 1 }
      }
    }
  },
  {
    $project: { _id: 0, title: 1, score: { $meta: "searchScore" } }
  },
  { $limit: 3 }
])
```

**Explain:**
> "Both typos were tolerated. MongoDB allowed up to 1 character difference between the query and indexed text. This is what makes a search box feel forgiving and human."

`fuzzy: { maxEdits: 1 }` is the only addition to the previous query — one character of difference per word. `maxEdits: 2` is more forgiving but too loose in practice: short words start matching things they shouldn't.

### Step 6b — Try Autocomplete

Use AskUserQuestion:
> "Want to see search-as-you-type? This powers the dropdown suggestions that appear while someone is still typing."

Autocomplete needs `title` indexed as an `autocomplete` type, which `quickstart_text` does not have yet. Two routes get there. **Work through this in order, before telling the user anything:**

1. **Does an autocomplete index already exist?** Check the `collection-indexes` output. If `quickstart_autocomplete` is there with `title` typed as `autocomplete`, create nothing, tell the user you're reusing it, and go straight to the query. If that name is taken by a different definition, do **not** drop it: say the name is in use and create `quickstart_autocomplete_2` instead. That name then replaces `quickstart_autocomplete` in the Route 2 pipeline and in the Wrap Up script's `AUTOCOMPLETE_INDEX_NAME` constant.
2. **Can you execute mongosh or driver code in this session?** If yes, Route 1. If the MongoDB MCP server is your only path to the cluster, Route 2. Atlas UI access does not qualify, because it means handing the step to the user to do by hand, and this walkthrough never does that when a tool can do it.
3. **Did Route 1 fail?** If `updateSearchIndex` is missing or errors for any reason, fall back to Route 2 and say why. Never drop `quickstart_text` to work around it.

When unsure, take Route 2. It works in every setup and leaves the index already serving queries untouched.

**Route 1 — edit the existing index.** Requires mongosh or a driver. `db.collection.updateSearchIndex(<name>, {<definition>})` updates an index in place: the old definition keeps serving queries while the new one builds, then swaps over. Pass the **complete** new definition (it replaces, not merges), with `title` as a multi-type field:

```json
"title": [
  { "type": "string" },
  { "type": "autocomplete", "tokenization": "edgeGram" }
]
```

**⚠️ Route 2 — create a second index.** The default, and the only option when the MongoDB MCP server is your path to the cluster: it exposes `create-index` and `drop-index` but **no update-index tool**, so `quickstart_text` cannot be edited in place from here. Don't attempt it and don't drop the working index. Create a dedicated index named `quickstart_autocomplete`:

```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "title": { "type": "autocomplete", "tokenization": "edgeGram" }
    }
  }
}
```

Then query it with `index: "quickstart_autocomplete"`, or the collision name from step 1, instead of `quickstart_text`. It counts against the tier index caps in Step 3a.3 ①. The Wrap Up script takes this second-index route too, so its `AUTOCOMPLETE_INDEX_NAME` constant is covered by the handoff rule in **Creating an Index** rule 2.

Tell the user which route you took and why, then run that route's query. **The index name is not interchangeable: using the wrong one returns an error, because only one of the two indexes has `title` typed as `autocomplete`.**

**Route 2 (second index):**
```javascript
db.movies.aggregate([
  {
    $search: {
      index: "quickstart_autocomplete",
      autocomplete: { query: "inc", path: "title" }
    }
  },
  {
    $project: { _id: 0, title: 1 }
  },
  { $limit: 5 }
])
```

**Route 1 (updated index):** same pipeline with `index: "quickstart_text"`.

**Explain:**
> "Three characters returned relevant title suggestions instantly. Autocomplete pre-indexes word fragments, so it's purpose-built for speed and can respond as fast as a user types."

Note the operator change: `autocomplete` replaces `text` inside `$search`, `query` holds the partial input, and `path` must point at a field indexed as `autocomplete` type — this is the call a search box makes on every keystroke.

### Step 7b — Bridge to Hybrid

Use AskUserQuestion:
> "Keyword search finds exact matches. Want to see hybrid search, where MongoDB runs both keyword and semantic search at once and merges the results into one ranked list?"

- **Yes** → proceed to Path C
- **No, just the script** → skip to Wrap Up

## Path C: Hybrid Search

*Prerequisites: the `quickstart_text` index (from Path B) and the `quickstart_semantic` index (from Path A), both on `sample_mflix.movies`.*

**How users get here.** Step 2's hybrid route, Step 8a (from Path A), or Step 7b (from Path B). All three have already created or confirmed the two indexes, and nothing below changes based on which one it was.

Run `collection-indexes` on `sample_mflix.movies` to confirm both exist. If either is missing, don't create it implicitly: re-enter only the step that creates it (Step 3b for `quickstart_text`, Step 4a for `quickstart_semantic`) as a **create-only re-entry**:

- Run that step's explanation and its confirmation question again. That is the user's consent to build an index, so it is never skipped or assumed.
- Run nothing else from that path: no repeating queries or explanations the user already saw, no re-offering branches they declined.
- Come back here, re-run `collection-indexes`, and continue to Step 8c once both report `READY`.

If the user arrived through Path A2, they have `quickstart_manual` on `sample_mflix.embedded_movies`, a different index on a different collection that this pipeline can't use. Tell the user:

> "Hybrid search needs both pipelines pointed at the same collection, so the semantic index has to be on `movies` alongside the keyword index. Yours is on `embedded_movies` from earlier. I can create an Automated Embedding index on `movies` instead. That generates embeddings for about 21,000 plots and counts against your tier's search index cap. Want me to?"

If the user agrees, run Step 4a as a create-only re-entry under the rules above, then continue. If they decline, skip to Wrap Up and do not ask again.

### Step 8c — Run Hybrid Search

Run with `aggregate`:

**Two things to flag to the user before running it — both look like mistakes and aren't:**

1. **The two pipelines search for different text on purpose.** Semantic gets `"a story about growing up"` (a natural-language description of a *theme*), keyword gets `"coming of age"` (the literal *phrase* a plot would actually contain). Each pipeline is fed the query form it's good at. Say this out loud, or a beginner could read it as a typo.
2. **`limit: 20` inside each pipeline is the merge window**, and it is load-bearing. It caps how many documents `$rankFusion` evaluates from each pipeline — so cross-pipeline agreement is only visible *inside* that window. Set it to 5 and a document ranked #7 by keyword becomes invisible to the fusion, even if it's the best overall result. A reasonable default is 3–5× the number of final results you want.

```javascript
db.movies.aggregate([
  {
    $rankFusion: {
      input: {
        pipelines: {
          semanticPipeline: [
            {
              $vectorSearch: {
                index: "quickstart_semantic",
                path: "plot",
                query: "a story about growing up",
                numCandidates: 100,
                limit: 20
              }
            }
          ],
          keywordPipeline: [
            {
              $search: {
                index: "quickstart_text",
                text: { query: "coming of age", path: "plot" }
              }
            },
            { $limit: 20 }
          ]
        }
      },
      combination: {
        weights: {
          semanticPipeline: 0.7,
          keywordPipeline: 0.3
        }
      }
    }
  },
  {
    $project: { _id: 0, title: 1, plot: 1 }
  },
  { $limit: 5 }
])
```

Display results.

**Explain:**
> "MongoDB ran two searches, one by meaning and one by keywords, then merged them using an algorithm called **Reciprocal Rank Fusion**. Movies that ranked highly in **both** searches scored highest overall. The weights (70% semantic, 30% keyword) control how much each signal matters. You can tune these per query type."

Two facts about the pipeline worth stating: the sub-pipelines run one after another rather than in parallel, with the ranked results merged at the end, and `$rankFusion` is not limited to two — any number of pipelines can be weighted to fit the use case.

### Step 9c — Try Different Weights (Optional)

Use AskUserQuestion:
> "Want to flip the weights and see how results change? For example, trust keywords more when users type exact titles."

If yes, re-run with `keywordPipeline: 0.7, semanticPipeline: 0.3` and show the diff in results.

**Explain:**
> "Different weights, different results. In a real product you might boost keyword search for navigational queries (user knows what they want) and boost semantic search for exploratory queries (user is browsing)."

## Wrap Up

Congratulate the user. Use AskUserQuestion:
> "Want a standalone Python script with everything you just ran: index creation, semantic search, keyword search, and hybrid search?"

**Check the index state before asking that.** Run `collection-indexes` on `sample_mflix.movies` and check for the semantic index name carried from Step 4a (for example, `quickstart_semantic` or `quickstart_semantic_2`). The script creates that named index there as its first action and embeds about 21,000 movie plots, which uses tokens.

- **The carried semantic index is present:** the script reproduces what the user already ran and agreed to. Ask the question above as written.
- **Absent:** the script would do embedding work the user never approved, so say so instead of asking the question above. Gate on this index, not on which path was taken: the gap covers Path A2 ending at Step 6a2, Path B ending at Step 7b, Path A stopping at Step 4a's confirmation, and any path cut short by an error.
  > "I have a standalone Python script covering all three search types, but it goes further than what you just ran: it creates an Automated Embedding index on `movies` and embeds about 21,000 movie plots, which uses tokens. Want it anyway?"

If they decline, do not copy the script. Otherwise copy `scripts/quickstart_complete.py` from this skill directory into the user's working directory.

**Then carry over any collision names.** The script's `SEMANTIC_INDEX_NAME`, `TEXT_INDEX_NAME`, and `AUTOCOMPLETE_INDEX_NAME` constants default to the three `quickstart_*` names. For every index you created under a collision name, edit the matching constant in the copy before handing it over, and say which ones you changed. Skip this and the script stops on the conflicting index rather than reusing the one the user watched you build.

Then tell the user:
> "Your script is at `<destination path>`. Set `MONGODB_URI` to your connection string and it runs against `sample_mflix.movies`. It reads `MDB_MCP_CONNECTION_STRING` too if that is already exported for the MCP server. To point it at your own data, change the `DB_NAME` and `COLLECTION_NAME` variables at the top. Because the script hard-codes the sample schema (`plot`, `genres`, and `title`), also update the index definitions, the `$project` stages, and the query strings to match your own field names."

## Troubleshooting

**`sample_mflix` not found**
- Load it from Atlas UI: cluster → three-dot menu → Load Sample Dataset
- If there is no Load Sample Dataset option, the cluster is not on Atlas cloud and this walkthrough does not apply. Return to Step 0.2.

**Deployment turns out not to be Atlas cloud mid-walkthrough**
- Stop rather than improvise a substitute. The Atlas UI sample-data loader is unavailable, and `autoEmbed` index creation fails without the right image or MongoDB version, `mongot`, and Voyage AI keys.
- Give the user the two options in Step 0.2: move to an Atlas cloud cluster, or leave the walkthrough and build search on their own data through the main `SKILL.md` workflow with manual embeddings. Do not offer to start a local deployment — they are already running MongoDB somewhere.

**Index stuck in Building state**
- Normal for large collections — check status with `collection-indexes`
- autoEmbed initial sync on 21K movies typically takes 2–5 minutes

**`$rankFusion` error**
- Run `db-stats` to check the MongoDB version.
- If below 8.0, tell the user: "Hybrid search requires MongoDB 8.0 or later — your cluster is on [version]. You can upgrade in Atlas, or we can wrap up here with what you've already built." Then proceed to Wrap Up.

**autoEmbed index creation fails**
- Do **not** tell the user they need an M10+ dedicated cluster — autoEmbed is not restricted to dedicated tiers. Free and Flex clusters can use it.
- Most likely cause is the tier index cap: **3** total search/vector indexes on Free, **10** on Flex, counting indexes already on the collection. See Step 3a.3 ①.
- Check `autoEmbed` isn't sharing an index definition with a `vector` type field — the two cannot coexist in the same index, and MongoDB throws an exception if both are present.
- Confirm the field `type` and `modality` weren't being edited on an existing index — those two are immutable after creation (other settings, and adding/deleting `autoEmbed` and `filter` fields, are fine).

**autoEmbed index shows `Stale` status**
- This is a disk-space pause, not a failure. Embedding generation resumes on its own once space is freed.
- On dedicated (`M10+`) clusters, enable **storage auto-scaling**: Atlas → cluster → Edit Configuration → Storage. See Step 3a.3 ②.

**No results returned**
- Check index name matches exactly — typos return no results silently
- Check index status is READY, not Building

**`$vectorSearch` returns an error (not just empty results)**
- Run `collection-indexes` to confirm the index exists
- If missing, the index needs to be created — return to the relevant creation step

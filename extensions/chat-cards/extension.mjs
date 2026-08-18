// Extension: chat-cards
// A GitHub Copilot canvas extension. The agent builds interactive cards
// (tabs, tables, charts, forms, show/hide sections, sequential lists,
// markdown documents, video) through canvas actions; the canvas renders
// them as a live deck. Form submissions and per-card context actions travel
// back to the conversation as prompts via session.send.
//
// All rendering lives in cards-core.mjs (dependency-free, testable without
// the SDK); this file wires the canvas/session lifecycle, the action
// surface, and a per-panel page server: open() starts one, onClose() stops
// it, so the process holds no sockets while no panel is showing.
import http from "node:http";
import crypto from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { joinSession, createCanvas } from "@github/copilot-sdk/extension";
import { buildCard, CARD_BUILDERS } from "./cards-core.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CANVAS_PAGE = readFileSync(path.join(__dirname, "assets", "canvas.html"), "utf8");

// Deck limits. A live deck can hold plenty, but it is still a conversation
// surface, not a database.
const MAX_CARDS = 60;
const MAX_SUBMISSIONS = 50;
const MAX_BODY_BYTES = 1024 * 1024;
const MAX_PROMPT_CHARS = 16000;

let session = null;

// instanceId -> { token, sessionId, cards: [], submissions: [], updatedAt }
const instances = new Map();
// instanceId -> Set of SSE responses
const sseClients = new Map();

// ---------------------------------------------------------------------------
// Deck persistence
// ---------------------------------------------------------------------------
// Decks are written to per-user state on disk so the cards a conversation
// produced are still there after the Copilot app (and this extension process
// with it) restarts. Tokens are deliberately NOT persisted: they only
// authenticate the canvas page against this process, so each run mints fresh
// ones and open() hands the page a fresh URL.

const STATE_VERSION = 1;
const MAX_PERSISTED_DECKS = 8;
const PERSIST_DEBOUNCE_MS = 300;

function stateDirectory() {
  if (process.platform === "win32") {
    return path.join(
      process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local"),
      "chat-cards",
    );
  }
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "chat-cards");
  }
  return path.join(
    process.env.XDG_STATE_HOME ?? path.join(os.homedir(), ".local", "state"),
    "chat-cards",
  );
}

const STATE_FILE = path.join(stateDirectory(), "state.json");

function loadPersistedDecks() {
  try {
    const parsed = JSON.parse(readFileSync(STATE_FILE, "utf8"));
    if (parsed?.version === STATE_VERSION && parsed.instances && typeof parsed.instances === "object") {
      return parsed.instances;
    }
  } catch {
    // No state file yet, or an unreadable one: start with an empty store.
  }
  return {};
}

// instanceId -> { sessionId, cards, submissions, updatedAt } from earlier
// runs, not yet claimed by an in-memory instance this run.
const persistedDecks = loadPersistedDecks();

let persistTimer = null;

function schedulePersist() {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    flushStateSync();
  }, PERSIST_DEBOUNCE_MS);
  // The debounce must never be what keeps this process alive.
  persistTimer.unref();
}

// Synchronous so the process "exit" event and the shutdown path can use it.
function flushStateSync() {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  const decks = { ...persistedDecks };
  for (const [instanceId, instance] of instances) {
    decks[instanceId] = {
      sessionId: instance.sessionId ?? null,
      cards: instance.cards,
      submissions: instance.submissions,
      updatedAt: instance.updatedAt ?? new Date().toISOString(),
    };
  }
  const kept = Object.fromEntries(
    Object.entries(decks)
      .sort(
        ([, a], [, b]) =>
          (Date.parse(b?.updatedAt ?? "") || 0) - (Date.parse(a?.updatedAt ?? "") || 0),
      )
      .slice(0, MAX_PERSISTED_DECKS),
  );
  try {
    mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    writeFileSync(`${STATE_FILE}.tmp`, JSON.stringify({ version: STATE_VERSION, instances: kept }));
    renameSync(`${STATE_FILE}.tmp`, STATE_FILE);
  } catch {
    // Persistence is best effort; the live deck is unaffected.
  }
}

function markDirty(instance) {
  instance.updatedAt = new Date().toISOString();
  schedulePersist();
}

// Recall a persisted deck for a canvas instance: an exact instance match
// first, else the newest deck from the same session. The host may mint a new
// canvas instance id after a restart while the conversation (and so the deck
// the user expects to see again) is the same.
function takePersistedDeck(instanceId, sessionId) {
  let key = Object.prototype.hasOwnProperty.call(persistedDecks, instanceId) ? instanceId : null;
  if (!key && sessionId) {
    let newest = -1;
    for (const [candidate, deck] of Object.entries(persistedDecks)) {
      if (deck?.sessionId !== sessionId || instances.has(candidate)) continue;
      const at = Date.parse(deck.updatedAt ?? "") || 0;
      if (at > newest) {
        newest = at;
        key = candidate;
      }
    }
  }
  if (!key) return null;
  const deck = persistedDecks[key];
  delete persistedDecks[key];
  return deck;
}

function getInstance(instanceId, sessionId) {
  let instance = instances.get(instanceId);
  if (!instance) {
    const restored = takePersistedDeck(instanceId, sessionId);
    instance = {
      token: crypto.randomBytes(16).toString("hex"),
      sessionId: sessionId ?? restored?.sessionId ?? null,
      cards: Array.isArray(restored?.cards) ? restored.cards : [],
      submissions: Array.isArray(restored?.submissions) ? restored.submissions : [],
      updatedAt: restored?.updatedAt,
    };
    instances.set(instanceId, instance);
    if (restored) schedulePersist();
  } else if (sessionId && !instance.sessionId) {
    instance.sessionId = sessionId;
  }
  return instance;
}

function validateToken(instanceId, token) {
  const instance = instances.get(instanceId);
  return Boolean(instance && token && instance.token === token);
}

function broadcast(instanceId, event, data) {
  const clients = sseClients.get(instanceId);
  if (!clients) return;
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try {
      res.write(message);
    } catch {
      clients.delete(res);
    }
  }
}

// Hand a prompt to the agent. Returns whether the handoff was accepted, so
// the form card can fall back to its copyable prompt when it was not.
async function sendPrompt(prompt) {
  if (!session) return false;
  try {
    await Promise.resolve(session.send({ prompt }));
    return true;
  } catch {
    return false;
  }
}

function findCardIndex(instance, cardId) {
  return instance.cards.findIndex((card) => card.id === cardId);
}

function cardListing(instance) {
  return instance.cards.map((card) => ({ cardId: card.id, kind: card.kind, title: card.title }));
}

// Create a card of the given kind, append it to the deck (trimming the
// oldest cards past the limit), and notify the canvas.
function createCardAction(ctx, kind) {
  const instance = getInstance(ctx.instanceId, ctx.sessionId);
  const card = buildCard(kind, ctx.input ?? {});
  instance.cards.push(card);
  let note = "";
  while (instance.cards.length > MAX_CARDS) {
    const dropped = instance.cards.shift();
    broadcast(ctx.instanceId, "remove", { cardId: dropped.id });
    note = ` The deck was at its ${MAX_CARDS}-card limit, so the oldest card ("${dropped.title}") was removed.`;
  }
  markDirty(instance);
  broadcast(ctx.instanceId, "upsert", { card });
  return {
    ok: true,
    cardId: card.id,
    kind: card.kind,
    title: card.title,
    summary:
      card.summary +
      note +
      " The card is visible in the canvas; also state its key takeaway in the conversation for surfaces without the canvas.",
  };
}

function actionError(error) {
  return { error: error instanceof Error ? error.message : String(error) };
}

// ---------------------------------------------------------------------------
// Shared schema fragments
// ---------------------------------------------------------------------------

const TUTOR_TERMS_SCHEMA = {
  type: "array",
  description:
    "Educational terms to mark in the card. Hovering a marked term for a moment shows its tip as a tooltip.",
  items: {
    type: "object",
    properties: {
      term: { type: "string", description: "Exact term as it appears in the card text" },
      tip: { type: "string", description: "Short plain-text definition shown on hover" },
    },
    required: ["term"],
  },
};

const CONTEXT_ACTIONS_SCHEMA = {
  type: "array",
  description:
    "Right-click actions for the card. Choosing one sends its prompt to the conversation; {{selection}} in a prompt is replaced with the user's selected text.",
  items: {
    type: "object",
    properties: {
      label: { type: "string", description: "Menu item label" },
      prompt: { type: "string", description: "Prompt sent to the conversation when chosen" },
    },
    required: ["label", "prompt"],
  },
};

const COMMON_CARD_PROPERTIES = {
  title: { type: "string", description: "Card title (plain text; the extension escapes it)" },
  subtitle: { type: "string", description: "Optional subtitle under the title" },
  tutorTerms: TUTOR_TERMS_SCHEMA,
  contextActions: CONTEXT_ACTIONS_SCHEMA,
};

const TAB_CARD_PROPERTIES = {
  ...COMMON_CARD_PROPERTIES,
  tabs: {
    type: "array",
    minItems: 1,
    description:
      "One entry per tab. Give each tab exactly one of markdown, code, html, or text (non-empty).",
    items: {
      type: "object",
      properties: {
        label: { type: "string", description: "Tab label" },
        markdown: { type: "string", description: "Markdown content for the tab" },
        content: { type: "string", description: "Alias of markdown" },
        text: { type: "string", description: "Plain text content for the tab" },
        code: { type: "string", description: "Code sample shown with a copy button" },
        language: { type: "string", description: "Language for the code sample" },
        html: { type: "string", description: "HTML content (sanitized to an allowlisted subset)" },
      },
      required: ["label"],
    },
  },
  tutorTermsInCode: {
    type: "boolean",
    description: "Also mark tutor terms inside code samples (off by default)",
  },
};

const TABLE_CARD_PROPERTIES = {
  ...COMMON_CARD_PROPERTIES,
  caption: { type: "string" },
  headers: {
    type: "array",
    items: { type: "string" },
    description: "Column titles; padded if fewer than columns",
  },
  rows: {
    type: "array",
    items: { type: "array", items: { type: "string" } },
    description: "Explicit cell data, row-major",
  },
  text: { type: "string", description: "Raw text to convert when rows are not given (delimiter auto-detected)" },
  columns: { type: "integer", minimum: 1, maximum: 12 },
  cellDelimiter: { type: "string" },
  linkColumns: {
    type: "array",
    items: { type: "integer", minimum: 0 },
    description: "Zero-based column indexes whose cell values render as links",
  },
  autoLinkUrls: { type: "boolean", description: "Render URL-shaped cells as links (default true)" },
};

const CHART_CARD_PROPERTIES = {
  ...COMMON_CARD_PROPERTIES,
  type: { type: "string", enum: ["bar", "line", "pie", "donut"] },
  labels: { type: "array", items: { type: "string" }, description: "X-axis labels (bar/line)" },
  series: {
    type: "array",
    description: "Data series (bar/line); values must be 0 or greater",
    items: {
      type: "object",
      properties: {
        name: { type: "string" },
        values: { type: "array", items: { type: "number", minimum: 0 } },
      },
      required: ["name", "values"],
    },
  },
  values: {
    type: "array",
    description: "Slices (pie/donut)",
    items: {
      type: "object",
      properties: {
        label: { type: "string" },
        value: { type: "number", minimum: 0 },
      },
      required: ["label", "value"],
    },
  },
  yLabel: { type: "string" },
  description: { type: "string" },
};

const FORM_CARD_PROPERTIES = {
  ...COMMON_CARD_PROPERTIES,
  description: { type: "string", description: "Help text shown above the fields" },
  submitLabel: { type: "string" },
  promptTemplate: {
    type: "string",
    description: "Prompt sent on submit; {{fieldName}} tokens are replaced with values",
  },
  fields: {
    type: "array",
    minItems: 1,
    items: {
      type: "object",
      properties: {
        name: { type: "string" },
        label: { type: "string" },
        type: {
          type: "string",
          enum: ["text", "textarea", "select", "checkbox", "radio", "number", "email", "url", "date", "hidden"],
        },
        options: {
          type: "array",
          description: "Choices for select/checkbox/radio; strings or { label, value } objects",
          items: {},
        },
        required: { type: "boolean" },
        placeholder: { type: "string" },
        value: { type: "string" },
        help: { type: "string" },
      },
      required: ["name"],
    },
  },
};

const REVEAL_CARD_PROPERTIES = {
  ...COMMON_CARD_PROPERTIES,
  sections: {
    type: "array",
    minItems: 1,
    description:
      "Collapsible sections. Give each section markdown, html, or text content (non-empty).",
    items: {
      type: "object",
      properties: {
        heading: { type: "string" },
        markdown: { type: "string" },
        content: { type: "string", description: "Alias of markdown" },
        text: { type: "string" },
        html: { type: "string", description: "HTML content (sanitized to an allowlisted subset)" },
        open: { type: "boolean", description: "Start the section expanded" },
      },
      required: ["heading"],
    },
  },
};

const LIST_CARD_PROPERTIES = {
  ...COMMON_CARD_PROPERTIES,
  intro: { type: "string", description: "Optional plain-text intro shown above the outline" },
  items: {
    type: "array",
    minItems: 1,
    description: "Outline items; nest with children arrays of the same { text, children } shape",
    items: {
      type: "object",
      properties: {
        text: { type: "string" },
        children: { type: "array", items: { type: "object" }, description: "Nested items of the same shape" },
      },
      required: ["text"],
    },
  },
};

const MARKDOWN_CARD_PROPERTIES = {
  ...COMMON_CARD_PROPERTIES,
  title: { type: "string", description: "Card title; defaults to the document's first H1" },
  markdown: { type: "string", description: "The markdown document to render" },
  splitSections: {
    type: "boolean",
    description: "Fold H2 sections into collapsible reveals (default true)",
  },
  openFirst: { type: "boolean", description: "With folding, open the first section initially (default true)" },
};

const VIDEO_CARD_PROPERTIES = {
  ...COMMON_CARD_PROPERTIES,
  src: {
    type: "string",
    description:
      "Direct video file URL (mp4/webm), data:video/* URI, or blob: URL. Not a streaming platform page URL.",
  },
  poster: { type: "string", description: "Optional poster image URL" },
  description: { type: "string", description: "Help text shown above the player" },
};

const KIND_SCHEMAS = {
  tabs: TAB_CARD_PROPERTIES,
  table: TABLE_CARD_PROPERTIES,
  chart: CHART_CARD_PROPERTIES,
  form: FORM_CARD_PROPERTIES,
  "show-hide": REVEAL_CARD_PROPERTIES,
  list: LIST_CARD_PROPERTIES,
  document: MARKDOWN_CARD_PROPERTIES,
  video: VIDEO_CARD_PROPERTIES,
};

// Required fields per kind, mirroring the matching create action. update_card
// derives its discriminated per-kind schema from these plus KIND_SCHEMAS.
const KIND_REQUIRED_FIELDS = {
  tabs: ["title", "tabs"],
  table: ["title"],
  chart: ["title", "type"],
  form: ["title", "fields"],
  "show-hide": ["title", "sections"],
  list: ["title", "items"],
  document: ["markdown"],
  video: ["title", "src"],
};

function cardActionSchema(properties, required) {
  return { type: "object", properties, required };
}

function makeCreateAction(name, kind, description, properties, required) {
  return {
    name,
    description,
    inputSchema: cardActionSchema(properties, required),
    handler: (ctx) => {
      try {
        return createCardAction(ctx, kind);
      } catch (error) {
        return actionError(error);
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Canvas
// ---------------------------------------------------------------------------

const canvas = createCanvas({
  id: "chat-cards",
  displayName: "Chat Cards",
  description:
    "Interactive card deck for explaining things visually: tab cards, tables, SVG charts, forms whose " +
    "submissions come back to the conversation as prompts, show/hide sections, numbered outlines, " +
    "rendered markdown documents, and short video clips. " +
    "Use it for research, education, professional and hobbyist skills, history, and news topics " +
    "whenever a card communicates better than text. Cards render only in the canvas, so also state " +
    "each card's key conclusion in the conversation.",
  inputSchema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Optional canvas title" },
    },
  },
  actions: [
    makeCreateAction(
      "create_tab_card",
      "tabs",
      "Render an interactive card with tabs, each showing a different context of the same subject " +
        "(for example one tab per programming language, OS, or skill level). Tab content can be " +
        "markdown, plain text, HTML, or code with a copy button.",
      TAB_CARD_PROPERTIES,
      ["title", "tabs"],
    ),
    makeCreateAction(
      "create_table_card",
      "table",
      "Render an HTML table card from explicit rows, or convert loosely delimited text into a " +
        "balanced table (delimiter auto-detected; newlines can mark cells). URL cells become links.",
      TABLE_CARD_PROPERTIES,
      ["title"],
    ),
    makeCreateAction(
      "create_chart_card",
      "chart",
      "Render a dynamically generated SVG chart card (bar, line, pie, or donut) with a legend and " +
        "a collapsible data table. Use for useful graphics summarizing referenced data.",
      CHART_CARD_PROPERTIES,
      ["title", "type"],
    ),
    makeCreateAction(
      "create_form_card",
      "form",
      "Render a form card the user fills in to give the conversation context and direction. " +
        "Submitting sends the values back to the conversation as the next prompt (optionally shaped " +
        "by promptTemplate with {{fieldName}} tokens). Check get_form_responses if no prompt arrives.",
      FORM_CARD_PROPERTIES,
      ["title", "fields"],
    ),
    makeCreateAction(
      "create_reveal_card",
      "show-hide",
      "Render a card of collapsible show/hide sections with show-all/hide-all controls. Good for " +
        "FAQs, step-by-step detail, and progressive disclosure.",
      REVEAL_CARD_PROPERTIES,
      ["title", "sections"],
    ),
    makeCreateAction(
      "create_list_card",
      "list",
      "Render a nested sequential outline card numbered 1., 1.1., 1.1.1. for plans, procedures, " +
        "and structured overviews.",
      LIST_CARD_PROPERTIES,
      ["title", "items"],
    ),
    makeCreateAction(
      "create_markdown_card",
      "document",
      "Render a markdown document (a guide or walkthrough you wrote) as one interactive card: the " +
        "first H1 becomes the title, H2 sections fold into show/hide reveals, tables get card " +
        "styling, and fenced code gets copy buttons. Pass the markdown content inline.",
      MARKDOWN_CARD_PROPERTIES,
      ["markdown"],
    ),
    makeCreateAction(
      "create_video_card",
      "video",
      "Render a card with an HTML video player for a short clip. src must point straight at a " +
        "video file (mp4/webm), not a streaming platform page: a direct http(s) URL, a small " +
        "data:video/* URI, or a blob: URL.",
      VIDEO_CARD_PROPERTIES,
      ["title", "src"],
    ),
    {
      name: "update_card",
      description:
        "Re-render an existing card in place, keeping its position in the deck. Pass the cardId, " +
        "the card's kind, and the full replacement spec in the same shape the matching create " +
        "action takes.",
      inputSchema: {
        type: "object",
        description:
          "Discriminated by kind: each branch takes cardId, kind, and the full replacement " +
          "fields (with the same required fields) of the matching create action.",
        oneOf: Object.entries(KIND_SCHEMAS).map(([kind, properties]) => ({
          type: "object",
          properties: {
            cardId: { type: "string", description: "The id returned when the card was created" },
            kind: { type: "string", enum: [kind] },
            ...properties,
          },
          required: ["cardId", "kind", ...KIND_REQUIRED_FIELDS[kind]],
          additionalProperties: true,
        })),
      },
      handler: (ctx) => {
        try {
          const instance = getInstance(ctx.instanceId, ctx.sessionId);
          const { cardId, kind, ...spec } = ctx.input ?? {};
          const index = findCardIndex(instance, cardId);
          if (index === -1) return { error: `No card with id "${cardId}". Use list_cards to see the deck.` };
          const card = buildCard(kind, spec);
          // Keep the original id so the canvas replaces the card in place.
          card.articleHtml = card.articleHtml.replace(`data-card-id="${card.id}"`, `data-card-id="${cardId}"`);
          card.config.id = cardId;
          card.id = cardId;
          instance.cards[index] = card;
          markDirty(instance);
          broadcast(ctx.instanceId, "upsert", { card });
          return { ok: true, cardId, kind: card.kind, title: card.title, summary: `Updated card in place. ${card.summary}` };
        } catch (error) {
          return actionError(error);
        }
      },
    },
    {
      name: "remove_card",
      description: "Remove one card from the deck by id.",
      inputSchema: {
        type: "object",
        properties: { cardId: { type: "string" } },
        required: ["cardId"],
      },
      handler: (ctx) => {
        const instance = getInstance(ctx.instanceId, ctx.sessionId);
        const index = findCardIndex(instance, ctx.input?.cardId);
        if (index === -1) return { error: `No card with id "${ctx.input?.cardId}".` };
        const [removed] = instance.cards.splice(index, 1);
        markDirty(instance);
        broadcast(ctx.instanceId, "remove", { cardId: removed.id });
        return { ok: true, removed: { cardId: removed.id, kind: removed.kind, title: removed.title } };
      },
    },
    {
      name: "clear_cards",
      description: "Remove every card from the deck.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      handler: (ctx) => {
        const instance = getInstance(ctx.instanceId, ctx.sessionId);
        const count = instance.cards.length;
        instance.cards = [];
        markDirty(instance);
        broadcast(ctx.instanceId, "clear", {});
        return { ok: true, removedCount: count };
      },
    },
    {
      name: "list_cards",
      description:
        "List the cards currently in the deck (id, kind, title) in display order. The user may " +
        "have reordered or removed cards since they were created.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      handler: (ctx) => {
        const instance = getInstance(ctx.instanceId, ctx.sessionId);
        return { ok: true, count: instance.cards.length, cards: cardListing(instance) };
      },
    },
    {
      name: "get_form_responses",
      description:
        "Read form submissions received from the canvas, newest first. Submissions normally arrive " +
        "as conversation prompts too; use this when one did not come through or to review earlier " +
        "answers.",
      inputSchema: {
        type: "object",
        properties: {
          cardId: { type: "string", description: "Only submissions from this form card" },
        },
      },
      handler: (ctx) => {
        const instance = getInstance(ctx.instanceId, ctx.sessionId);
        const wanted = ctx.input?.cardId;
        const responses = instance.submissions
          .filter((submission) => !wanted || submission.cardId === wanted)
          .slice()
          .reverse();
        return { ok: true, count: responses.length, responses };
      },
    },
  ],
  open: async (ctx) => {
    const instance = getInstance(ctx.instanceId, ctx.sessionId);
    const { port } = await startCanvasServer(ctx.instanceId);
    return {
      url: `http://127.0.0.1:${port}/?instance=${encodeURIComponent(ctx.instanceId)}&token=${instance.token}`,
      title: ctx.input?.title || "Chat Cards",
      status: instance.cards.length > 0 ? `${instance.cards.length} card(s)` : "Ready",
    };
  },
  onClose: (ctx) => {
    // Closing the panel (by the user, the agent, or the host on its way
    // down) must not discard the deck; the canvas can be reopened and the
    // cards are expected to still be there. Only the live SSE connections
    // and this panel's page server go; the deck stays in memory and is
    // flushed to disk.
    const clients = sseClients.get(ctx.instanceId);
    if (clients) {
      for (const res of clients) {
        try {
          res.end();
        } catch {}
      }
      sseClients.delete(ctx.instanceId);
    }
    stopCanvasServer(ctx.instanceId);
    if (instances.has(ctx.instanceId)) flushStateSync();
  },
});

// ---------------------------------------------------------------------------
// Local HTTP server behind the canvas page
// ---------------------------------------------------------------------------

function json(res, code, data) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let received = 0;
    req.on("data", (chunk) => {
      received += chunk.length;
      if (received > MAX_BODY_BYTES) {
        req.destroy();
        reject(new Error("Request body too large."));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const body = Buffer.concat(chunks).toString("utf8");
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Request body must be valid JSON."));
      }
    });
    req.on("error", reject);
  });
}

async function handleCanvasRequest(req, res) {
  let url;
  try {
    url = new URL(req.url, `http://${req.headers.host ?? "127.0.0.1"}`);
  } catch {
    res.writeHead(400);
    res.end("Bad request");
    return;
  }
  const instanceId = url.searchParams.get("instance");
  const token = url.searchParams.get("token");
  if (!instanceId || !validateToken(instanceId, token)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  const instance = getInstance(instanceId);

  try {
    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(CANVAS_PAGE);
      return;
    }

    if (req.method === "GET" && url.pathname === "/events") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      if (!sseClients.has(instanceId)) sseClients.set(instanceId, new Set());
      sseClients.get(instanceId).add(res);
      req.on("close", () => {
        const clients = sseClients.get(instanceId);
        if (clients) clients.delete(res);
      });
      res.write(`event: init\ndata: ${JSON.stringify({ cards: instance.cards })}\n\n`);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/state") {
      json(res, 200, { cards: instance.cards });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/submit") {
      const body = await readJsonBody(req);
      const prompt = String(body.prompt ?? "").slice(0, MAX_PROMPT_CHARS);
      if (!prompt.trim()) {
        json(res, 400, { error: "A non-empty prompt is required." });
        return;
      }
      const cardId = typeof body.cardId === "string" ? body.cardId : null;
      const cardIndex = cardId ? findCardIndex(instance, cardId) : -1;
      const values = body.values && typeof body.values === "object" && !Array.isArray(body.values) ? body.values : {};
      const delivered = await sendPrompt(prompt);
      instance.submissions.push({
        id: crypto.randomBytes(6).toString("hex"),
        cardId,
        cardTitle: cardIndex === -1 ? null : instance.cards[cardIndex].title,
        values,
        prompt,
        delivered,
        receivedAt: new Date().toISOString(),
      });
      while (instance.submissions.length > MAX_SUBMISSIONS) instance.submissions.shift();
      markDirty(instance);
      json(res, 200, { ok: true, delivered });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/prompt") {
      const body = await readJsonBody(req);
      const prompt = String(body.prompt ?? "").slice(0, MAX_PROMPT_CHARS);
      if (!prompt.trim()) {
        json(res, 400, { error: "A non-empty prompt is required." });
        return;
      }
      const delivered = await sendPrompt(prompt);
      json(res, 200, { ok: true, delivered });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/remove") {
      const body = await readJsonBody(req);
      const index = findCardIndex(instance, String(body.cardId ?? ""));
      if (index !== -1) {
        const [removed] = instance.cards.splice(index, 1);
        markDirty(instance);
        broadcast(instanceId, "remove", { cardId: removed.id });
      }
      json(res, 200, { ok: true });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/reorder") {
      const body = await readJsonBody(req);
      const order = Array.isArray(body.order) ? body.order.map(String) : [];
      const byId = new Map(instance.cards.map((card) => [card.id, card]));
      const reordered = [];
      for (const cardId of order) {
        const card = byId.get(cardId);
        if (card) {
          reordered.push(card);
          byId.delete(cardId);
        }
      }
      // Cards missing from the requested order (for example one created while
      // the drag was in flight) keep their relative position at the end.
      for (const card of instance.cards) {
        if (byId.has(card.id)) reordered.push(card);
      }
      instance.cards = reordered;
      markDirty(instance);
      broadcast(instanceId, "reorder", { order: instance.cards.map((card) => card.id) });
      json(res, 200, { ok: true });
      return;
    }

    res.writeHead(404);
    res.end("Not found");
  } catch (error) {
    json(res, 400, { error: error instanceof Error ? error.message : "Bad request" });
  }
}

// ---------------------------------------------------------------------------
// Per-panel page servers
// ---------------------------------------------------------------------------
// A server exists only while its canvas panel is open: open() starts it and
// onClose() stops it. While no panel is showing, this process holds no
// sockets at all; it is just an RPC child of the host serving actions.
//
// Servers bind OUTSIDE the OS dynamic port range (49152+). The Copilot app's
// own single-instance WebSocket takes an ephemeral port from that range, and
// a canvas page orphaned by a stopped extension process keeps retrying its
// old origin for a while; binding down here guarantees those retries can
// only ever land on a port this extension family owns, never on a recycled
// port the app's reopen handshake depends on.

const PORT_RANGE_START = 21750;
const PORT_RANGE_SIZE = 40;

// instanceId -> { server, sockets: Set, port }
const canvasServers = new Map();

function tryListen(server, target) {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(target, "127.0.0.1");
  });
}

async function startCanvasServer(instanceId) {
  const existing = canvasServers.get(instanceId);
  if (existing) return existing;

  const server = http.createServer(handleCanvasRequest);
  const sockets = new Set();
  // Connections are tracked for teardown and unref'd on arrival so an open
  // keep-alive or SSE socket can never keep this process alive by itself.
  server.on("connection", (socket) => {
    socket.unref();
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });

  const entry = { server, sockets, port: 0 };
  const offset = crypto.randomInt(PORT_RANGE_SIZE);
  for (let i = 0; i < PORT_RANGE_SIZE && entry.port === 0; i++) {
    const candidate = PORT_RANGE_START + ((offset + i) % PORT_RANGE_SIZE);
    try {
      await tryListen(server, candidate);
      entry.port = candidate;
    } catch {
      // In use (another open panel or another session's process): next slot.
    }
  }
  if (entry.port === 0) {
    // Every slot taken: fall back to an ephemeral port rather than failing.
    await tryListen(server, 0);
    entry.port = server.address().port;
  }
  // The listener itself must never be what keeps this process alive.
  server.unref();
  canvasServers.set(instanceId, entry);
  return entry;
}

function stopCanvasServer(instanceId) {
  const entry = canvasServers.get(instanceId);
  if (!entry) return;
  canvasServers.delete(instanceId);
  try {
    entry.server.close();
  } catch {}
  for (const socket of entry.sockets) {
    try {
      socket.destroy();
    } catch {}
  }
}

// ---------------------------------------------------------------------------
// Lifecycle: this process must never outlive the Copilot app
// ---------------------------------------------------------------------------
// The SDK talks to the host over stdio and only flips an internal
// "disconnected" flag when that pipe closes; nothing ends the process on
// its own. Two layers keep this process from outliving the app: every
// end-of-life signal below leads to an explicit flush-and-exit, and nothing
// this extension owns (page servers, their sockets, the persistence timer)
// refs the event loop, so the host's stdio pipe is the only thing keeping
// it alive at all.

let shuttingDown = false;

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  flushStateSync();
  for (const clients of sseClients.values()) {
    for (const res of clients) {
      try {
        res.end();
      } catch {}
    }
  }
  sseClients.clear();
  for (const instanceId of [...canvasServers.keys()]) {
    stopCanvasServer(instanceId);
  }
  // Deliberately kept referenced: exit is guaranteed even if a handle the
  // SDK or a dependency owns refuses to close.
  setTimeout(() => process.exit(0), 150);
}

// The stdio pipe to the host is the ground truth: when the app goes away,
// stdin ends. Signals cover a graceful stop, "disconnect" an IPC parent.
process.stdin.on("end", shutdown);
process.stdin.on("close", shutdown);
process.on("disconnect", shutdown);
for (const signal of ["SIGTERM", "SIGINT", "SIGHUP", "SIGBREAK"]) {
  try {
    process.on(signal, shutdown);
  } catch {}
}
// If the event loop drains naturally instead, still write the deck out.
process.on("exit", flushStateSync);

// Nothing refs the event loop until the session join wires up stdio, so
// hold it open across the join, then hand that job to the stdio pipe.
const bootKeepalive = setInterval(() => {}, 60000);
session = await joinSession({ canvases: [canvas] });
clearInterval(bootKeepalive);

// The host also announces the end of the session as a first-class event.
try {
  session.on("session.shutdown", shutdown);
} catch {
  // An SDK build without this event type still exits via the stdio hooks.
}

// Extension: chat-cards
// GitHub Copilot canvas port of the mcp-chat-cards MCP server. The agent
// builds interactive cards (tabs, tables, charts, forms, show/hide sections,
// sequential lists, markdown documents, video) through canvas actions; the
// canvas renders them as a live deck. Form submissions and per-card context
// actions travel back to the conversation as prompts via session.send.
//
// All rendering lives in cards-core.mjs (dependency-free, testable without
// the SDK); this file wires the canvas/session lifecycle, the local HTTP +
// SSE server behind the canvas page, and the action surface.
import http from "node:http";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { joinSession, createCanvas } from "@github/copilot-sdk/extension";
import { buildCard, CARD_BUILDERS } from "./cards-core.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CANVAS_PAGE = readFileSync(path.join(__dirname, "assets", "canvas.html"), "utf8");

// Deck limits. The MCP server keeps the last 24 rendered cards; a live deck
// can hold more, but it is still a conversation surface, not a database.
const MAX_CARDS = 60;
const MAX_SUBMISSIONS = 50;
const MAX_BODY_BYTES = 1024 * 1024;
const MAX_PROMPT_CHARS = 16000;

let session = null;

// instanceId -> { token, cards: [], submissions: [] }
const instances = new Map();
// instanceId -> Set of SSE responses
const sseClients = new Map();

function getInstance(instanceId) {
  let instance = instances.get(instanceId);
  if (!instance) {
    instance = {
      token: crypto.randomBytes(16).toString("hex"),
      cards: [],
      submissions: [],
    };
    instances.set(instanceId, instance);
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
function createCardAction(instanceId, kind, input) {
  const instance = getInstance(instanceId);
  const card = buildCard(kind, input ?? {});
  instance.cards.push(card);
  let note = "";
  while (instance.cards.length > MAX_CARDS) {
    const dropped = instance.cards.shift();
    broadcast(instanceId, "remove", { cardId: dropped.id });
    note = ` The deck was at its ${MAX_CARDS}-card limit, so the oldest card ("${dropped.title}") was removed.`;
  }
  broadcast(instanceId, "upsert", { card });
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
// Shared schema fragments (mirroring the MCP server's zod schemas)
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
    description: "Data series (bar/line)",
    items: {
      type: "object",
      properties: {
        name: { type: "string" },
        values: { type: "array", items: { type: "number" } },
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
        return createCardAction(ctx.instanceId, kind, ctx.input);
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
    "rendered markdown documents, and short video clips. Ported from the mcp-chat-cards MCP server. " +
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
        properties: {
          cardId: { type: "string", description: "The id returned when the card was created" },
          kind: { type: "string", enum: Object.keys(CARD_BUILDERS) },
        },
        required: ["cardId", "kind"],
        additionalProperties: true,
      },
      handler: (ctx) => {
        try {
          const instance = getInstance(ctx.instanceId);
          const { cardId, kind, ...spec } = ctx.input ?? {};
          const index = findCardIndex(instance, cardId);
          if (index === -1) return { error: `No card with id "${cardId}". Use list_cards to see the deck.` };
          const card = buildCard(kind, spec);
          // Keep the original id so the canvas replaces the card in place.
          card.articleHtml = card.articleHtml.replace(`data-card-id="${card.id}"`, `data-card-id="${cardId}"`);
          card.config.id = cardId;
          card.id = cardId;
          instance.cards[index] = card;
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
        const instance = getInstance(ctx.instanceId);
        const index = findCardIndex(instance, ctx.input?.cardId);
        if (index === -1) return { error: `No card with id "${ctx.input?.cardId}".` };
        const [removed] = instance.cards.splice(index, 1);
        broadcast(ctx.instanceId, "remove", { cardId: removed.id });
        return { ok: true, removed: { cardId: removed.id, kind: removed.kind, title: removed.title } };
      },
    },
    {
      name: "clear_cards",
      description: "Remove every card from the deck.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      handler: (ctx) => {
        const instance = getInstance(ctx.instanceId);
        const count = instance.cards.length;
        instance.cards = [];
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
        const instance = getInstance(ctx.instanceId);
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
        const instance = getInstance(ctx.instanceId);
        const wanted = ctx.input?.cardId;
        const responses = instance.submissions
          .filter((submission) => !wanted || submission.cardId === wanted)
          .slice()
          .reverse();
        return { ok: true, count: responses.length, responses };
      },
    },
  ],
  open: (ctx) => {
    const instance = getInstance(ctx.instanceId);
    return {
      url: `http://127.0.0.1:${port}/?instance=${encodeURIComponent(ctx.instanceId)}&token=${instance.token}`,
      title: ctx.input?.title || "Chat Cards",
      status: instance.cards.length > 0 ? `${instance.cards.length} card(s)` : "Ready",
    };
  },
  onClose: (ctx) => {
    const clients = sseClients.get(ctx.instanceId);
    if (clients) {
      for (const res of clients) {
        try {
          res.end();
        } catch {}
      }
      sseClients.delete(ctx.instanceId);
    }
    instances.delete(ctx.instanceId);
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

const server = http.createServer(async (req, res) => {
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
      broadcast(instanceId, "reorder", { order: instance.cards.map((card) => card.id) });
      json(res, 200, { ok: true });
      return;
    }

    res.writeHead(404);
    res.end("Not found");
  } catch (error) {
    json(res, 400, { error: error instanceof Error ? error.message : "Bad request" });
  }
});

const port = await new Promise((resolve) => {
  server.listen(0, "127.0.0.1", () => resolve(server.address().port));
});

session = await joinSession({ canvases: [canvas] });

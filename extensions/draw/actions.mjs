// Agent-callable actions for the Draw canvas. Each action works on the drawing
// that the calling canvas instance is showing.
import {
  SHAPE_TYPES, COLORS, FILLS, HEADS, ROUTES, SIZE_KEYS, isShape,
  normalizeElement, removeWithArrows, staticPaint, LIGHT_PALETTE, DARK_PALETTE,
} from "./lib/model.mjs";
import { DIRECTIONS, buildFromSpec, relayout, describe } from "./lib/layout.mjs";
import { approxMeasure, neededHeight } from "./lib/geometry.mjs";
import { renderStandaloneSVG } from "./lib/render.mjs";
import { THEMES } from "./settings.mjs";

const OUTLINE_LIMIT = 80;

const str = (description) => ({ type: "string", description });
const num = (description) => ({ type: "number", description });
const color = { type: "string", enum: COLORS, description: "Color. gray is the default." };
const fill = { type: "string", enum: FILLS, description: "none (outline only), soft (light tint, the default) or solid (strong color)." };
const size = { type: "string", enum: SIZE_KEYS, description: "Text size: s, m, l or xl. Shapes default to m, text to l." };
const dashed = { type: "boolean", description: "Draw a dashed line." };
const head = { type: "string", enum: HEADS, description: "Arrowheads: end (the default), start, both or none." };
const route = { type: "string", enum: ROUTES, description: "Arrow path: straight (the default), elbow (right angles) or curve." };
const direction = { type: "string", enum: DIRECTIONS, description: "Which way the diagram flows. right is the default." };
const shape = {
  type: "string",
  enum: SHAPE_TYPES,
  description: "rect (the default: a step or component), ellipse (start or end), diamond (a decision) or cylinder (a database or storage).",
};

const nodeSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: str('Short id that edges can refer to, like "api". Defaults to one made from the label.'),
    label: str("Text inside the shape. Use \\n for a line break."),
    shape, color, fill, dashed, size,
    x: num("Left edge in pixels. Give x and y together, or leave both out for automatic layout."),
    y: num("Top edge in pixels. y grows downward."),
    w: num("Width in pixels. Defaults to fit the label."),
    h: num("Height in pixels. Defaults to fit the label."),
  },
};
const edgeSchema = {
  type: "object",
  additionalProperties: false,
  required: ["from", "to"],
  properties: {
    from: str("Id or exact label of the shape the arrow starts at."),
    to: str("Id or exact label of the shape the arrow points to."),
    label: str("Optional text on the arrow."),
    id: str("Optional arrow id."),
    color, dashed, head, route,
  },
};
const textSchema = {
  type: "object",
  additionalProperties: false,
  required: ["text"],
  properties: {
    text: str("The text. Use \\n for a line break."),
    id: str("Optional id."),
    color, size,
    x: num("Left edge in pixels. Leave out x and y to put it above the diagram, like a title."),
    y: num("Top edge in pixels."),
  },
};
const updateSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id"],
  properties: {
    id: str("Id of the element to change."),
    label: str("New label or text. An empty string clears it."),
    shape, color, fill, dashed, size, head, route,
    x: num("New left edge (shapes and text)."),
    y: num("New top edge (shapes and text)."),
    w: num("New width (shapes)."),
    h: num("New height (shapes)."),
    from: str("Arrows only: id of the shape the arrow should start at."),
    to: str("Arrows only: id of the shape the arrow should point to."),
  },
};
const specProps = {
  nodes: { type: "array", items: nodeSchema, maxItems: 500, description: "Shapes with labels." },
  edges: { type: "array", items: edgeSchema, maxItems: 1000, description: "Arrows between shapes. They stay attached when shapes move." },
  texts: { type: "array", items: textSchema, maxItems: 200, description: "Free text, like a title or a note." },
  direction,
};

const APPLIES = {
  shape: ["label", "shape", "color", "fill", "dashed", "size", "x", "y", "w", "h"],
  text: ["label", "color", "size", "x", "y"],
  arrow: ["label", "color", "dashed", "size", "head", "route", "from", "to"],
  pen: ["color"],
};

function patchElement(el, u, byId) {
  const kind = isShape(el) ? "shape" : el.type;
  const allowed = APPLIES[kind] || [];
  const ignored = Object.keys(u).filter((k) => k !== "id" && !allowed.includes(k));
  const p = { ...el };
  const set = (key, prop = key) => {
    if (u[key] !== undefined && allowed.includes(key)) p[prop] = u[key];
  };
  set("label", "text");
  set("color");
  set("size");
  set("fill");
  set("dashed", "dash");
  set("head");
  set("route");
  set("x");
  set("y");
  set("w");
  set("h");
  set("shape", "type");
  for (const end of ["from", "to"]) {
    if (u[end] === undefined || kind !== "arrow") continue;
    if (!isShape(byId.get(u[end]))) return { error: `Arrow "${el.id}": "${u[end]}" is not the id of a shape.` };
    p[end] = u[end];
  }
  if (kind === "arrow" && p.from && p.from === p.to) return { error: `Arrow "${el.id}" cannot start and end at the same shape.` };
  let next = normalizeElement(p);
  // Like the editor, grow a shape's height to fit a longer label, keeping its center.
  if (kind === "shape" && u.h === undefined && ["label", "size", "shape", "w"].some((k) => u[k] !== undefined)) {
    const need = neededHeight(next, approxMeasure);
    if (need > next.h) {
      next = normalizeElement({ ...next, h: need, y: u.y === undefined ? next.y - (need - next.h) / 2 : next.y });
    }
  }
  return { el: next, ignored };
}

// Wraps handlers with schema boilerplate and the lookup of the instance's drawing.
export function makeActions({ runtime, CanvasError }) {
  const fail = (code, message) => {
    throw new CanvasError(code, message);
  };
  const specErrors = (errors) => fail("invalid_diagram", `Nothing was changed. Fix these and try again:\n- ${errors.join("\n- ")}`);

  const action = (name, description, properties, required, handler) => ({
    name,
    description,
    inputSchema: { type: "object", properties, required, additionalProperties: false },
    handler: async (ctx) => {
      const { store, server } = await runtime(ctx);
      const doc = server.ensureDrawing(ctx.instanceId);
      return handler({ store, server, doc, instanceId: ctx.instanceId }, ctx.input || {});
    },
  });

  const summary = (doc, message, changedIds) => {
    const result = { ok: true, message, drawing: { id: doc.id, name: doc.name, rev: doc.rev } };
    if (changedIds) result.changedIds = changedIds;
    if (doc.elements.length <= OUTLINE_LIMIT) result.outline = describe(doc);
    else result.note = `The drawing has ${doc.elements.length} elements. Call get_drawing to see all of them.`;
    return result;
  };

  return [
    action(
      "get_drawing",
      "Read the drawing shown in this canvas: an outline of every element with its id, label, position, size and style, plus the ids the user has selected right now. Coordinates are pixels, x grows right and y grows down.",
      { includeElements: { type: "boolean", description: "Also return the raw element JSON. Usually the outline is enough." } },
      [],
      ({ store, server, doc, instanceId }, input) => {
        const result = {
          drawing: { id: doc.id, name: doc.name, rev: doc.rev, updatedAt: doc.updatedAt, file: store.filePath(doc.id) },
          outline: describe(doc),
          selectedIds: server.selection(instanceId, doc.id),
          canvasOpen: server.hasClient(instanceId),
        };
        if (input.includeElements) result.elements = doc.elements;
        return result;
      },
    ),

    action(
      "set_diagram",
      "Replace the whole drawing with a new diagram. List nodes (labeled shapes) and edges (arrows between node ids or labels), and the layout is done for you unless you give x and y. Best for drawing something from scratch. The user can undo it in the canvas.",
      { ...specProps, name: str("Optional new name for the drawing.") },
      ["nodes"],
      ({ store, doc }, input) => {
        const spec = { nodes: input.nodes || [], edges: input.edges || [], texts: input.texts || [] };
        const { elements, errors } = buildFromSpec(spec, { existing: [], direction: input.direction || "right", measure: approxMeasure });
        if (errors.length) specErrors(errors);
        if (input.name && input.name.trim()) store.rename(doc.id, input.name);
        const next = store.replace(doc.id, elements, "agent");
        return summary(next, `Drew ${elements.length} elements.`);
      },
    ),

    action(
      "add_elements",
      "Add nodes, edges and text to the drawing without touching what is already there. Edges can connect to existing shapes by id or by exact label, and new nodes are placed next to the shapes they connect to.",
      specProps,
      [],
      ({ store, doc }, input) => {
        const spec = { nodes: input.nodes || [], edges: input.edges || [], texts: input.texts || [] };
        if (!spec.nodes.length && !spec.edges.length && !spec.texts.length) fail("invalid_input", "Give at least one node, edge or text.");
        const { elements, errors } = buildFromSpec(spec, { existing: doc.elements, direction: input.direction || "right", measure: approxMeasure });
        if (errors.length) specErrors(errors);
        const next = store.applyOps(doc.id, { upserts: elements }, "agent");
        return summary(next, `Added ${elements.length} elements.`, elements.map((e) => e.id));
      },
    ),

    action(
      "update_elements",
      "Change existing elements by id: label, shape, color, fill, dashed, text size, position (x, y), box size (w, h), or for arrows their ends (from, to), head and route. Shapes grow taller to fit a longer label.",
      { updates: { type: "array", items: updateSchema, minItems: 1, maxItems: 1000 } },
      ["updates"],
      ({ store, doc }, input) => {
        const byId = new Map(doc.elements.map((e) => [e.id, e]));
        const changed = new Map();
        const errors = [];
        const warnings = [];
        for (const u of input.updates) {
          const current = changed.get(u.id) || byId.get(u.id);
          if (!current) {
            errors.push(`No element has the id "${u.id}".`);
            continue;
          }
          const res = patchElement(current, u, byId);
          if (res.error) {
            errors.push(res.error);
            continue;
          }
          if (res.ignored.length) {
            const kind = isShape(current) ? "shape" : current.type;
            warnings.push(`"${u.id}" is ${/^[aeiou]/.test(kind) ? "an" : "a"} ${kind}, so ${res.ignored.join(", ")} did not apply.`);
          }
          changed.set(u.id, res.el);
        }
        if (errors.length) fail("invalid_update", `Nothing was changed:\n- ${errors.join("\n- ")}`);
        const next = store.applyOps(doc.id, { upserts: [...changed.values()] }, "agent");
        const result = summary(next, `Updated ${changed.size} elements.`, [...changed.keys()]);
        if (warnings.length) result.warnings = warnings;
        return result;
      },
    ),

    action(
      "delete_elements",
      "Delete elements by id. Arrows attached to a deleted shape are deleted too.",
      { ids: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 5000 } },
      ["ids"],
      ({ store, doc }, input) => {
        const known = new Set(doc.elements.map((e) => e.id));
        const missing = input.ids.filter((id) => !known.has(id));
        const { removed } = removeWithArrows(doc.elements, input.ids.filter((id) => known.has(id)));
        if (!removed.length) fail("not_found", `No elements have these ids: ${missing.join(", ")}. Call get_drawing to see the ids.`);
        const next = store.applyOps(doc.id, { deletes: removed }, "agent");
        const result = summary(next, `Deleted ${removed.length} elements.`, removed);
        if (missing.length) result.missingIds = missing;
        return result;
      },
    ),

    action(
      "layout",
      "Tidy up the drawing by re-arranging all shapes into neat layers that follow the arrows. Text and pen strokes stay where they are.",
      { direction },
      [],
      ({ store, doc }, input) => {
        if (!doc.elements.some(isShape)) fail("empty", "There are no shapes to arrange.");
        const next = store.replace(doc.id, relayout(doc.elements, { direction: input.direction || "right", measure: approxMeasure }), "agent");
        return summary(next, "Re-arranged the shapes.");
      },
    ),

    action(
      "clear",
      "Remove everything from the drawing. The user can undo this in the canvas.",
      {},
      [],
      ({ store, doc }) => summary(store.replace(doc.id, [], "agent"), "Cleared the drawing."),
    ),

    action(
      "export_image",
      "Save the drawing as a PNG or SVG file and return the file path. The image uses the canvas's current theme (light or dark). To look at the drawing yourself, export a PNG and open the path with the view tool.",
      { format: { type: "string", enum: ["png", "svg"], description: "png (the default) or svg." } },
      [],
      async ({ store, server, doc, instanceId }, input) => {
        const format = input.format || "png";
        if (!doc.elements.length) fail("empty", "The drawing is empty, so there is nothing to export.");
        let data = null;
        const pending = server.requestExport(instanceId, format);
        if (pending) {
          try {
            const res = await pending;
            data = format === "png" ? Buffer.from(res.data, "base64") : res.data;
          } catch (err) {
            if (format === "png") fail("export_failed", err.message);
          }
        }
        if (!data || !data.length) {
          if (format === "png") {
            fail("canvas_not_open", 'Saving a PNG needs the Draw canvas to be open on screen. Open it with open_canvas and try again, or use format "svg".');
          }
          // Without the page we cannot know the app's theme, so only an explicit dark choice gives dark.
          const palette = (await server.readSettings()).theme === "dark" ? DARK_PALETTE : LIGHT_PALETTE;
          data = renderStandaloneSVG(doc.elements, { measure: approxMeasure, paint: staticPaint(palette), background: palette.bg });
        }
        const file = await store.writeExport(doc.id, format, data);
        return { ok: true, format, path: file };
      },
    ),

    action(
      "list_drawings",
      "List the drawings saved in this session, newest first.",
      {},
      [],
      ({ store, doc }) => ({ currentId: doc.id, drawings: store.list() }),
    ),

    action(
      "open_drawing",
      "Show another drawing in this canvas, found by name or id. Creates a new empty drawing with that name if none matches.",
      {
        name: str("Name or id of the drawing."),
        create: { type: "boolean", description: "Create the drawing when none matches. Defaults to true." },
      },
      ["name"],
      ({ store, server, instanceId }, input) => {
        let doc = store.find(input.name);
        let created = false;
        if (!doc) {
          if (input.create === false) fail("not_found", `No drawing is named "${input.name}". Call list_drawings to see them.`);
          doc = store.create(input.name);
          created = true;
        }
        server.showDrawing(instanceId, doc);
        return { ...summary(doc, created ? `Created and opened "${doc.name}".` : `Opened "${doc.name}".`), created };
      },
    ),

    action(
      "select_elements",
      "Select elements in the canvas to point them out to the user. Pass an empty list to clear the selection.",
      { ids: { type: "array", items: { type: "string" }, maxItems: 5000 } },
      ["ids"],
      ({ server, doc, instanceId }, input) => {
        const known = new Set(doc.elements.map((e) => e.id));
        const ids = input.ids.filter((id) => known.has(id));
        server.select(instanceId, doc.id, ids);
        const result = { ok: true, selectedIds: ids, canvasOpen: server.hasClient(instanceId) };
        const missing = input.ids.filter((id) => !known.has(id));
        if (missing.length) result.missingIds = missing;
        return result;
      },
    ),

    action(
      "set_theme",
      'Switch the canvas between light and dark. "app" follows the Copilot app\'s theme, which is the default. Only do this when the user asks. The choice is remembered for every session.',
      { theme: { type: "string", enum: THEMES, description: "app (match the Copilot app), light or dark." } },
      ["theme"],
      async ({ server, instanceId }, input) => {
        const settings = await server.updateSettings({ theme: input.theme });
        return { ok: true, theme: settings.theme, canvasOpen: server.hasClient(instanceId) };
      },
    ),
  ];
}

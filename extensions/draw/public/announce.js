// Words for screen readers: what an element is, and a live region that reads out what the
// keyboard just did on the canvas.
export const TYPE_NAMES = {
  rect: "Rectangle",
  ellipse: "Ellipse",
  diamond: "Diamond",
  cylinder: "Database",
  text: "Text",
  arrow: "Arrow",
  pen: "Pen stroke",
};

const words = (s) => String(s || "").replace(/\s+/g, " ").trim();
const quote = (s) => {
  const chars = Array.from(words(s));
  return `"${chars.length > 60 ? `${chars.slice(0, 57).join("")}...` : chars.join("")}"`;
};

// A shape by its label, or by its kind when it has none: "Login", or "a rectangle".
function shapeName(el) {
  if (words(el.text)) return quote(el.text);
  const kind = (TYPE_NAMES[el.type] || "shape").toLowerCase();
  return `${/^[aeiou]/.test(kind) ? "an" : "a"} ${kind}`;
}

// For example: Rectangle "Login", or Arrow from "Login" to a database, labeled "reads".
export function describeElement(el, byId) {
  if (el.type === "pen") return TYPE_NAMES.pen;
  if (el.type === "arrow") {
    const from = el.from ? byId.get(el.from) : null;
    const to = el.to ? byId.get(el.to) : null;
    const ends = `${from ? ` from ${shapeName(from)}` : ""}${to ? ` to ${shapeName(to)}` : ""}`;
    return `Arrow${ends}${words(el.text) ? `, labeled ${quote(el.text)}` : ""}`;
  }
  const type = TYPE_NAMES[el.type] || "Element";
  return words(el.text) ? `${type} ${quote(el.text)}` : `${type} with no label`;
}

// Screen readers skip a message that matches the one before it, so every other message ends in a
// space that is not shown.
export function makeAnnouncer(node) {
  let odd = false;
  return (message) => {
    odd = !odd;
    node.textContent = odd ? message : `${message}\u00a0`;
  };
}

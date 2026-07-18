// Catalog category values.
//
// `category` is a routing key, not display text: the renderer partitions catalog
// items into the Microsoft vs Partners sections by comparing against these exact
// values (see renderCatalogHtml in renderer.mjs). Kept as a frozen enum here,
// rather than free-form strings scattered across the producer, renderer, and
// tests, so the routing contract lives in one place.
//
// Zero-dependency on purpose: renderer.mjs imports this, and renderer.test.mjs
// loads renderer.mjs as a pure string-rendering gate. Sourcing the enum from
// catalog.mjs instead would drag armClient.mjs (the ARM SDK) into that gate.
export const CATEGORY = Object.freeze({
    microsoft: "Microsoft",
    partner: "Partners",
});

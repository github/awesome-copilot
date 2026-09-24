import { createServer } from "node:http";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildSamplePayload, main as testFlow } from "./test-flow.mjs";
import { buildMinimalPdf, buildUploadUrl, main as spUpload } from "./sp-upload-test-file.mjs";
import { main as spfetchMain } from "./spfetch.mjs";

let server;
let base;
let lastRequest;

beforeAll(async () => {
  server = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      lastRequest = { headers: req.headers, body, url: req.url };
      const status = req.url?.includes("fail") ? 401 : 200;
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: status === 200 }));
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
afterAll(() => new Promise((r) => server.close(r)));

const quiet = () => {
  const spies = [vi.spyOn(console, "log"), vi.spyOn(console, "error")].map((s) => s.mockImplementation(() => {}));
  return () => spies.forEach((s) => s.mockRestore());
};

describe("--help y uso incorrecto", () => {
  it("cada script imprime ayuda y sale con 0", async () => {
    const restore = quiet();
    expect(await testFlow(["--help"], {})).toBe(0);
    expect(await spUpload(["--help"], {})).toBe(0);
    expect(await spfetchMain(["--help"])).toBe(0);
    restore();
  });
  it("test-flow sin FLOW_URL sale con 2", async () => {
    const restore = quiet();
    expect(await testFlow([], {})).toBe(2);
    restore();
  });
  it("sp-upload-test-file sin variables sale con 2", async () => {
    const restore = quiet();
    expect(await spUpload([], {})).toBe(2);
    restore();
  });
});

describe("test-flow", () => {
  it("2xx -> 0, manda x-app-key y application/json, con adjunto", async () => {
    const restore = quiet();
    const code = await testFlow(["--with-attachment"], { FLOW_URL: `${base}/ok`, APP_KEY: "clave-test" });
    restore();
    expect(code).toBe(0);
    expect(lastRequest.headers["x-app-key"]).toBe("clave-test");
    expect(lastRequest.headers["content-type"]).toBe("application/json");
    expect(JSON.parse(lastRequest.body).attachments).toHaveLength(1);
  });
  it("no-2xx -> codigo distinto de 0", async () => {
    const restore = quiet();
    const code = await testFlow([], { FLOW_URL: `${base}/fail`, APP_KEY: "x" });
    restore();
    expect(code).toBe(1);
  });
  it("error de red -> 1", async () => {
    const restore = quiet();
    expect(await testFlow(["--timeout", "500"], { FLOW_URL: "http://127.0.0.1:1/x" })).toBe(1);
    restore();
  });
  it("buildSamplePayload sin adjunto lleva attachments vacio y folio dado", () => {
    const p = buildSamplePayload({ folio: "T-1" });
    expect(p.folio).toBe("T-1");
    expect(p.attachments).toEqual([]);
  });
});

describe("sp-upload-test-file", () => {
  it("genera un PDF valido en memoria con xref correcta", () => {
    const pdf = buildMinimalPdf().toString("latin1");
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf.trimEnd().endsWith("%%EOF")).toBe(true);
    const startxref = Number(/startxref\n(\d+)/.exec(pdf)[1]);
    expect(pdf.slice(startxref, startxref + 4)).toBe("xref");
    // cada offset de la tabla apunta al inicio de "N 0 obj"
    const offsets = [...pdf.matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
    offsets.forEach((off, i) => expect(pdf.slice(off, off + 7)).toBe(`${i + 1} 0 obj`));
  });
  it("buildUploadUrl escapa comillas OData y codifica la ruta", () => {
    const url = buildUploadUrl("https://<tenant>.sharepoint.com/sites/x/", "/sites/x/Shared Documents/O'Brien", "a b#1.pdf");
    expect(url).toContain("GetFolderByServerRelativeUrl('/sites/x/Shared%20Documents/O''Brien')");
    expect(url).toContain("Files/add(url='a%20b%231.pdf',overwrite=true)");
    expect(url).not.toContain("x//_api");
  });
  it("--dry-run no llama a la red y sale con 0", async () => {
    const restore = quiet();
    const code = await spUpload(["--dry-run"], { SITE_URL: "https://<tenant>.sharepoint.com/sites/x", FOLDER: "/sites/x/Docs" });
    restore();
    expect(code).toBe(0);
  });
});

import { resolve } from "node:path";
import { createDeckStore } from "./store.mjs";
import { startServer } from "./server.mjs";

const directory = resolve(process.argv[2] || ".preview-data");
const entry = await startServer({ store: createDeckStore(directory), deckId: process.argv[3] || "preview" });
process.stdout.write(`${entry.url}\n`);
process.once("SIGINT", async () => { await entry.close(); process.exit(0); });
process.once("SIGTERM", async () => { await entry.close(); process.exit(0); });

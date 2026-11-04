import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineWorkflow, joinSession } from "@github/copilot-sdk/extension";
import { createWorkflow } from "./lib/workflow.mjs";

const extensionDir = path.dirname(fileURLToPath(import.meta.url));

// stdout carries JSON-RPC: report progress with ctx.log, never console.log.
await joinSession({ workflows: [createWorkflow({ defineWorkflow, extensionDir })] });

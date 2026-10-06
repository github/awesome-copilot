import { joinSession, createCanvas, CanvasError } from "@github/copilot-sdk/extension";
import { createUsageCanvas } from "./canvas.mjs";

let session;
const canvas = createUsageCanvas({ createCanvas, CanvasError, getSession: () => session });
session = await joinSession({ canvases: [canvas] });

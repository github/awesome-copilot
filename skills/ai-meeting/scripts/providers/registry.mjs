import { claudeProvider } from "./claude.mjs";
import { codexProvider } from "./codex.mjs";
import { cursorProvider } from "./cursor.mjs";
import { geminiProvider } from "./gemini.mjs";
import { hermesProvider } from "./hermes.mjs";
import { opencodeProvider } from "./opencode.mjs";
import { qoderProvider } from "./qoder.mjs";

export const providers = {
  codex: codexProvider,
  claude: claudeProvider,
  qoder: qoderProvider,
  opencode: opencodeProvider,
  cursor: cursorProvider,
  gemini: geminiProvider,
  hermes: hermesProvider
};

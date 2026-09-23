// User preferences for the Draw canvas (for now, just the theme). Unlike drawings, which stay in
// their session, these apply to every session: <COPILOT_HOME or ~/.copilot>/draw/settings.json.
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

export const THEMES = ["app", "light", "dark"];
const DEFAULTS = { theme: "app" };

export function settingsFile() {
  const home = process.env.COPILOT_HOME || path.join(os.homedir(), ".copilot");
  return path.join(home, "draw", "settings.json");
}

export class Settings {
  // Without a file, settings live in memory only.
  constructor(file = null, { log = () => {} } = {}) {
    this.file = file;
    this.log = log;
    this.values = { ...DEFAULTS };
    this.writing = Promise.resolve();
  }

  // Reads the file every time, so a change made in another session shows up on the next load.
  async read() {
    if (this.file) {
      try {
        const raw = JSON.parse(await fs.readFile(this.file, "utf8"));
        if (THEMES.includes(raw.theme)) this.values = { ...this.values, theme: raw.theme };
      } catch (err) {
        if (err.code !== "ENOENT") this.log(`could not read ${this.file}: ${err.message}`);
      }
    }
    return { ...this.values };
  }

  async update(patch) {
    if (patch.theme !== undefined && !THEMES.includes(patch.theme)) {
      throw new Error(`Theme must be one of: ${THEMES.join(", ")}.`);
    }
    this.values = { ...this.values, ...(patch.theme !== undefined && { theme: patch.theme }) };
    const values = { ...this.values };
    if (this.file) {
      const data = `${JSON.stringify(values, null, 2)}\n`;
      this.writing = this.writing
        .then(async () => {
          await fs.mkdir(path.dirname(this.file), { recursive: true });
          await fs.writeFile(this.file, data);
        })
        .catch((err) => this.log(`could not save ${this.file}: ${err.message}`));
      await this.writing;
    }
    return values;
  }
}

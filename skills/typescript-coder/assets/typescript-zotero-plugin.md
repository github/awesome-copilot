# TypeScript Zotero Plugin Template

> A TypeScript project starter for building Zotero 7 plugins. Produces a Zotero-compatible plugin using the bootstrap (non-overlay) plugin API, TypeScript compilation, and a structured manifest. Inspired by patterns from the Zotero plugin ecosystem, including projects hosted at retorque.re (Better BibTeX for Zotero by Emiliano Heyns).

## License

AGPL-3.0 — The Better BibTeX for Zotero project (retorque.re) is licensed under AGPL-3.0. Review licensing carefully before distributing a plugin based on its patterns. For a permissive alternative, consider MIT; consult the source project's license file.

## Source

- [retorque.re (Better BibTeX for Zotero)](https://retorque.re/)
- [Better BibTeX GitHub](https://github.com/retorquere/zotero-better-bibtex)

## Project Structure

```
zotero-my-plugin/
├── src/
│   ├── bootstrap.ts        ← Plugin lifecycle entry point
│   ├── plugin.ts           ← Main plugin class
│   ├── prefs.ts            ← Preferences/settings management
│   ├── ui.ts               ← Menu and UI registration
│   └── types/
│       └── zotero.d.ts     ← Zotero global type declarations
├── addon/
│   ├── manifest.json       ← Plugin manifest (Zotero 7 / WebExtension-style)
│   ├── prefs/
│   │   └── prefs.xhtml     ← Preferences pane (XUL)
│   └── locale/
│       └── en-US/
│           └── addon.ftl   ← Fluent localisation strings
├── scripts/
│   └── build.mjs           ← Build/zip script
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## Key Files

### `package.json`

```json
{
  "name": "zotero-my-plugin",
  "version": "1.0.0",
  "description": "A Zotero 7 plugin built with TypeScript",
  "scripts": {
    "build": "tsc && node scripts/build.mjs",
    "watch": "tsc --watch",
    "package": "node scripts/build.mjs --zip",
    "typecheck": "tsc --noEmit",
    "clean": "rimraf build dist"
  },
  "devDependencies": {
    "@types/node": "^20.8.10",
    "rimraf": "^5.0.5",
    "typescript": "^5.2.2",
    "zotero-types": "^1.3.22"
  }
}
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM"],
    "outDir": "build",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": false,
    "sourceMap": false,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "build", "dist"]
}
```

### `addon/manifest.json`

```json
{
  "manifest_version": 2,
  "name": "My Zotero Plugin",
  "version": "1.0.0",
  "description": "A sample Zotero 7 plugin",
  "homepage_url": "https://github.com/yourname/zotero-my-plugin",
  "author": "Your Name <you@example.com>",
  "applications": {
    "zotero": {
      "id": "my-plugin@example.com",
      "update_url": "https://raw.githubusercontent.com/yourname/zotero-my-plugin/main/update.json",
      "strict_min_version": "7.0.0"
    }
  },
  "icons": {
    "32": "icons/icon32.png",
    "48": "icons/icon48.png"
  },
  "permissions": [],
  "browser_specific_settings": {
    "zotero": {
      "id": "my-plugin@example.com"
    }
  }
}
```

### `src/bootstrap.ts`

```typescript
/**
 * Zotero 7 Bootstrap Plugin Entry Point.
 *
 * Zotero 7 uses a WebExtension-like bootstrap model. The plugin must export
 * these lifecycle functions, which Zotero calls at the appropriate times.
 */

import { MyPlugin } from "./plugin";

let plugin: MyPlugin | null = null;

/**
 * Called when the plugin is first installed.
 */
export function install(_data: { version: string; reason: string }): void {
  Zotero.log("my-plugin: install");
}

/**
 * Called each time Zotero starts (or the plugin is enabled).
 * The plugin should register its UI elements and listeners here.
 */
export async function startup(data: {
  id: string;
  version: string;
  rootURI: string;
}): Promise<void> {
  Zotero.log(`my-plugin: startup v${data.version}`);

  // Wait for Zotero to be fully initialised before registering UI
  await Zotero.initializationPromise;

  plugin = new MyPlugin(data.rootURI);
  await plugin.init();
}

/**
 * Called when Zotero quits or the plugin is disabled.
 */
export function shutdown(_data: { id: string; version: string; reason: string }): void {
  Zotero.log("my-plugin: shutdown");
  plugin?.unload();
  plugin = null;
}

/**
 * Called when the plugin is uninstalled.
 */
export function uninstall(_data: { version: string; reason: string }): void {
  Zotero.log("my-plugin: uninstall");
}
```

### `src/plugin.ts`

```typescript
import { registerPrefs } from "./prefs";
import { registerUI, unregisterUI } from "./ui";

export class MyPlugin {
  private rootURI: string;
  private registeredWindows: Set<Window> = new Set();

  constructor(rootURI: string) {
    this.rootURI = rootURI;
  }

  async init(): Promise<void> {
    Zotero.log("my-plugin: initialising");

    // Register preferences defaults
    registerPrefs();

    // Register UI elements in all open windows
    for (const win of Zotero.getMainWindows()) {
      this.addToWindow(win);
    }

    // Listen for new windows opening
    Zotero.uiReadyPromise.then(() => {
      Services.wm.addListener(this.windowListener);
    });
  }

  addToWindow(win: Window): void {
    if (this.registeredWindows.has(win)) return;
    this.registeredWindows.add(win);
    registerUI(win, this.rootURI);
  }

  removeFromWindow(win: Window): void {
    unregisterUI(win);
    this.registeredWindows.delete(win);
  }

  unload(): void {
    Services.wm.removeListener(this.windowListener);
    for (const win of this.registeredWindows) {
      this.removeFromWindow(win);
    }
    this.registeredWindows.clear();
  }

  private windowListener = {
    onOpenWindow: (xulWindow: Zotero.XULWindow) => {
      const win = xulWindow
        .QueryInterface(Ci.nsIInterfaceRequestor)
        .getInterface(Ci.nsIDOMWindow) as Window;
      win.addEventListener("load", () => this.addToWindow(win), { once: true });
    },
    onCloseWindow: (xulWindow: Zotero.XULWindow) => {
      const win = xulWindow
        .QueryInterface(Ci.nsIInterfaceRequestor)
        .getInterface(Ci.nsIDOMWindow) as Window;
      this.removeFromWindow(win);
    },
  };
}
```

### `src/prefs.ts`

```typescript
const PREF_PREFIX = "extensions.my-plugin";

export function registerPrefs(): void {
  const defaults = Services.prefs.getDefaultBranch("");
  defaults.setBoolPref(`${PREF_PREFIX}.enabled`, true);
  defaults.setCharPref(`${PREF_PREFIX}.apiKey`, "");
  defaults.setIntPref(`${PREF_PREFIX}.maxResults`, 100);
}

export function getPref<T extends boolean | string | number>(key: string): T {
  const branch = Services.prefs.getBranch(`${PREF_PREFIX}.`);
  const type = branch.getPrefType(key);

  if (type === branch.PREF_BOOL) return branch.getBoolPref(key) as T;
  if (type === branch.PREF_INT) return branch.getIntPref(key) as T;
  if (type === branch.PREF_STRING) return branch.getCharPref(key) as T;

  throw new Error(`Unknown pref type for key: ${key}`);
}

export function setPref<T extends boolean | string | number>(key: string, value: T): void {
  const branch = Services.prefs.getBranch(`${PREF_PREFIX}.`);
  if (typeof value === "boolean") branch.setBoolPref(key, value);
  else if (typeof value === "number") branch.setIntPref(key, value);
  else branch.setCharPref(key, value);
}
```

### `src/ui.ts`

```typescript
export function registerUI(win: Window, rootURI: string): void {
  const doc = win.document;

  // Add a menu item to the Tools menu
  const toolsMenu = doc.getElementById("menu_ToolsPopup");
  if (!toolsMenu) return;

  const menuItem = doc.createXULElement("menuitem");
  menuItem.id = "my-plugin-menu-item";
  menuItem.setAttribute("label", "My Plugin");
  menuItem.setAttribute("oncommand", "");
  menuItem.addEventListener("command", () => {
    openPluginDialog(win, rootURI);
  });

  toolsMenu.appendChild(menuItem);
}

export function unregisterUI(win: Window): void {
  const doc = win.document;
  doc.getElementById("my-plugin-menu-item")?.remove();
}

function openPluginDialog(win: Window, rootURI: string): void {
  win.openDialog(
    `${rootURI}content/dialog.xhtml`,
    "my-plugin-dialog",
    "chrome,centerscreen,resizable=yes"
  );
}
```

### `src/types/zotero.d.ts`

```typescript
/**
 * Minimal ambient declarations for Zotero globals.
 * For comprehensive typings, install the `zotero-types` package.
 */

declare const Zotero: {
  log: (msg: string) => void;
  initializationPromise: Promise<void>;
  uiReadyPromise: Promise<void>;
  getMainWindows: () => Window[];
  XULWindow: unknown;
};

declare const Services: {
  prefs: {
    getDefaultBranch: (root: string) => mozIBranch;
    getBranch: (root: string) => mozIBranch;
  };
  wm: {
    addListener: (listener: unknown) => void;
    removeListener: (listener: unknown) => void;
  };
};

declare const Ci: {
  nsIInterfaceRequestor: unknown;
  nsIDOMWindow: unknown;
};

interface mozIBranch {
  PREF_BOOL: number;
  PREF_INT: number;
  PREF_STRING: number;
  getPrefType: (key: string) => number;
  getBoolPref: (key: string) => boolean;
  getIntPref: (key: string) => number;
  getCharPref: (key: string) => string;
  setBoolPref: (key: string, value: boolean) => void;
  setIntPref: (key: string, value: number) => void;
  setCharPref: (key: string, value: string) => void;
}
```

### `addon/locale/en-US/addon.ftl`

```
# Fluent localisation file

my-plugin-menu-label = My Plugin
my-plugin-prefs-title = My Plugin Preferences
my-plugin-prefs-enabled = Enable My Plugin
my-plugin-prefs-api-key = API Key:
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Install the `zotero-types` package for comprehensive Zotero API typings:
   ```bash
   npm install --save-dev zotero-types
   ```
3. Compile TypeScript:
   ```bash
   npm run build
   ```
4. Package into a `.xpi` file for installation:
   ```bash
   npm run package
   ```
5. In Zotero 7, install via **Tools > Add-ons > Install Add-on From File** and select the `.xpi`.

## Features

- Zotero 7 bootstrap (non-overlay) plugin architecture — no legacy XUL overlay required
- TypeScript 5.x compilation to ES2020 for Zotero's SpiderMonkey runtime
- Plugin lifecycle hooks: `install`, `startup`, `shutdown`, `uninstall`
- Window listener pattern to register UI in all existing and future main windows
- XUL menu item registration and cleanup via `registerUI` / `unregisterUI`
- Preferences management via `Services.prefs` with typed `getPref` / `setPref` helpers
- Fluent (`.ftl`) localisation file for translatable strings
- WebExtension-style `manifest.json` for Zotero 7 plugin metadata
- Ambient type declarations for Zotero globals (supplemented by `zotero-types`)

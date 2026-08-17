import sitemap from "@astrojs/sitemap";
import react from "@astrojs/react";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import remarkGithubAdmonitionsToDirectives from "remark-github-admonitions-to-directives";
import pagefindResources from "./src/integrations/pagefind-resources";

// The contributor count is read from the repo's all-contributors manifest at
// build time and inlined as a literal into both the server render and the
// client bundle. It cannot be read at module scope in src/ because the shells
// that display it are `client:load` hydrated: `node:fs` is unavailable in the
// browser, so the read would fail there and the badge would reset to 0 on
// hydration even though the server-rendered HTML had the right number.
function readContributorsTotal() {
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const rc = JSON.parse(
      fs.readFileSync(path.resolve(here, "..", ".all-contributorsrc"), "utf8"),
    );
    return Array.isArray(rc.contributors) ? rc.contributors.length : 0;
  } catch {
    return 0;
  }
}

// Playbook course content mirrored from external workshop repos is authored in
// GitHub admonition syntax (`> [!NOTE]`). This remark plugin rewrites those
// callouts into directives before rendering, so the same syntax used in the
// source repos and on github.com also produces styled callouts here.
const githubAdmonitionMapping = {
  NOTE: "note",
  TIP: "tip",
  IMPORTANT: "note",
  WARNING: "caution",
  CAUTION: "caution",
};

const site = "https://awesome-copilot.github.com/";

// https://astro.build/config
export default defineConfig({
  site,
  base: "/",
  output: "static",
  markdown: {
    remarkPlugins: [
      [remarkGithubAdmonitionsToDirectives, { mapping: githubAdmonitionMapping }],
    ],
    // The prototype's own code blocks (SyntaxHighlightedCode.tsx) are styled
    // entirely through brand CSS tokens rather than baked-in theme colours, so
    // they automatically match the site's light/dark mode. Raw markdown code
    // fences render through Shiki instead, which by default bakes a fixed
    // "github-dark" theme's literal colours into inline styles — that ignores
    // the site's actual colour mode and clashes with the prototype's bordered,
    // canvas-subtle code block styling. The "css-variables" theme emits
    // `var(--astro-code-*)` custom properties instead of literal colours,
    // which are mapped to the same brand tokens in
    // src/components/brand/styles/{dotnet-upgrade,github-copilot-app}.module.css.
    shikiConfig: {
      theme: "css-variables",
    },
  },
  // English is served at the site root (no locale prefix), preserving all
  // existing URLs. Additional locales are served under a locale prefix
  // (e.g. /es-es/…) and fall back to the English page when a translation does
  // not yet exist. These keys match the locale directory names used by mirrored
  // Playbook course content (website/src/content/docs/<locale>/…).
  i18n: {
    defaultLocale: "en",
    locales: ["en", "es-es", "ja-jp", "ko-kr", "pt-br", "zh-cn"],
    routing: {
      prefixDefaultLocale: false,
      fallbackType: "rewrite",
    },
    fallback: {
      "es-es": "en",
      "ja-jp": "en",
      "ko-kr": "en",
      "pt-br": "en",
      "zh-cn": "en",
    },
  },
  integrations: [react(), sitemap(), pagefindResources()],
  redirects: {
    "/samples/": "/learning-hub/cookbook/",
  },
  build: {
    assets: "assets",
  },
  trailingSlash: "always",
  vite: {
    define: {
      __CONTRIBUTORS_TOTAL__: JSON.stringify(readContributorsTotal()),
    },
    // @primer/react-brand's default entrypoint is CJS, so Node's ESM loader
    // cannot detect its named exports during SSR. The package also ships a
    // proper ESM build; alias to it so named imports resolve in both the
    // server render and the client bundle.
    resolve: {
      alias: [
        {
          // Only the bare package specifier (the JS entrypoint) is redirected;
          // subpath imports such as `/lib/css/main.css` must resolve normally.
          find: /^@primer\/react-brand$/,
          replacement: "@primer/react-brand/esm",
        },
      ],
      // The ESM build imports its own .css files, which Node's loader cannot
      // handle, so it has to be bundled rather than externalised for SSR.
      noExternal: ["@primer/react-brand"],
    },
    build: {
      sourcemap: false,
      chunkSizeWarningLimit: 900,
    },
    css: {
      devSourcemap: true,
    },
  },
});

import sitemap from "@astrojs/sitemap";
import react from "@astrojs/react";
import { defineConfig } from "astro/config";
import remarkGithubAdmonitionsToDirectives from "remark-github-admonitions-to-directives";
import pagefindResources from "./src/integrations/pagefind-resources";

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

import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  site: "https://github.github.io/awesome-copilot",
  base: "/awesome-copilot/",
  output: "static",
  integrations: [sitemap()],
  redirects: {
    "/samples/": "/learning-hub/cookbook/",
  },
  build: {
    assets: "assets",
  },
  trailingSlash: "always",
  vite: {
    build: {
      sourcemap: true,
    },
    css: {
      devSourcemap: true,
    },
  },
});

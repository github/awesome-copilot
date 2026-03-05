import sitemap from "@astrojs/sitemap";
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import pagefindResources from "./src/integrations/pagefind-resources";

// https://astro.build/config
export default defineConfig({
  site: "https://github.github.com/",
  base: "/awesome-copilot/",
  output: "static",
  integrations: [
    starlight({
      title: "Awesome GitHub Copilot",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/github/awesome-copilot",
        },
      ],
      customCss: ["./src/styles/starlight-overrides.css", "./src/styles/global.css"],
      editLink: {
        baseUrl:
          "https://github.com/github/awesome-copilot/edit/staged/website/",
      },
      sidebar: [
        {
          label: "Browse Resources",
          items: [
            { label: "Home", link: "/" },
            { label: "Agents", link: "/agents/" },
            { label: "Instructions", link: "/instructions/" },
            { label: "Skills", link: "/skills/" },
            { label: "Hooks", link: "/hooks/" },
            { label: "Workflows", link: "/workflows/" },
            { label: "Plugins", link: "/plugins/" },
            { label: "Tools", link: "/tools/" },
          ],
        },
        {
          label: "Fundamentals",
          items: [
            "learning-hub/what-are-agents-skills-instructions",
            "learning-hub/understanding-copilot-context",
            "learning-hub/copilot-configuration-basics",
            "learning-hub/defining-custom-instructions",
            "learning-hub/creating-effective-skills",
            "learning-hub/building-custom-agents",
            "learning-hub/understanding-mcp-servers",
            "learning-hub/automating-with-hooks",
            "learning-hub/agentic-workflows",
            "learning-hub/using-copilot-coding-agent",
            "learning-hub/installing-and-using-plugins",
            "learning-hub/before-after-customization-examples",
          ],
        },
        {
          label: "Reference",
          items: ["learning-hub/github-copilot-terminology-glossary"],
        },
        {
          label: "Hands-on",
          items: [
            {
              label: "Cookbook",
              link: "/learning-hub/cookbook/",
            },
          ],
        },
      ],
      disable404Route: true,
      // pagefind: true is required so Starlight renders the search UI.
      // Our pagefindResources() integration overwrites the index after build.
      pagefind: true,
      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
      components: {
        Head: "./src/components/Head.astro",
      },
    }),
    sitemap(),
    pagefindResources(),
  ],
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

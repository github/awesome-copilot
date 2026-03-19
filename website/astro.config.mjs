import sitemap from "@astrojs/sitemap";
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import pagefindResources from "./src/integrations/pagefind-resources";

const site = "https://awesome-copilot.github.com/";
const siteDescription =
  "Community-contributed agents, instructions, and skills to enhance your GitHub Copilot experience";
const socialImageUrl = new URL("/images/social-image.png", site).toString();

// https://astro.build/config
export default defineConfig({
  site,
  base: "/",
  output: "static",
  integrations: [
    starlight({
      title: "Awesome GitHub Copilot",
      description: siteDescription,
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/github/awesome-copilot",
        },
      ],
      head: [
        {
          tag: "meta",
          attrs: {
            property: "og:image",
            content: socialImageUrl,
          },
        },
        {
          tag: "meta",
          attrs: {
            property: "og:image:alt",
            content: siteDescription,
          },
        },
        {
          tag: "meta",
          attrs: {
            name: "twitter:image",
            content: socialImageUrl,
          },
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
            { label: "Contributors", link: "/contributors/" },
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
        Footer: "./src/components/Footer.astro",
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

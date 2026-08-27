import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/**
 * Learning Hub content collection. Previously loaded via Starlight's `docsLoader`;
 * now a plain glob loader over the same directory so the markdown source of
 * truth and all existing URLs are unchanged.
 */
const docs = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/docs" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    sidebar: z.unknown().optional(),
    template: z.string().optional(),
    editUrl: z.union([z.string(), z.boolean()]).optional(),
    lastUpdated: z.union([z.string(), z.date(), z.boolean()]).optional(),
    prev: z.unknown().optional(),
    next: z.unknown().optional(),
    pagefind: z.boolean().optional(),
    head: z.array(z.unknown()).optional(),
    tableOfContents: z.unknown().optional(),
    banner: z.unknown().optional(),
    hero: z.unknown().optional(),
    draft: z.boolean().optional(),
    authors: z.array(z.string()).optional(),
    estimatedReadingTime: z.string().optional(),
    tags: z.array(z.string()).optional(),
    relatedArticles: z.array(z.string()).optional(),
    prerequisites: z.array(z.string()).optional(),
  }),
});

export const collections = {
  docs,
};

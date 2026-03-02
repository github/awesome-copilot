import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const learningHub = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/learning-hub" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    authors: z.array(z.string()).optional(),
    lastUpdated: z.string().optional(),
    estimatedReadingTime: z.string().optional(),
    tags: z.array(z.string()).optional(),
    relatedArticles: z.array(z.string()).optional(),
    prerequisites: z.array(z.string()).optional(),
  }),
});

export const collections = {
  "learning-hub": learningHub,
};

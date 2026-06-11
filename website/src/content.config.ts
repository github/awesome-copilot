import { defineCollection, z } from "astro:content";
import { docsLoader } from "@astrojs/starlight/loaders";
import { docsSchema } from "@astrojs/starlight/schema";

const docs = defineCollection({
  loader: docsLoader(),
  schema: docsSchema({
    extend: z.object({
      authors: z.array(z.string()).optional(),
      estimatedReadingTime: z.string().optional(),
      tags: z.array(z.string()).optional(),
      relatedArticles: z.array(z.string()).optional(),
      prerequisites: z.array(z.string()).optional(),
    }),
  }),
});

export const collections = {
  docs,
};

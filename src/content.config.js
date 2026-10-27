import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    mins: z.number().default(5),
    tags: z.array(z.string()).default([]),
  }),
});

// Case studies. `sample: true` shows a SAMPLE badge so placeholder entries never pass as real work.
const projects = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/projects" }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    year: z.number(),
    status: z.enum(["live", "archived", "in-progress"]).default("live"),
    sample: z.boolean().default(false),
    problem: z.string(),
    role: z.string(),
    stack: z.array(z.string()),
    features: z.array(z.string()).default([]),
    challenges: z.array(z.object({ title: z.string(), solution: z.string() })).default([]),
    links: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
    cover: z.string().optional(),
  }),
});

export const collections = { blog, projects };

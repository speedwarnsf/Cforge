import { z } from "zod";

export const aiRequestFormSchema = z.object({
  query: z.string().min(1, "Query is required").max(1000, "Query must be 1000 characters or less"),
  tone: z.enum(["bold", "strategic", "conversational", "simplified", "core", "creative", "analytical", "technical", "summarize"], {
    required_error: "Please select a tone",
  }),
  includeCliches: z.boolean().default(false),
  deepScan: z.boolean().default(false),
  conceptCount: z.number().min(1).max(20).default(1),
  projectId: z.string().optional(),
});

export const projectFormSchema = z.object({
  name: z.string().min(1, "Project name is required").max(100, "Project name must be 100 characters or less"),
  description: z.string().max(500, "Description must be 500 characters or less").optional(),
});

export const conceptRatingFormSchema = z.object({
  conceptId: z.string(),
  rhetoricalDevice: z.string(),
  tone: z.string(),
  rating: z.enum(["more_like_this", "less_like_this"]),
  projectId: z.string(),
});

export type AiRequestForm = z.infer<typeof aiRequestFormSchema>;
export type ProjectForm = z.infer<typeof projectFormSchema>;
export type ConceptRatingForm = z.infer<typeof conceptRatingFormSchema>;

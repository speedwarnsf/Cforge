import { pgTable, text, serial, integer, timestamp, boolean, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const aiRequests = pgTable("ai_requests", {
  id: serial("id").primaryKey(),
  query: text("query").notNull(),
  tone: text("tone").notNull(),
  response: text("response").notNull(),
  tokens: integer("tokens").notNull(),
  processingTime: text("processing_time").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: text("id").primaryKey(), // UUID
  name: text("name").notNull(),
  description: text("description"),
  userId: text("user_id"), // For future user system
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const conceptRatings = pgTable("concept_ratings", {
  id: serial("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  conceptId: text("concept_id").notNull(), // References concept_logs in Supabase
  rhetoricalDevice: text("rhetorical_device").notNull(),
  tone: text("tone").notNull(),
  rating: text("rating").notNull(), // "more_like_this" or "less_like_this"
  userId: text("user_id"), // For future user system
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertAiRequestSchema = createInsertSchema(aiRequests).omit({
  id: true,
  createdAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertConceptRatingSchema = createInsertSchema(conceptRatings).omit({
  id: true,
  createdAt: true,
});

export const aiRequestFormSchema = z.object({
  query: z.string().min(1, "Query is required").max(1000, "Query must be 1000 characters or less"),
  tone: z.enum(["bold", "strategic", "conversational", "simplified", "core", "creative", "analytical", "technical", "summarize"], {
    required_error: "Please select a tone",
  }),
  includeCliches: z.boolean().default(false),
  deepScan: z.boolean().default(false),
  conceptCount: z.number().min(1).max(20).default(1), // New field for multi-ideation
  projectId: z.string().optional(), // New field for project association
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

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertAiRequest = z.infer<typeof insertAiRequestSchema>;
export type AiRequest = typeof aiRequests.$inferSelect;
export type AiRequestForm = z.infer<typeof aiRequestFormSchema>;

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type ProjectForm = z.infer<typeof projectFormSchema>;

export type InsertConceptRating = z.infer<typeof insertConceptRatingSchema>;
export type ConceptRating = typeof conceptRatings.$inferSelect;
export type ConceptRatingForm = z.infer<typeof conceptRatingFormSchema>;

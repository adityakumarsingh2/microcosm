import { z } from "zod";

export const createSectionSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(140),
    position: z.number().optional(),
  }),
  params: z.object({ notebookId: z.string().min(1) }),
  query: z.object({}).optional(),
});

export const updateSectionSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(140).optional(),
    position: z.number().optional(),
  }),
  params: z.object({ sectionId: z.string().min(1) }),
  query: z.object({}).optional(),
});

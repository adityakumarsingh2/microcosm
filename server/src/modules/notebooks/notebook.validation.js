import { z } from "zod";

export const createNotebookSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(140),
    description: z.string().trim().max(500).optional(),
    position: z.number().optional(),
  }),
  params: z.object({ workspaceId: z.string().min(1) }),
  query: z.object({}).optional(),
});

export const updateNotebookSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(140).optional(),
    description: z.string().trim().max(500).optional(),
    position: z.number().optional(),
  }),
  params: z.object({ notebookId: z.string().min(1) }),
  query: z.object({}).optional(),
});

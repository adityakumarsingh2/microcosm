import { z } from "zod";

export const createWorkspaceSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(100),
    description: z.string().trim().max(500).optional(),
    icon: z.string().trim().max(60).optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const updateWorkspaceSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(500).optional(),
    icon: z.string().trim().max(60).optional(),
  }),
  params: z.object({ workspaceId: z.string().min(1) }),
  query: z.object({}).optional(),
});

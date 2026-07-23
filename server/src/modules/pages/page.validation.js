import { z } from "zod";

const blockSchema = z.object({
  blockId: z.string().trim().min(1).max(120),
  type: z.enum(["heading", "paragraph", "code", "checklist", "quote", "image"]),
  content: z.unknown().optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
  position: z.number(),
});

export const createPageSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(180),
    emoji: z.string().trim().max(20).optional(),
    blocks: z.array(blockSchema).optional(),
  }),
  params: z.object({ sectionId: z.string().min(1) }),
  query: z.object({}).optional(),
});

export const updatePageSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(180).optional(),
    emoji: z.string().trim().max(20).optional(),
    blocks: z.array(blockSchema).optional(),
  }),
  params: z.object({ pageId: z.string().min(1) }),
  query: z.object({}).optional(),
});

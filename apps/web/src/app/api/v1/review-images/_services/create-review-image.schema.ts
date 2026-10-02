import { z } from "zod";

export const CreateReviewImageSchema = z.object({
  key: z.string().min(1),
  filename: z.string().trim().min(1).max(255),
  mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
  size: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export type CreateReviewImageInput = z.infer<typeof CreateReviewImageSchema>;

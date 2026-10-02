import { z } from "zod";
export const ListReviewImagesSchema = z.object({ projectId: z.string() });
export type ListReviewImagesInput = z.infer<typeof ListReviewImagesSchema>;

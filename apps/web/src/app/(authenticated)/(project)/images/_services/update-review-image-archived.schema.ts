import { z } from "zod";
export const UpdateReviewImageArchivedSchema = z.object({
  imageId: z.string(),
  archived: z.boolean(),
});
export type UpdateReviewImageArchivedInput = z.infer<
  typeof UpdateReviewImageArchivedSchema
>;

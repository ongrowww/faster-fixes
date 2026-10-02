import { findProjectByPublicId } from "@/app/_domains/project/_services/find-project-by-public-id";
import { findReviewerByToken } from "@/app/_domains/project/_services/find-reviewer-by-token";
import { checkRateLimit } from "@/server/rate-limit/check-rate-limit";
import crypto from "crypto";
import { auth } from "@/server/auth";
import { s3Client } from "@/server/storage";
import { requireEnv } from "@/utils/environment/require-env";
import { RejectUpload, route, type Router } from "@better-upload/server";
import { toRouteHandler } from "@better-upload/server/adapters/next";
import { z } from "zod";
import { findUploadingMember } from "./_services/find-uploading-member";

const routes: Router["routes"] = {
  "organization-logo": route({
    fileTypes: ["image/png", "image/jpeg", "image/webp"],
    maxFileSize: 2 * 1024 * 1024,
    clientMetadataSchema: z.object({
      organizationId: z.string(),
    }),
    onBeforeUpload: async ({ req, file, clientMetadata }) => {
      const session = await auth.api.getSession({
        headers: req.headers,
      });

      if (!session) {
        throw new RejectUpload("Unauthorized");
      }

      const uploadingMember = await findUploadingMember({
        organizationId: clientMetadata.organizationId,
        userId: session.user.id,
      });

      if (!uploadingMember) {
        throw new RejectUpload(
          "You do not have permission to modify this organization.",
        );
      }

      const extension = file.type.split("/")[1] ?? "png";

      return {
        objectInfo: {
          key: `organization-logos/${clientMetadata.organizationId}/${Date.now()}.${extension}`,
        },
      };
    },
  }),
  "review-image": route({
    fileTypes: ["image/png", "image/jpeg", "image/webp"],
    maxFileSize: 10 * 1024 * 1024,
    clientMetadataSchema: z.object({ projectId: z.string() }),
    onBeforeUpload: async ({ req, file, clientMetadata }) => {
      const project = await findProjectByPublicId(clientMetadata.projectId);
      if (!project) throw new RejectUpload("Unknown project.");
      const reviewer = await findReviewerByToken(
        req.headers.get("x-reviewer-token"),
        project.id,
      );
      if (!reviewer) throw new RejectUpload("Invalid reviewer link.");
      const { allowed } = await checkRateLimit(project.id, "submit");
      if (!allowed) {
        throw new RejectUpload("Too many uploads. Try again later.");
      }
      const extension =
        file.type === "image/jpeg" ? "jpg" : (file.type.split("/")[1] ?? "png");
      return {
        objectInfo: {
          key: `review-images/${project.id}/${reviewer.id}/${crypto.randomUUID()}.${extension}`,
        },
      };
    },
  }),
  "user-avatar": route({
    fileTypes: ["image/png", "image/jpeg", "image/webp"],
    maxFileSize: 2 * 1024 * 1024,
    onBeforeUpload: async ({ req, file }) => {
      const session = await auth.api.getSession({
        headers: req.headers,
      });

      if (!session) {
        throw new RejectUpload("Unauthorized");
      }

      const extension = file.type.split("/")[1] ?? "png";

      return {
        objectInfo: {
          key: `user-avatars/${session.user.id}/${Date.now()}.${extension}`,
        },
      };
    },
  }),
};

// Built per request so a missing bucket name fails the upload, not the module import.
export function POST(req: Request) {
  const router: Router = {
    client: s3Client,
    bucketName: requireEnv(
      "STORAGE_BUCKET_NAME",
      process.env.STORAGE_BUCKET_NAME,
    ),
    routes,
  };
  return toRouteHandler(router).POST(req);
}

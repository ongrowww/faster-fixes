import { auth } from "@/server/auth";
import { s3Client } from "@/server/storage";
import { RejectUpload, route, type Router } from "@better-upload/server";
import { toRouteHandler } from "@better-upload/server/adapters/next";
import { prisma } from "@workspace/db";
import { z } from "zod";
import crypto from "crypto";
import { resolveProject } from "@/server/api/resolve-project";
import { validateReviewer } from "@/server/api/validate-reviewer";
import { checkRateLimit } from "@/server/api/check-rate-limit";

const router: Router = {
  client: s3Client,
  bucketName: process.env.STORAGE_BUCKET_NAME!,
  routes: {
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

        const membership = await prisma.member.findFirst({
          where: {
            organizationId: clientMetadata.organizationId,
            userId: session.user.id,
            role: { in: ["owner", "admin"] },
          },
        });

        if (!membership) {
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
    "review-image": route({
      fileTypes: ["image/png", "image/jpeg", "image/webp"],
      maxFileSize: 10 * 1024 * 1024,
      clientMetadataSchema: z.object({
        projectId: z.string(),
      }),
      onBeforeUpload: async ({ req, file, clientMetadata }) => {
        const project = await resolveProject(clientMetadata.projectId);
        if (!project) {
          throw new RejectUpload("Unknown project.");
        }

        const reviewer = await validateReviewer(
          req.headers.get("x-reviewer-token"),
          project.id,
        );
        if (!reviewer) {
          throw new RejectUpload("Invalid reviewer link.");
        }
        const { allowed } = await checkRateLimit(project.id, "submit");
        if (!allowed) {
          throw new RejectUpload("Too many uploads. Try again later.");
        }

        const extension =
          file.type === "image/jpeg"
            ? "jpg"
            : (file.type.split("/")[1] ?? "png");

        return {
          objectInfo: {
            key: `review-images/${project.id}/${crypto.randomUUID()}.${extension}`,
          },
        };
      },
    }),
  },
};

export const { POST } = toRouteHandler(router);

-- CreateTable
CREATE TABLE "review_image" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publicId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "uploadedByReviewerId" TEXT,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "review_image_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "feedback" ADD COLUMN "reviewImageId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "review_image_publicId_key" ON "review_image"("publicId");
CREATE UNIQUE INDEX "review_image_assetId_key" ON "review_image"("assetId");
CREATE INDEX "review_image_projectId_archivedAt_idx" ON "review_image"("projectId", "archivedAt");
CREATE INDEX "review_image_uploadedByReviewerId_idx" ON "review_image"("uploadedByReviewerId");
CREATE INDEX "feedback_reviewImageId_idx" ON "feedback"("reviewImageId");

-- AddForeignKey
ALTER TABLE "review_image" ADD CONSTRAINT "review_image_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_image" ADD CONSTRAINT "review_image_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_image" ADD CONSTRAINT "review_image_uploadedByReviewerId_fkey" FOREIGN KEY ("uploadedByReviewerId") REFERENCES "reviewer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_reviewImageId_fkey" FOREIGN KEY ("reviewImageId") REFERENCES "review_image"("id") ON DELETE CASCADE ON UPDATE CASCADE;

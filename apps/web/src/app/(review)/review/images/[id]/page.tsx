import { ReviewImageCanvas } from "./review-image-canvas.client";
import { Suspense } from "react";

export default async function ReviewImagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <ReviewImageCanvas imageId={(await params).id} />
    </Suspense>
  );
}

import { ReviewImageCanvas } from "./_features/review-image-canvas.client";
import { Suspense } from "react";

type ReviewImagePageProps = { params: Promise<{ id: string }> };
export default async function ReviewImagePage({
  params,
}: ReviewImagePageProps) {
  return (
    <Suspense fallback={null}>
      <ReviewImageCanvas imageId={(await params).id} />
    </Suspense>
  );
}

import { ReviewImagesGallery } from "./_features/review-images-gallery.client";
import { Suspense } from "react";

export default function ReviewImagesPage() {
  return (
    <Suspense fallback={null}>
      <ReviewImagesGallery />
    </Suspense>
  );
}

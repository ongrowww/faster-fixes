"use client";

import { FasterFixesClient } from "@fasterfixes/core";
import { FeedbackProviderCore } from "@fasterfixes/react/internal";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { reviewHeaders, resolveReviewSession } from "../review-session.client";

type ReviewImage = {
  id: string;
  filename: string;
  width: number | null;
  height: number | null;
  url: string;
};

export function ReviewImageCanvas({ imageId }: { imageId: string }) {
  const projectId = useSearchParams().get("project") ?? "";
  const [token, setToken] = useState<string | null>(null);
  const [image, setImage] = useState<ReviewImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const client = useMemo(
    () =>
      new FasterFixesClient({
        apiKey: projectId,
        apiOrigin: "",
        reviewImageId: imageId,
      }),
    [imageId, projectId],
  );

  useEffect(() => {
    if (!projectId) {
      setError("The review link is incomplete.");
      return;
    }
    const activeToken = resolveReviewSession(projectId);
    setToken(activeToken);
    if (!activeToken) {
      setError("Open the complete review link to access this image.");
      return;
    }
    fetch(`/api/v1/review-images/${encodeURIComponent(imageId)}`, {
      headers: reviewHeaders(projectId, activeToken),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("This image is unavailable.");
        setImage((await response.json()) as ReviewImage);
      })
      .catch((cause: unknown) =>
        setError(
          cause instanceof Error ? cause.message : "Could not load this image.",
        ),
      );
  }, [imageId, projectId]);

  if (error) return <ReviewState>{error}</ReviewState>;
  if (!image || !token)
    return (
      <ReviewState>
        <Loader2 className="size-6 animate-spin" aria-label="Loading image" />
      </ReviewState>
    );

  return (
    <FeedbackProviderCore
      client={client}
      reviewerToken={token}
      config={{ enabled: true, branding: true }}
      captureDiagnostics={false}
      annotationTarget={{
        label: `Place a feedback marker on ${image.filename}`,
        mode: "point",
        selector: `[data-review-image="${image.id}"]`,
      }}
    >
      <main className="bg-muted min-h-screen px-4 py-5 sm:px-8">
        <div className="mx-auto max-w-[1600px]">
          <header className="mb-5 flex items-center gap-3">
            <Link
              href={`/review/images?project=${encodeURIComponent(projectId)}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <ArrowLeft className="size-4" />
              All images
            </Link>
            <h1 className="min-w-0 truncate text-sm font-semibold">
              {image.filename}
            </h1>
          </header>
          <div className="bg-card flex justify-center overflow-auto rounded-xl border p-3 shadow-sm sm:p-8">
            {/* The stable selector and intrinsic dimensions keep normalized pins attached while responsive scaling changes. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              data-review-image={image.id}
              src={image.url}
              alt={image.filename}
              width={image.width ?? undefined}
              height={image.height ?? undefined}
              className="h-auto max-w-full object-contain"
            />
          </div>
        </div>
      </main>
    </FeedbackProviderCore>
  );
}

function ReviewState({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-background text-muted-foreground flex min-h-screen items-center justify-center p-6 text-center text-sm">
      {children}
    </main>
  );
}

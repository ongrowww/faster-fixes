"use client";

import { FasterFixesClient } from "@fasterfixes/core";
import { createWidget } from "@fasterfixes/widget";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@workspace/ui/components/empty";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  reviewHeaders,
  resolveReviewSession,
} from "../../_helpers/review-session";

const reviewImageSchema = z.object({
  id: z.string(),
  filename: z.string(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  url: z.string(),
});
type ReviewImage = z.infer<typeof reviewImageSchema>;
type ReviewImageCanvasProps = { imageId: string };

export function ReviewImageCanvas({ imageId }: ReviewImageCanvasProps) {
  const projectId = useSearchParams().get("project") ?? "";
  return (
    <ImageCanvas
      key={`${projectId}:${imageId}`}
      imageId={imageId}
      projectId={projectId}
    />
  );
}
type ImageCanvasProps = ReviewImageCanvasProps & { projectId: string };
function ImageCanvas({ imageId, projectId }: ImageCanvasProps) {
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
    const abort = new AbortController();
    async function loadImage() {
      if (!projectId) throw new Error("The review link is incomplete.");
      const activeToken = resolveReviewSession(projectId);
      if (!activeToken) {
        throw new Error("Open the complete review link to access this image.");
      }
      const response = await fetch(
        `/api/v1/review-images/${encodeURIComponent(imageId)}`,
        {
          headers: reviewHeaders(projectId, activeToken),
          signal: abort.signal,
        },
      );
      if (!response.ok) throw new Error("This image is unavailable.");
      const loaded = reviewImageSchema.parse(await response.json());
      if (abort.signal.aborted) return;
      setToken(activeToken);
      setImage(loaded);
    }
    void loadImage().catch((cause: unknown) => {
      if (!abort.signal.aborted) {
        setError(
          cause instanceof Error ? cause.message : "Could not load this image.",
        );
      }
    });
    return () => abort.abort();
  }, [imageId, projectId]);

  useEffect(() => {
    if (!image || !token) return;
    const widget = createWidget({
      client,
      reviewerToken: token,
      config: { enabled: true, branding: true },
      apiOrigin: "",
      captureDiagnostics: false,
      annotationTarget: {
        activateOnMount: true,
        label: `Place a feedback marker on ${image.filename}`,
        mode: "point",
        selector: `[data-review-image="${CSS.escape(image.id)}"]`,
      },
    });
    return () => widget.destroy();
  }, [client, image, token]);

  if (error) {
    return (
      <ReviewState>
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Image unavailable</EmptyTitle>
            <EmptyDescription>{error}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </ReviewState>
    );
  }
  if (!image || !token) {
    return (
      <ReviewState>
        <Skeleton className="h-96 w-full max-w-5xl" />
      </ReviewState>
    );
  }

  return (
    <main className="min-h-screen bg-muted px-4 py-5 sm:px-8">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-5 flex items-center gap-3">
          <Link
            href={`/review/images?project=${encodeURIComponent(projectId)}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <ArrowLeft className="size-4" />
            All images
          </Link>
          <h1 className="min-w-0 truncate text-sm font-semibold">
            {image.filename}
          </h1>
        </header>
        <div className="flex justify-center overflow-auto rounded-xl border bg-card p-3 shadow-sm sm:p-8">
          {/* The stable selector and intrinsic dimensions keep normalized pins attached while responsive scaling changes. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- intrinsic image dimensions preserve normalized pin positions */}
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
  );
}

type ReviewStateProps = { children: React.ReactNode };
function ReviewState({ children }: ReviewStateProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-center text-sm text-muted-foreground">
      {children}
    </main>
  );
}

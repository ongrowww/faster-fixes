"use client";

import { uploadFile } from "@better-upload/client";
import {
  ImagePlus,
  Loader2,
  MessageSquareText,
  UploadCloud,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { reviewHeaders, resolveReviewSession } from "./review-session.client";

type ReviewImage = {
  id: string;
  filename: string;
  url: string;
  feedbackCount: number;
  uploadedBy: string | null;
  createdAt: string;
};

type GalleryResponse = {
  project: { id: string; name: string };
  images: ReviewImage[];
};

async function getImageDimensions(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return { width: image.naturalWidth, height: image.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function ReviewImagesGallery() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project") ?? "";
  const inputRef = useRef<HTMLInputElement>(null);
  const [token, setToken] = useState<string | null>(null);
  const [data, setData] = useState<GalleryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadImages = useCallback(
    async (activeToken: string) => {
      const response = await fetch("/api/v1/review-images", {
        headers: reviewHeaders(projectId, activeToken),
      });
      if (!response.ok)
        throw new Error("This review link is invalid or no longer active.");
      setData((await response.json()) as GalleryResponse);
    },
    [projectId],
  );

  useEffect(() => {
    if (!projectId) {
      setError("The review link is incomplete.");
      setLoading(false);
      return;
    }
    const activeToken = resolveReviewSession(projectId);
    setToken(activeToken);
    if (!activeToken) {
      setError("Open the complete review link to access these images.");
      setLoading(false);
      return;
    }
    loadImages(activeToken)
      .catch((cause: unknown) =>
        setError(
          cause instanceof Error ? cause.message : "Could not load images.",
        ),
      )
      .finally(() => setLoading(false));
  }, [loadImages, projectId]);

  async function handleFiles(fileList: FileList | File[]) {
    if (!token || fileList.length === 0) return;
    const files = Array.from(fileList);
    if (files.length > 20) {
      setError("Upload up to 20 images at a time.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      await Promise.all(
        files.map(async (file) => {
          const uploaded = await uploadFile({
            route: "review-image",
            file,
            metadata: { projectId },
            headers: reviewHeaders(projectId, token),
          });
          const dimensions = await getImageDimensions(uploaded.file.raw);
          const response = await fetch("/api/v1/review-images", {
            method: "POST",
            headers: {
              ...reviewHeaders(projectId, token),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              key: uploaded.file.objectInfo.key,
              filename: uploaded.file.raw.name,
              mimeType: uploaded.file.raw.type,
              size: uploaded.file.raw.size,
              ...dimensions,
            }),
          });
          if (!response.ok)
            throw new Error("The uploaded image could not be saved.");
        }),
      );
      await loadImages(token);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  if (loading) {
    return (
      <ReviewShell>
        <Loader2 className="size-6 animate-spin" aria-label="Loading images" />
      </ReviewShell>
    );
  }
  if (error && !data) {
    return (
      <ReviewShell>
        <p className="text-muted-foreground max-w-md text-center text-sm">
          {error}
        </p>
      </ReviewShell>
    );
  }

  return (
    <main className="bg-background text-foreground min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <header className="mb-8">
          <p className="text-muted-foreground mb-2 text-sm font-medium">
            Image review
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {data?.project.name}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">
            Upload screenshots or designs, then open an image to pin feedback
            exactly where it belongs.
          </p>
        </header>

        <section
          className={`mb-8 flex min-h-44 flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 text-center transition-colors ${dragging ? "border-primary bg-accent" : "border-border bg-card"}`}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void handleFiles(event.dataTransfer.files);
          }}
        >
          {uploading ? (
            <Loader2 className="text-primary mb-3 size-7 animate-spin" />
          ) : (
            <UploadCloud className="text-muted-foreground mb-3 size-8" />
          )}
          <p className="font-medium">
            {uploading ? "Uploading images…" : "Drop images here"}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            PNG, JPEG or WebP · up to 10 MB each
          </p>
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 min-h-11 rounded-lg px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
          >
            Choose images
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(event) =>
              event.target.files && void handleFiles(event.target.files)
            }
          />
        </section>

        {error && (
          <p
            role="alert"
            className="bg-destructive/10 text-destructive mb-5 rounded-lg px-4 py-3 text-sm"
          >
            {error}
          </p>
        )}

        {data?.images.length ? (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.images.map((image) => (
              <li key={image.id}>
                <Link
                  href={`/review/images/${image.id}?project=${encodeURIComponent(projectId)}`}
                  className="group block overflow-hidden rounded-xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <div className="bg-muted aspect-[4/3] overflow-hidden">
                    {/* Signed object URLs are not known to Next Image at build time. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.url}
                      alt=""
                      className="h-full w-full object-contain transition group-hover:scale-[1.01]"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4 p-4">
                    <span className="truncate text-sm font-medium">
                      {image.filename}
                    </span>
                    <span className="text-muted-foreground flex shrink-0 items-center gap-1 text-xs">
                      <MessageSquareText className="size-3.5" />
                      {image.feedbackCount}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center rounded-xl border bg-white px-6 py-14 text-center">
            <ImagePlus className="text-muted-foreground mb-3 size-8" />
            <p className="font-medium">No images yet</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Upload the first image to start the review.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

function ReviewShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-background flex min-h-screen items-center justify-center p-6">
      {children}
    </main>
  );
}

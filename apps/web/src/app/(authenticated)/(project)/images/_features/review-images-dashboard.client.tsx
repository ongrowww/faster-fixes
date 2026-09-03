"use client";

import { DashboardPageContent } from "@/app/_features/core/dashboard/dashboard-page-content";
import { useActiveProject } from "@/app/_features/project/active-project-provider.client";
import { useTRPC } from "@/lib/trpc/trpc-client";
import { matchQueryStatus } from "@/utils/tanstack-query/match-query-status";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Archive, FolderOpen, ImageIcon, RotateCcw } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export function ReviewImagesDashboard() {
  const { activeProject, isPending } = useActiveProject();

  if (isPending)
    return (
      <div className="p-6">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  if (!activeProject) {
    return (
      <div className="flex flex-col items-center gap-2 p-12 text-center">
        <FolderOpen className="text-muted-foreground size-8" />
        <p className="font-medium">Select a project</p>
      </div>
    );
  }

  return (
    <DashboardPageContent breadcrumbs={[{ label: "Images" }]}>
      <ImagesGrid projectId={activeProject.id} />
    </DashboardPageContent>
  );
}

function ImagesGrid({ projectId }: { projectId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const imagesQuery = useQuery(
    trpc.authenticated.projects.reviewImages.list.queryOptions({ projectId }),
  );
  const archiveMutation = useMutation(
    trpc.authenticated.projects.reviewImages.setArchived.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(
          trpc.authenticated.projects.reviewImages.list.queryOptions({
            projectId,
          }),
        );
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Review images</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Images uploaded through reviewer links and their pinned feedback.
        </p>
      </div>
      {matchQueryStatus(imagesQuery, {
        Loading: (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <Skeleton key={item} className="aspect-[4/3] rounded-xl" />
            ))}
          </div>
        ),
        Errored: (
          <p className="text-destructive text-sm">
            Images could not be loaded.
          </p>
        ),
        Empty: (
          <div className="flex flex-col items-center rounded-xl border border-dashed p-12 text-center">
            <ImageIcon className="text-muted-foreground mb-3 size-8" />
            <p className="font-medium">No review images yet</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Reviewers can upload images from their review link.
            </p>
          </div>
        ),
        Success: ({ data: images }) => (
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {images.map((image) => (
              <li
                key={image.id}
                className={`bg-card overflow-hidden rounded-xl border shadow-sm ${image.archivedAt ? "opacity-60" : ""}`}
              >
                <div className="bg-muted aspect-[4/3]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.url}
                    alt=""
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="space-y-3 p-4">
                  <div>
                    <p className="truncate text-sm font-medium">
                      {image.filename}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {image.openFeedbackCount} open · {image.feedbackCount}{" "}
                      total
                      {image.uploadedBy ? ` · ${image.uploadedBy}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href="/inbox">View feedback</Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={archiveMutation.isPending}
                      onClick={() =>
                        archiveMutation.mutate({
                          imageId: image.id,
                          archived: !image.archivedAt,
                        })
                      }
                    >
                      {image.archivedAt ? <RotateCcw /> : <Archive />}
                      {image.archivedAt ? "Restore" : "Archive"}
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ),
      })}
    </div>
  );
}

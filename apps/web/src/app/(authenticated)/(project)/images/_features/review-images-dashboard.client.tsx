"use client";

import { DashboardPageContent } from "@/app/_components/dashboard/dashboard-page-content";
import { useActiveProject } from "@/app/_domains/project/active-project/active-project-provider.client";
import { useTRPC } from "@/lib/trpc/trpc-client";
import { matchQueryStatus } from "@/utils/tanstack-query/match-query-status";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Archive, ImageIcon, RotateCcw } from "lucide-react";
import Link from "next/link";
import { getErrorMessage } from "@/utils/error/get-error-message";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@workspace/ui/components/empty";
import { toast } from "sonner";

export function ReviewImagesDashboard() {
  const { activeProject, projectsQuery } = useActiveProject();
  return (
    <DashboardPageContent breadcrumbs={[{ label: "Images" }]}>
      {matchQueryStatus(projectsQuery, {
        Loading: <Skeleton className="h-64 w-full" />,
        Errored: (error) => (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Projects unavailable</EmptyTitle>
              <EmptyDescription>{getErrorMessage(error)}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ),
        Empty: (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Select a project</EmptyTitle>
              <EmptyDescription>
                Create a project to review images.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ),
        Success: () =>
          activeProject ? (
            <ImagesGrid projectId={activeProject.id} />
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Select a project</EmptyTitle>
              </EmptyHeader>
            </Empty>
          ),
      })}
    </DashboardPageContent>
  );
}

type ImagesGridProps = { projectId: string };
function ImagesGrid({ projectId }: ImagesGridProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const imagesQuery = useQuery(
    trpc.authenticated.projects.reviewImage.list.queryOptions({ projectId }),
  );
  const archiveMutation = useMutation(
    trpc.authenticated.projects.reviewImage.updateArchived.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.authenticated.projects.reviewImage.list.queryOptions({
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
        <p className="mt-1 text-sm text-muted-foreground">
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
        Errored: (error) => (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Images unavailable</EmptyTitle>
              <EmptyDescription>{getErrorMessage(error)}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ),
        Empty: (
          <Empty>
            <EmptyHeader>
              <ImageIcon className="mx-auto size-8 text-muted-foreground" />
              <EmptyTitle>No review images yet</EmptyTitle>
              <EmptyDescription>
                Reviewers can upload images from their review link.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ),
        Success: ({ data: images }) => (
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {images.map((image) => (
              <li
                key={image.id}
                className={`overflow-hidden rounded-xl border bg-card shadow-sm ${image.archivedAt ? "opacity-60" : ""}`}
              >
                <div className="aspect-[4/3] bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URLs are returned by the authorized query */}
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
                    <p className="mt-1 text-xs text-muted-foreground">
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

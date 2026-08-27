"use client";

import { Button } from "@workspace/ui/components/button";
import { GithubIcon } from "@workspace/ui/components/icons/github-icon";

type GitHubNotConnectedProps = {
  githubAppName?: string;
};

export function GitHubNotConnected({
  githubAppName,
}: GitHubNotConnectedProps) {
  const installationUrl = githubAppName
    ? `https://github.com/apps/${githubAppName}/installations/new`
    : undefined;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">
        No GitHub account connected. Install the Faster Fixes GitHub App to
        enable automatic issue creation from feedback.
      </p>
      {installationUrl ? (
        <Button asChild>
          <a
            href={installationUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <GithubIcon className="size-4" />
            Connect to GitHub
          </a>
        </Button>
      ) : (
        <p className="text-destructive text-sm">
          The GitHub App is not configured for this installation.
        </p>
      )}
    </div>
  );
}

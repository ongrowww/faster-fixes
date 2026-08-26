import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/core";

function getGitHubAppCredentials() {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!appId || !privateKey) {
    throw new Error("GitHub App credentials are not configured.");
  }

  return { appId, privateKey };
}

export function getAppOctokit() {
  const { appId, privateKey } = getGitHubAppCredentials();
  return new Octokit({
    authStrategy: createAppAuth,
    auth: { appId, privateKey },
  });
}

export function getInstallationOctokit(installationId: number) {
  const { appId, privateKey } = getGitHubAppCredentials();
  return new Octokit({
    authStrategy: createAppAuth,
    auth: { appId, privateKey, installationId },
  });
}

"use client";

const TOKEN_PREFIX = "ff_review_token:";

export function resolveReviewSession(projectId: string) {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const tokenFromLink = hash.get("ff_token");
  if (tokenFromLink) {
    sessionStorage.setItem(`${TOKEN_PREFIX}${projectId}`, tokenFromLink);
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );
    return tokenFromLink;
  }
  return sessionStorage.getItem(`${TOKEN_PREFIX}${projectId}`);
}

export function reviewHeaders(projectId: string, token: string) {
  return {
    "X-API-Key": projectId,
    "X-Reviewer-Token": token,
  };
}

const TOKEN_PREFIX = "ff_review_token:";

export function resolveReviewSession(projectId: string) {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const tokenFromLink = hash.get("ff_token");
  if (tokenFromLink) {
    try {
      sessionStorage.setItem(`${TOKEN_PREFIX}${projectId}`, tokenFromLink);
    } catch {
      /* Private browsing may deny storage while the link remains usable. */
    }
    window.history.replaceState(
      window.history.state,
      "",
      window.location.pathname + window.location.search,
    );
    return tokenFromLink;
  }
  try {
    return sessionStorage.getItem(`${TOKEN_PREFIX}${projectId}`);
  } catch {
    return null;
  }
}

export function reviewHeaders(projectId: string, token: string) {
  return { "X-API-Key": projectId, "X-Reviewer-Token": token };
}

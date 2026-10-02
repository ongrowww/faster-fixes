import type { Page } from "@playwright/test";

export async function choosePageFeedback(
  page: Page,
  label = "Comment on this page",
) {
  const action = page.getByRole("button", { name: label, exact: true });
  // Injected-client demos have no image gallery; published embeds offer both review modes.
  if (await action.isVisible()) await action.click();
}

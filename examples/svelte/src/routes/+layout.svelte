<script lang="ts">
  import { env } from "$env/dynamic/public";
  import { initFasterFixes } from "@fasterfixes/svelte";
  import ControlBar from "$lib/ControlBar.svelte";

  let { children } = $props();

  const projectId = env.NEXT_PUBLIC_FF_API_KEY;
  if (projectId === undefined || projectId === "") {
    throw new Error(
      "Set NEXT_PUBLIC_FF_API_KEY to a Project ID, in examples/svelte/.env.local or the environment.",
    );
  }

  initFasterFixes({
    projectId,
    apiOrigin: env.NEXT_PUBLIC_FF_API_ORIGIN || undefined,
  });
</script>

<nav>
  <a href="/">Home</a>
  <a href="/second">Second page</a>
</nav>
<ControlBar />
<main>
  {@render children()}
</main>

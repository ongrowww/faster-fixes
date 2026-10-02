import { createFasterFixes } from "@fasterfixes/vue";
import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./router";

const projectId: unknown = import.meta.env.NEXT_PUBLIC_FF_API_KEY;
const apiOrigin: unknown = import.meta.env.NEXT_PUBLIC_FF_API_ORIGIN;

if (typeof projectId !== "string" || projectId === "") {
  throw new Error(
    "Set NEXT_PUBLIC_FF_API_KEY to a Project ID, in examples/vue/.env.local or the environment.",
  );
}

createApp(App)
  .use(router)
  .use(
    createFasterFixes({
      projectId,
      apiOrigin: typeof apiOrigin === "string" ? apiOrigin : undefined,
    }),
  )
  .mount("#app");

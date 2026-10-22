import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import "./styles/globals.css";

const router = createRouter({
  routeTree,
  // Vite's BASE_URL carries the GitHub Pages subpath (see vite.config.ts).
  basepath: import.meta.env.BASE_URL,
  scrollRestoration: true,
  defaultHashScrollIntoView: { behavior: "smooth", block: "start" },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);

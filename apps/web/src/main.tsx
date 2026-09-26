import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LazyMotion } from "motion/react";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router";
import { routes } from "./app/routes";
import { BootScreen } from "./components/BootScreen";
import "./styles.css";

const queryClient = new QueryClient({
  defaultOptions: {
    // The data only changes on deploy, so there's no need to refetch while the page is open.
    queries: { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false },
  },
});

const loadMotion = () => import("./lib/motion-features").then((m) => m.default);
const router = createBrowserRouter(routes);

/** The app, with the boot screen over it on every visit while it loads underneath. */
function Root() {
  const [booted, setBooted] = useState(false);
  return (
    <>
      <RouterProvider router={router} />
      {!booted && (
        <BootScreen
          onDone={() => {
            setBooted(true);
          }}
        />
      )}
    </>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("#root is missing from index.html");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* `strict` makes a stray full `motion` import an error, keeping the bundle small. */}
      <LazyMotion features={loadMotion} strict>
        <Root />
      </LazyMotion>
    </QueryClientProvider>
  </StrictMode>,
);

import type { RouteObject } from "react-router";
import { AppShell } from "../components/AppShell";
import { HomePage } from "../pages/HomePage";
import { NotFoundPage } from "../pages/NotFoundPage";

// The home page ships with the app; every other page loads on first visit, so the first screen
// doesn't wait for code it may never need (the explorer, the charts…).
export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage />, handle: { bleed: true } },
      {
        path: "explore",
        lazy: () => import("../pages/ExplorePage").then((m) => ({ Component: m.ExplorePage })),
      },
      {
        path: "explore/:id",
        lazy: () => import("../pages/ExplorePage").then((m) => ({ Component: m.ExplorePage })),
      },
      {
        path: "entity/:id",
        handle: { bleed: true },
        lazy: () => import("../pages/EntityPage").then((m) => ({ Component: m.EntityPage })),
      },
      {
        path: "timeline",
        lazy: () => import("../pages/TimelinePage").then((m) => ({ Component: m.TimelinePage })),
      },
      {
        path: "analytics",
        lazy: () => import("../pages/AnalyticsPage").then((m) => ({ Component: m.AnalyticsPage })),
      },
      {
        path: "credits",
        lazy: () => import("../pages/CreditsPage").then((m) => ({ Component: m.CreditsPage })),
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];

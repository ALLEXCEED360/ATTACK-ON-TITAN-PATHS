import type { RouteObject } from "react-router";
import { AppShell } from "../components/AppShell";
import { AnalyticsPage } from "../pages/AnalyticsPage";
import { CreditsPage } from "../pages/CreditsPage";
import { EntityPage } from "../pages/EntityPage";
import { ExplorePage } from "../pages/ExplorePage";
import { HomePage } from "../pages/HomePage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { TimelinePage } from "../pages/TimelinePage";

export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage />, handle: { bleed: true } },
      { path: "explore", element: <ExplorePage /> },
      { path: "explore/:id", element: <ExplorePage /> },
      { path: "entity/:id", element: <EntityPage />, handle: { bleed: true } },
      { path: "timeline", element: <TimelinePage /> },
      { path: "analytics", element: <AnalyticsPage /> },
      { path: "credits", element: <CreditsPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];

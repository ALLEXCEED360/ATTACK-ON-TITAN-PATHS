import type { RouteObject } from "react-router";
import { AppShell } from "../components/AppShell";
import { AnalyticsPage } from "../pages/AnalyticsPage";
import { EntityPage } from "../pages/EntityPage";
import { ExplorePage } from "../pages/ExplorePage";
import { HomePage } from "../pages/HomePage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { TimelinePage } from "../pages/TimelinePage";

export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "explore", element: <ExplorePage /> },
      { path: "explore/:id", element: <ExplorePage /> },
      { path: "entity/:id", element: <EntityPage /> },
      { path: "timeline", element: <TimelinePage /> },
      { path: "analytics", element: <AnalyticsPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];

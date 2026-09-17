import { createBrowserRouter, Navigate, type RouteObject } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import LoginPage from "../pages/LoginPage";
import DashboardPage from "../pages/DashboardPage";
import ProfilePage from "../pages/ProfilePage";
import SettingsPage from "../pages/SettingsPage";
import ProtectedRoute from "./ProtectedRoute";
import PublicOnlyRoute from "./PublicOnlyRoute";
import MenuGuard from "./MenuGuard";
import TemplateListPage from "../pages/TemplateListPage";
import TemplateDetailPage from "../pages/TemplateDetailPage";
import TemplateBuilderForm from "../pages/TemplateBuilderForm";
import NotificationsPage from "../pages/NotificationsPage";
import ErrorPage from "../pages/ErrorPage";

const routes: RouteObject[] = [
  {
    // Pathless root route — its errorElement catches thrown errors from ANY descendant
    // route's render/loader/action, so this is a single global error boundary rather
    // than one per page.
    errorElement: <ErrorPage />,
    children: [
      {
        path: "/login",
        element: (
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        ),
      },
      {
        element: (
          <ProtectedRoute>
            <AppLayout />
        </ProtectedRoute>
        ),
        children: [
          {
            index: true,
            element: (
              <MenuGuard>
                <DashboardPage />
              </MenuGuard>
            ),
          },
          {
            path: "profile",
            element: (
              <MenuGuard>
                <ProfilePage />
              </MenuGuard>
            ),
          },
          {
            path: "settings",
            element: (
              <MenuGuard>
                <SettingsPage />
              </MenuGuard>
            ),
          },
          {
            path: "templates",
            element: (
              <MenuGuard>
                <TemplateListPage />
              </MenuGuard>
            ),
          },
          {
            path: "templates/new",
            element: (
              <MenuGuard>
                <TemplateBuilderForm />
              </MenuGuard>
            ),
          },
          {
            path: "templates/:id",
            element: (
              <MenuGuard>
                <TemplateDetailPage />
              </MenuGuard>
            ),
          },
          {
            path: "templates/:id/edit",
            element: (
              <MenuGuard>
                <TemplateBuilderForm />
              </MenuGuard>
            ),
          },
          {
            path: "notifications",
            element: (
              <MenuGuard>
                <NotificationsPage />
              </MenuGuard>
            ),
          },
        ],
      },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
];

export default createBrowserRouter(routes);

import { Suspense } from "react";
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
import TemplateFormPage from "../pages/TemplateFormPage";
import TemplateTypeListPage from "../pages/TemplateTypeListPage";
import FieldListPage from "../pages/FieldListPage";
import NotificationsPage from "../pages/NotificationsPage";
import ErrorPage from "../pages/ErrorPage";
// Lazy-loaded (see that file's comment): TemplateEditorPage pulls in the full Tiptap/
// reactjs-tiptap-editor engine (Excalidraw/Mermaid/KaTeX and friends) via FullPageEditor —
// a genuinely heavy dependency graph that shouldn't download until someone actually opens
// the popup editor. Every other route above is small enough that eager-loading it isn't
// worth the extra Suspense/chunk complexity.
import TemplateEditorPage from "./LazyTemplateEditorPage";
import TemplateEditorSkeleton from "../components/template/TemplateEditorSkeleton";

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
        // Deliberately NOT nested inside AppLayout — this is a distraction-free, full-page
        // editor opened via window.open() into its own browser window/tab, so it renders no
        // sidebar/header chrome. MenuGuard here is effectively a no-op (it can't exact-match
        // this parameterized path against the unfiltered menu catalogue, same as /profile or
        // /settings today) — TemplateEditorPage does its own canMenu(724, "view"/"edit") check.
        path: "templates/:id/editor",
        element: (
          <ProtectedRoute>
            <MenuGuard>
              <Suspense fallback={<TemplateEditorSkeleton />}>
                <TemplateEditorPage />
              </Suspense>
            </MenuGuard>
          </ProtectedRoute>
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
                <TemplateFormPage />
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
                <TemplateFormPage />
              </MenuGuard>
            ),
          },
          {
            path: "template-types",
            element: (
              <MenuGuard>
                <TemplateTypeListPage />
              </MenuGuard>
            ),
          },
          {
            path: "fields",
            element: (
              <MenuGuard>
                <FieldListPage />
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

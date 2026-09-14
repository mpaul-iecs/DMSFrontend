import { createBrowserRouter, Navigate, type RouteObject } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import LoginPage from "../pages/LoginPage";
import DashboardPage from "../pages/DashboardPage";
import ProfilePage from "../pages/ProfilePage";
import SettingsPage from "../pages/SettingsPage";
import ProtectedRoute from "./ProtectedRoute";
import PublicOnlyRoute from "./PublicOnlyRoute";
import TemplatePage from "../pages/TemplatePage";

const routes: RouteObject[] = [
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
    //   <ProtectedRoute>
        <AppLayout />
    //   </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "profile", element: <ProfilePage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "templates", element: <TemplatePage /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
];

export default createBrowserRouter(routes);

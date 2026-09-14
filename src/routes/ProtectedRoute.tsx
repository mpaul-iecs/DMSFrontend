import type { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";


interface ProtectedRouteProps {
  children: ReactElement;
  permission?: string;
}

export default function ProtectedRoute({ children, permission }: ProtectedRouteProps) {
  const { isAuthenticated, hasPermission } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (permission && !hasPermission(permission)) return <Navigate to="/" replace />;
  return children;
}

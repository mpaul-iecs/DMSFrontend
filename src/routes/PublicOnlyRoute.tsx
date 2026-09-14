import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import type { ReactElement } from "react";

export default function PublicOnlyRoute({ children }: { children: ReactElement }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/" replace />;
  return children;
}
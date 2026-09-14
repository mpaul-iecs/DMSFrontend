import { useAppSelector } from "../store/hooks";

export default function useAuth() {
  const { user, isAuthenticated, loading } = useAppSelector((s) => s.auth);
  const hasPermission = (perm: string) => user?.permissions?.includes(perm) ?? false;
  const hasRole = (role: string) => user?.roles?.includes(role) ?? false;
  return { user, isAuthenticated, loading, hasPermission, hasRole };
}

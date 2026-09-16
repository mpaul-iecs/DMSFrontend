import { memo, useMemo, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { ShieldOff } from "lucide-react";
import { useAppSelector } from "../store/hooks";
import useAuth from "../hooks/useAuth";
import EmptyState from "../components/ui/EmptyState";

interface MenuGuardProps {
  children: ReactNode;
}

/**
 * Route-level counterpart to Sidebar.tsx's nav filtering. Hiding a sidebar link the user
 * can't view doesn't stop someone typing or bookmarking the URL directly — this closes that
 * gap: if the current path matches a menu-driven URL, the route only renders once the user
 * has "view" for that menu's idMenu. A path with no matching menu entry (e.g. /profile,
 * /settings — not part of the dynamic menu tree) renders unguarded, since there's nothing to
 * check permission against.
 *
 * Matches against `state.menu.allMenus` (GET /menus, the full unfiltered catalogue), NOT
 * `state.menu.modules` (GET /menus/me) — `/menus/me` is already permission-filtered
 * server-side (`.Where(r => r.CanView)`), so a menu the user just lost "view" for
 * disappears from `modules` entirely. Using `modules` as the "is this URL menu-governed"
 * source made MenuGuard blind to exactly the case it needs to catch: once permission was
 * revoked, the matching menu vanished from the lookup and the route rendered unguarded
 * instead of being blocked. `allMenus` is permission-independent, so the "is this URL
 * menu-governed" question and the "can THIS user view it" question (canMenu, below) stay
 * properly separate.
 *
 * AppLayout.tsx only mounts the route tree (and therefore this) once both
 * state.menu.fetched and state.menu.allMenusFetched are true, so `allMenus` here is never
 * evaluated while still empty-because-not-fetched-yet.
 */
function MenuGuard({ children }: MenuGuardProps) {
  const location = useLocation();
  const allMenus = useAppSelector((s) => s.menu.allMenus);
  const { canMenu } = useAuth();

  const matchedIdMenu = useMemo(
    () => allMenus.find((menu) => menu.url === location.pathname)?.idMenu ?? null,
    [allMenus, location.pathname]
  );

  if (matchedIdMenu !== null && !canMenu(matchedIdMenu, "view")) {
    return (
      <div className="flex items-center justify-center py-24">
        <EmptyState message="You don't have permission to view this page." icon={ShieldOff} />
      </div>
    );
  }

  return <>{children}</>;
}

export default memo(MenuGuard);

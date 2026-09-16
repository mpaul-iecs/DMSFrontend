import { memo, type ReactNode } from "react";
import useAuth from "../../hooks/useAuth";

interface CanProps {
  /** The menu row's own idMenu — same id the sidebar entry/permission-assignment picker use. */
  idMenu: number | string;
  /** "view" | "create" | "edit" | "delete" | "report" today — whatever the backend currently grants. */
  action: string;
  children: ReactNode;
  /** Rendered instead when the permission is missing — omit for "render nothing". */
  fallback?: ReactNode;
}

/**
 * Declarative permission gate for any per-menu action — wrap a future create/edit/delete
 * button the same way this wraps nothing today:
 *
 *   <Can idMenu={document.menuId} action="edit"><Button onClick={onEdit}>Edit</Button></Can>
 *
 * No new plumbing needed per menu/action — this reads the same JWT-derived
 * "menu:{idMenu}:{action}" claims Sidebar.tsx filters on (see useAuth.ts's `canMenu`).
 */
function Can({ idMenu, action, children, fallback = null }: CanProps) {
  const { canMenu } = useAuth();
  return canMenu(idMenu, action) ? <>{children}</> : <>{fallback}</>;
}

export default memo(Can);

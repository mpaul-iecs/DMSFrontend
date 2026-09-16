/** Mirrors InnerEye.DMS.Foundation.Payloads.Menu.MenuItemDto. */
export interface MenuItem {
  idMenu: number;
  subMenu: string;
  subMenuOrder: number;
  url?: string | null;
  subMenuIcon?: string | null;
}

/**
 * Mirrors InnerEye.DMS.Foundation.Payloads.Menu.MenuMainDto.
 * `url` is populated when the main menu itself is directly navigable (no/one submenu) —
 * see Sidebar.tsx's single-submenu collapse behavior.
 */
export interface MenuMain {
  mainMenu: string;
  mainMenuOrder: number;
  menuIcon?: string | null;
  url?: string | null;
  subMenus: MenuItem[];
}

/** Mirrors InnerEye.DMS.Foundation.Payloads.Menu.MenuModuleDto — top-level shape of GET /menus/me. */
export interface MenuModule {
  moduleName: string;
  moduleOrder: number;
  mainMenus: MenuMain[];
}

/** Mirrors InnerEye.DMS.Foundation.Payloads.Menu.MenuNodeDto — a single flat catalogue row (GET /menus/{id}). */
export interface MenuNode {
  idMenu: number;
  moduleName: string;
  moduleOrder: number;
  mainMenu?: string | null;
  mainMenuOrder?: number | null;
  subMenu?: string | null;
  subMenuOrder?: number | null;
  url?: string | null;
  menuIcon?: string | null;
  subMenuIcon?: string | null;
}

/** Mirrors InnerEye.DMS.Foundation.Payloads.Menu.MenuPermissionDto — flat per-menu CRUD flags (GET /menus/permissions/me). */
export interface MenuPermission {
  idMenu: number;
  moduleName: string;
  mainMenu?: string | null;
  subMenu?: string | null;
  url?: string | null;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canReport: boolean;
}

/** Mirrors InnerEye.DMS.Foundation.Payloads.Menu.AssignMenuPermissionDto — POST /menus/permissions body. */
export interface AssignMenuPermissionRequest {
  idRole: number;
  idMenu: number;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canReport: boolean;
}

/** Mirrors InnerEye.DMS.Foundation.Payloads.Menu.RoleMenuPermissionDto — GET /menus/{idMenu}/permissions/{idRole}. */
export interface RoleMenuPermission {
  idRole: number;
  idMenu: number;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canReport: boolean;
}

export interface MenuState {
  modules: MenuModule[];
  /** Flat catalogue of every menu (GET /menus) — used to populate the Settings assign-permission picker. */
  allMenus: MenuNode[];
  permissions: MenuPermission[];
  loading: boolean;
  /**
   * True once fetchMyMenuThunk has settled (fulfilled OR rejected) at least once — distinct
   * from `modules.length > 0`, since a user with zero menu access has an empty `modules`
   * forever, and `loading` alone can't tell "not fetched yet" from "fetched, found nothing"
   * apart either (both are `false`). AppLayout.tsx gates route rendering on this, not on
   * `loading`, so MenuGuard never evaluates permissions against a still-empty pre-fetch
   * `modules` and briefly renders a page the user can't actually view.
   */
  fetched: boolean;
  /**
   * Same rationale as `fetched` above, but for `allMenus` (GET /menus, the unfiltered
   * catalogue) — MenuGuard.tsx needs this specifically because `modules` (GET /menus/me) is
   * already permission-filtered server-side, so a menu the user just lost "view" for
   * disappears from `modules` entirely and MenuGuard can no longer tell "not part of the
   * menu system" apart from "filtered out, no permission" using that list alone. `allMenus`
   * is the permission-independent source of "does this URL belong to the menu system at
   * all" — the actual view decision still comes from the user's own canMenu(idMenu, "view").
   */
  allMenusFetched: boolean;
  allMenusLoading: boolean;
  permissionsLoading: boolean;
  assigning: boolean;
  error: string | null;
}

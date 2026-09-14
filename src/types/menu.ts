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
  allMenusLoading: boolean;
  permissionsLoading: boolean;
  assigning: boolean;
  error: string | null;
}

import api from "./axiosInstance";
import endpoints from "../utilities/endpoint";
import type { BaseResponse } from "../types/auth";
import type {
  AssignMenuPermissionRequest,
  MenuModule,
  MenuNode,
  MenuPermission,
  RoleMenuPermission,
} from "../types/menu";

/**
 * All raw HTTP calls for the menu domain live here — thunks only orchestrate them.
 * MenusController is currently anonymous on the backend (dummy empNo/tenantId), so the
 * X-Tenant-Id header sent below is ignored server-side for now. axiosInstance's request
 * interceptor attaches both the bearer token and this header automatically to every
 * request once authThunks.ts resolves the current user — no per-service wiring needed
 * here or elsewhere when MenusController becomes [Authorize]'d.
 */
const menuService = {
  getAll: () => api.get<BaseResponse<MenuNode[]>>(endpoints.menus.all),

  myMenu: () => api.get<BaseResponse<MenuModule[]>>(endpoints.menus.me),

  myPermissions: () => api.get<BaseResponse<MenuPermission[]>>(endpoints.menus.permissionsMe),

  getById: (idMenu: number) => api.get<BaseResponse<MenuNode>>(endpoints.menus.byId(idMenu)),

  getRolePermission: (idMenu: number, idRole: number) =>
    api.get<BaseResponse<RoleMenuPermission>>(endpoints.menus.rolePermission(idMenu, idRole)),

  assignPermission: (payload: AssignMenuPermissionRequest) =>
    api.post<BaseResponse<null>>(endpoints.menus.assignPermission, payload),
};

export default menuService;

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
 * MenusController is currently anonymous on the backend (dummy empNo/tenantId), so no
 * X-Tenant-Id header is sent yet. Once it's [Authorize]'d, add the header here (read the
 * tenantId off the current user in the auth slice) — axiosInstance already attaches the
 * bearer token to every request, so only the tenant header needs adding at that point.
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

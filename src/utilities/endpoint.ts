const API = import.meta.env.VITE_API_BASE_URL || "/api";

export default {
  auth: {
    login: `${API}/Auth/login`,
    refresh: `${API}/Auth/refresh`,
    revoke: `${API}/Auth/revoke`,
    me: `${API}/Auth/me`,
  },
  menus: {
    all: `${API}/Menus`,
    me: `${API}/Menus/me`,
    permissionsMe: `${API}/Menus/permissions/me`,
    byId: (idMenu: number | string) => `${API}/Menus/${idMenu}`,
    assignPermission: `${API}/Menus/permissions`,
    rolePermission: (idMenu: number | string, idRole: number | string) =>
      `${API}/Menus/${idMenu}/permissions/${idRole}`,
  },
  roles: {
    base: `${API}/Roles`,
    byId: (idRole: number | string) => `${API}/Roles/${idRole}`,
  },
};

const API = import.meta.env.VITE_API_BASE_URL || "/api";

/** Origin the API is served from, e.g. "http://localhost:5137" — SignalR hubs live at
 * the origin root ("/hubs/..."), not under the "/api/v1/dms" API base path. */
const API_ORIGIN = new URL(API, window.location.origin).origin;

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
  notifications: {
    feed: `${API}/Notifications`,
    unreadCount: `${API}/Notifications/unread-count`,
    markRead: (id: number | string) => `${API}/Notifications/${id}/read`,
    markAllRead: `${API}/Notifications/read-all`,
    open: (id: number | string) => `${API}/Notifications/${id}/open`,
  },
  hubs: {
    notifications: `${API_ORIGIN}/hubs/notifications`,
  },
};

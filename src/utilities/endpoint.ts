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
  appSettings: {
    base: `${API}/AppSettings`,
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
  templates: {
    base: `${API}/Templates`,
    byId: (id: number | string) => `${API}/Templates/${id}`,
    draft: `${API}/Templates/draft`,
    draftUpload: `${API}/Templates/draft/upload`,
    newVersion: (id: number | string) => `${API}/Templates/${id}/new-version`,
    submit: (id: number | string) => `${API}/Templates/${id}/submit`,
    approve: (id: number | string) => `${API}/Templates/${id}/approve`,
    reject: (id: number | string) => `${API}/Templates/${id}/reject`,
    reviewInterval: (id: number | string) => `${API}/Templates/${id}/review-interval`,
    reviewHistory: (id: number | string) => `${API}/Templates/${id}/review-history`,
    sections: (id: number | string) => `${API}/Templates/${id}/sections`,
    sectionById: (id: number | string, sectionId: number | string) => `${API}/Templates/${id}/sections/${sectionId}`,
    fields: (id: number | string, sectionId: number | string) => `${API}/Templates/${id}/sections/${sectionId}/fields`,
    fieldById: (id: number | string, sectionId: number | string, fieldId: number | string) =>
      `${API}/Templates/${id}/sections/${sectionId}/fields/${fieldId}`,
    download: (id: number | string) => `${API}/Templates/${id}/download`,
    auditLog: (id: number | string) => `${API}/Templates/${id}/audit-log`,
  },
  templateTypes: {
    base: `${API}/TemplateTypes`,
    byId: (id: number | string) => `${API}/TemplateTypes/${id}`,
  },
  departments: {
    base: `${API}/Departments`,
  },
};

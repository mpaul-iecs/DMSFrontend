/* Thin wrapper around the backend. A DocumentRecord is now { id, fileName, status,
   versionNumber, html, createdAt, updatedAt } — one HTML string for the whole document,
   no rendition/blocks/per-block content map (see docs/backend-integration.md). */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5137/api/v1/dms/Documents";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success) {
    throw new Error(body?.message || `Request failed (${res.status})`);
  }
  return body.data;
}

export const api = {
  async upload(file) {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BASE_URL}/api/v1/dms/Documents/upload`, { method: "POST", body: form });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.success) throw new Error(body?.message || "Upload failed");
    return body.data; // { id, fileName, status, versionNumber, html }
  },

  list: () => request("/api/v1/dms/Documents"),
  get: (id) => request(`/api/v1/dms/Documents/${id}`),

  saveDraft: (id, { html, headerHtml, footerHtml }) =>
    request(`/api/v1/dms/Documents/${id}/draft`, {
      method: "PUT",
      body: JSON.stringify({ html, headerHtml, footerHtml }),
    }),

  submit: (id) => request(`/api/v1/dms/Documents/${id}/submit`, { method: "POST" }),
  requestChanges: (id) => request(`/api/v1/dms/Documents/${id}/request-changes`, { method: "POST" }),
  approve: (id) => request(`/api/v1/dms/Documents/${id}/approve`, { method: "POST" }),
  reject: (id) => request(`/api/v1/dms/Documents/${id}/reject`, { method: "POST" }),

  downloadUrl: (id) => `${BASE_URL}/api/v1/dms/Documents/${id}/download`,
  viewUrl: (id) => `${BASE_URL}/api/v1/dms/Documents/${id}/view`,
};


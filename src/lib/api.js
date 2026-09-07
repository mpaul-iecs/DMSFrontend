/* Thin wrapper around the backend. A DocumentRecord is now { id, fileName, status,
   versionNumber, html, createdAt, updatedAt } — one HTML string for the whole document,
   no rendition/blocks/per-block content map (see docs/backend-integration.md). */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

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
    const res = await fetch(`${BASE_URL}/api/documents/upload`, { method: "POST", body: form });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.success) throw new Error(body?.message || "Upload failed");
    return body.data; // { id, fileName, status, versionNumber, html }
  },

  list: () => request("/api/documents"),
  get: (id) => request(`/api/documents/${id}`),

  saveDraft: (id, { html, headerHtml, footerHtml }) =>
    request(`/api/documents/${id}/draft`, {
      method: "PUT",
      body: JSON.stringify({ html, headerHtml, footerHtml }),
    }),

  submit: (id) => request(`/api/documents/${id}/submit`, { method: "POST" }),
  requestChanges: (id) => request(`/api/documents/${id}/request-changes`, { method: "POST" }),
  approve: (id) => request(`/api/documents/${id}/approve`, { method: "POST" }),
  reject: (id) => request(`/api/documents/${id}/reject`, { method: "POST" }),

  downloadUrl: (id) => `${BASE_URL}/api/documents/${id}/download`,
  viewUrl: (id) => `${BASE_URL}/api/documents/${id}/view`,
};


export const formatDate = (d?: string | number | Date | null) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

export const formatDateTime = (d?: string | number | Date | null) =>
  d
    ? new Date(d).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export function buildQueryParams(filters: Record<string, string | number | boolean | null | undefined>) {
  const p = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v != null && v !== "") p.append(k, String(v));
  });
  return p.toString();
}

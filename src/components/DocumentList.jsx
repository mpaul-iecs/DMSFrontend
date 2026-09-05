import React, { useEffect, useState } from "react";
import { api } from "../lib/api";

/* Lists what's already on the server, below the upload dropzone.
   - File name -> resumes editing (onOpen): status-based mode (Draft/ChangesRequested go to
     the author editor, Approved/UnderReview go to review).
   - Eye icon -> onView: ALWAYS opens the in-app read-only viewer, regardless of status.
   - Download icon -> a plain link straight at the backend's /download endpoint. */

const STATUS_LABEL = {
  Draft: "Draft",
  UnderReview: "Under review",
  ChangesRequested: "Changes requested",
  Approved: "Approved",
  Rejected: "Rejected",
};

const STATUS_CLASS = {
  Draft: "bg-slate-100 text-slate-600",
  UnderReview: "bg-amber-100 text-amber-800",
  ChangesRequested: "bg-rose-100 text-rose-700",
  Approved: "bg-emerald-100 text-emerald-800",
  Rejected: "bg-rose-100 text-rose-700",
};

export default function DocumentList({ onOpen, onView }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await api.list();
        if (!cancelled) setDocs(list);
      } catch (e) {
        if (!cancelled) setError(e.message || "Could not load documents.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <p className="mx-auto max-w-3xl text-xs text-slate-200">Loading documents…</p>;
  if (error) return <p className="mx-auto max-w-3xl text-xs font-semibold text-rose-200">{error}</p>;
  if (!docs.length) return null;

  return (
    <div className="mx-auto mb-16 max-w-3xl">
      <h3 className="mb-2 text-sm font-semibold text-white">Existing documents</h3>
      <table className="w-full overflow-hidden rounded-lg bg-white text-left text-xs">
        <thead>
          <tr className="bg-slate-50 text-slate-500">
            <th className="px-3 py-2 font-semibold">File</th>
            <th className="px-3 py-2 font-semibold">Status</th>
            <th className="px-3 py-2 font-semibold">Version</th>
            <th className="px-3 py-2 font-semibold">Updated</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {docs.map((d) => (
            <tr key={d.id} className="border-b border-slate-100 last:border-0">
              <td className="cursor-pointer px-3 py-2 font-semibold text-emerald-700 hover:underline"
                onClick={() => onOpen(d.id)} title="Resume editing">
                {d.fileName}
              </td>
              <td className="px-3 py-2">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLASS[d.status] || "bg-slate-100 text-slate-600"}`}>
                  {STATUS_LABEL[d.status] || d.status}
                </span>
              </td>
              <td className="px-3 py-2">{d.versionNumber || "—"}</td>
              <td className="px-3 py-2">{new Date(d.updatedAt).toLocaleString()}</td>
              <td className="px-3 py-2">
                <button className="mr-2 text-sm" title="View (read-only, in-app)"
                  onClick={(e) => { e.stopPropagation(); onView(d.id); }}>
                  👁
                </button>
                <a href={api.downloadUrl(d.id)} title="Download current version" className="text-sm"
                  onClick={(e) => e.stopPropagation()}>
                  ⬇
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

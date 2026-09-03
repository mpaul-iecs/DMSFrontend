import React, { useEffect, useState } from "react";
import { api } from "../lib/api";

/* Lists what's already on the server, below the upload dropzone.
   - File name -> resumes editing (onOpen): status-based mode (Draft/ChangesRequested go to
     the author editor, Approved/UnderReview go to review).
   - Eye icon -> onView: ALWAYS opens the in-app read-only viewer (same ReviewView Admin
     review uses), regardless of status. This renders the live block content directly —
     no image loss, no plain-text PDF flattening — which is strictly more faithful than
     asking the browser to render a raw exported file. It also sidesteps a real limitation:
     a browser has no native way to render .docx inline at all, so pointing "view" at the
     backend's /view endpoint for a docx just downloads it, which isn't what "view" means.
   - Download icon -> a plain link straight at the backend's /download endpoint (forces
     save-as); this one SHOULD hit the raw file, since "download" means "give me the file". */

const STATUS_LABEL = {
  Draft: "Draft",
  UnderReview: "Under review",
  ChangesRequested: "Changes requested",
  Approved: "Approved",
  Rejected: "Rejected",
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

  if (loading) return <p className="meta">Loading documents…</p>;
  if (error) return <p className="meta" style={{ color: "#96233f" }}>{error}</p>;
  if (!docs.length) return null;

  return (
    <div className="doclist">
      <h3 style={{ margin: "0 0 8px", fontSize: 14 }}>Existing documents</h3>
      <table className="doclist-table">
        <thead>
          <tr>
            <th>File</th>
            <th>Status</th>
            <th>Version</th>
            <th>Updated</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {docs.map((d) => (
            <tr key={d.id}>
              <td className="link" onClick={() => onOpen(d.id)} title="Resume editing">
                {d.fileName}
              </td>
              <td>
                <span className={"status-pill status-" + d.status}>
                  {STATUS_LABEL[d.status] || d.status}
                </span>
              </td>
              <td>{d.versionNumber || "—"}</td>
              <td>{new Date(d.updatedAt).toLocaleString()}</td>
              <td className="doclist-actions">
                <button
                  className="icon-btn"
                  title="View (read-only, in-app)"
                  onClick={(e) => { e.stopPropagation(); onView(d.id); }}
                >
                  👁
                </button>
                <a
                  href={api.downloadUrl(d.id)}
                  title="Download current version"
                  onClick={(e) => e.stopPropagation()}
                >
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
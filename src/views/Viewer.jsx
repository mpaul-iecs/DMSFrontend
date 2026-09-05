import React, { useEffect, useState } from "react";
import { api } from "../lib/api";

/* Dedicated, standalone viewer — opened in its own browser tab via ?viewId=<id> (see
   App.jsx's routing check and DocumentList's eye icon, which calls window.open instead of
   navigating within the app). Read-only: the document's current saved HTML, plus a
   Download button. */
export default function Viewer({ id }) {
  const [doc, setDoc] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const record = await api.get(id);
        if (!cancelled) setDoc(record);
      } catch (e) {
        if (!cancelled) setError(e.message || "Could not load that document.");
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (error) {
    return <div className="p-6"><p className="text-sm font-semibold text-rose-700">{error}</p></div>;
  }
  if (!doc) {
    return <div className="p-6"><p className="text-sm text-slate-500">Loading…</p></div>;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2">
          <span className="text-xs text-slate-500">
            {doc.fileName} · {doc.status}{doc.versionNumber ? ` · v${doc.versionNumber}` : ""}
          </span>
          <a className="rounded bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white" href={api.downloadUrl(doc.id)}>
            Download
          </a>
        </div>
        <div className="bg-emerald-50 px-4 py-1.5 text-xs text-emerald-800">
          Read-only view — this tab reflects the document's current saved content.
        </div>
      </div>

      <div className="bg-slate-500 py-10">
        <div className="dms-page">
          <div className="tiptap" dangerouslySetInnerHTML={{ __html: doc.html || "" }} />
        </div>
      </div>
    </div>
  );
}

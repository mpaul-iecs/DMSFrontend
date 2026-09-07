import React, { useEffect, useState } from "react";
import DocumentEditor from "../editors/DocumentEditor";
import { api } from "../lib/api";

/* Standalone read-only viewer — opened in its own tab via ?viewId=<id>. Renders through
   the same editor component as Author/Review so pagination + header/footer look identical. */
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
    <div className="flex min-h-screen flex-col bg-slate-500">
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

      <DocumentEditor
        content={doc.html}
        headerHtml={doc.headerHtml}
        footerHtml={doc.footerHtml}
        bodyCss={doc.bodyCss}
        editable={false}
      />
    </div>
  );
}

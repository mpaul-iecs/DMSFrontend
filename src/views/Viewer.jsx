import React, { useEffect, useState } from "react";
import RenditionHost from "../components/RenditionHost";
import { api } from "../lib/api";

/* Dedicated, standalone viewer — opened in its own browser tab via ?viewId=<id> (see
   App.jsx's routing check and DocumentList's eye icon, which calls window.open instead of
   navigating within the app). Deliberately NOT the same screen as Admin review: no
   Author/Admin toggle, no Save draft/Publish/Request changes/Approve — just the document's
   current content, read-only, plus a Download button. Works identically for a docx or pdf
   document since it only depends on rendition/blocks/content, same as every other view. */

export default function Viewer({ id }) {
  const [doc, setDoc] = useState(null);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState("fit");

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
    return (
      <div style={{ padding: 24 }}>
        <p className="meta" style={{ color: "#96233f" }}>{error}</p>
      </div>
    );
  }
  if (!doc) {
    return (
      <div style={{ padding: 24 }}>
        <p className="meta">Loading…</p>
      </div>
    );
  }

  const rendition = { ...doc.rendition, blocks: doc.blocks, name: doc.fileName };

  return (
    <div>
      <div className="chrome">
        <div className="topbar">
          <div className="left">
            <span className="meta">
              {doc.fileName} · {doc.status}{doc.versionNumber ? ` · v${doc.versionNumber}` : ""}
            </span>
          </div>
          <div className="right">
            <select value={zoom} onChange={(e) => setZoom(e.target.value)}>
              <option value="fit">Fit width</option>
              {[0.5, 0.75, 1, 1.25].map((z) => (
                <option key={z} value={z}>{Math.round(z * 100)}%</option>
              ))}
            </select>
            <a className="btn primary" href={api.downloadUrl(doc.id)}>Download</a>
          </div>
        </div>
        <div className="ribbon readonly">
          Read-only view — this tab reflects the document's current saved content.
        </div>
      </div>

      <RenditionHost
        rendition={rendition}
        zoom={zoom}
        renderSlot={(block) => (
          <div
            className="review-region"
            dangerouslySetInnerHTML={{ __html: doc.content[block.key] || "" }}
          />
        )}
      />
    </div>
  );
}
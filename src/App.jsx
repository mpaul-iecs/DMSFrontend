import React, { useRef, useState } from "react";
import UploadPanel from "./components/UploadPanel";
import DocumentList from "./components/DocumentList";
import Ribbon from "./components/Ribbon";
import AuthorView from "./views/AuthorView";
import ReviewView from "./views/ReviewView";
import Viewer from "./views/Viewer";
import { EditorRegistryProvider } from "./lib/editorRegistry";
import { api } from "./lib/api";

/* The backend now owns parsing, storage and the draft/submit/review state machine — this
   component just reflects whatever DocumentRecord the API returns. `doc` is the source of
   truth; `rendition` for RenditionHost is derived from it, because the backend keeps
   `blocks` alongside the rendition rather than nested inside it, and RenditionHost expects
   them merged (same shape the old localStorage prototype used).

   Dropped from the old prototype, both deliberately:
   - The Tiptap/Lexical engine toggle — Tiptap won the evaluation (master spec §3.1) and
     the backend stores one content map per document, not one per engine, so AuthorView
     is hardcoded to Tiptap now.
   - "Add page" — there's no backend endpoint for it yet (uploaded documents are parsed
     once; extending a document's page structure server-side is future work).
   Comments stay in-memory only for now — there's no comments API in this backend yet. */

export default function App() {
  // A tab opened via DocumentList's eye icon carries ?viewId=<id> — render the standalone
  // read-only Viewer instead of the normal editing app entirely. This check has to live in
  // a component that calls NO hooks itself (App), not before the useState calls below —
  // conditionally returning before hooks run violates Rules of Hooks even though it
  // happens to "work" here since the URL never changes mid-session.
  const viewId = new URLSearchParams(window.location.search).get("viewId");
  if (viewId) return <Viewer id={viewId} />;
  return <AppInner />;
}

function AppInner() {
  const [doc, setDoc] = useState(null);
  const [mode, setMode] = useState("author");
  const [zoom, setZoom] = useState("fit");
  const [content, setContent] = useState({});
  const [comments, setComments] = useState([]);
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);
  const flushRef = useRef(null);

  const notify = (m, tone) => { setToast({ m, tone }); setTimeout(() => setToast(null), 3600); };

  const onUploaded = async (file) => {
    setBusy(true);
    try {
      const record = await api.upload(file);
      setDoc(record);
      setContent(record.content || {});
      setComments([]);
      setMode("author");
      notify(`Parsed ${record.fileName} — ${record.blocks.length} editable section(s) detected.`);
    } catch (e) {
      notify(e.message || "Upload failed.", "err");
    } finally {
      setBusy(false);
    }
  };

  /* Reopens a document already sitting on the server — clicking a row in DocumentList.
     Approved/UnderReview land in review mode (author edits are rejected server-side for
     Approved anyway); Draft/ChangesRequested land back in the author editor. */
  const openExisting = async (id) => {
    setBusy(true);
    try {
      const record = await api.get(id);
      setDoc(record);
      setContent(record.content || {});
      setComments([]);
      setMode(record.status === "Approved" || record.status === "UnderReview" ? "review" : "author");
      notify(`Opened ${record.fileName}.`);
    } catch (e) {
      notify(e.message || "Could not open that document.", "err");
    } finally {
      setBusy(false);
    }
  };

  /* The eye icon — opens a SEPARATE browser tab at ?viewId=<id>, which App's outer router
     check renders as the standalone Viewer (see above), not this app's Admin-review mode.
     No state to manage here at all; the new tab fetches its own data. */
  const viewExisting = (id) => {
    window.open(`${window.location.pathname}?viewId=${id}`, "_blank", "noopener,noreferrer");
  };

  const saveDraft = async () => {
    try {
      await flushRef.current?.();
      notify("Draft saved. No version created — versions are only cut on submit.");
    } catch {
      // flush() already notified the specific error
    }
  };

  const publish = async () => {
    try {
      await flushRef.current?.();
      const updated = await api.submit(doc.id);
      setDoc(updated);
      setMode("review");
      notify(`Published for review — version ${updated.versionNumber}.`);
    } catch (e) {
      notify(e.message || "Could not submit for review.", "err");
    }
  };

  const requestChanges = async () => {
    try {
      const updated = await api.requestChanges(doc.id);
      setDoc(updated);
      setMode("author");
      const openCount = comments.filter((c) => c.status === "OPEN").length;
      notify(`Returned to the author with ${openCount} open comment(s).`);
    } catch (e) {
      notify(e.message || "Could not request changes.", "err");
    }
  };

  const approve = async () => {
    try {
      const updated = await api.approve(doc.id);
      setDoc(updated);
      notify("Approved. This version is sealed.");
    } catch (e) {
      notify(e.message || "Could not approve.", "err");
    }
  };

  const addPage = async () => {
    try {
      await flushRef.current?.();
      const updated = await api.addPage(doc.id);
      setDoc(updated);
      setContent(updated.content);
      notify("Page added.");
    } catch (e) {
      notify(e.message || "Could not add a page.", "err");
    }
  };

  const close = () => {
    if (!confirm("Close this document? It stays saved on the server — this only clears the screen."))
      return;
    setDoc(null); setContent({}); setComments([]); setMode("author");
  };

  if (!doc) {
    return (
      <>
        <UploadPanel onReady={onUploaded} onError={(m) => notify(m, "err")} busy={busy} />
        <DocumentList onOpen={openExisting} onView={viewExisting} />
        {toast && <div className={"toast " + (toast.tone || "")}>{toast.m}</div>}
      </>
    );
  }

  const openCount = comments.filter((c) => c.status === "OPEN").length;
  const rendition = { ...doc.rendition, blocks: doc.blocks, name: doc.fileName };

  return (
    <EditorRegistryProvider>
      <div className="chrome">
        <div className="topbar">
          <div className="left">
            <div className="seg">
              <button className={mode === "author" ? "on" : ""} onClick={() => setMode("author")}>Author</button>
              <button className={mode === "review" ? "on" : ""}
                onClick={async () => { await flushRef.current?.(); setMode("review"); }}>Admin review</button>
            </div>
            <span className="meta">
              {doc.fileName} · {doc.blocks.length} sections · {doc.status}
              {openCount ? ` · ${openCount} open comment${openCount > 1 ? "s" : ""}` : ""}
              {doc.versionNumber ? ` · v${doc.versionNumber}` : ""}
            </span>
          </div>

          <div className="right">
            <select value={zoom} onChange={(e) => setZoom(e.target.value)}>
              <option value="fit">Fit width</option>
              {[0.5, 0.75, 1, 1.25].map((z) => (
                <option key={z} value={z}>{Math.round(z * 100)}%</option>
              ))}
            </select>
            {mode === "author" ? (
              <>
                <button className="btn" onClick={saveDraft}>Save draft</button>
                <button className="btn primary" onClick={publish}>Publish for review</button>
              </>
            ) : (
              <>
                <button className="btn danger" onClick={requestChanges}>Request changes</button>
                <button className="btn primary" onClick={approve}>Approve</button>
              </>
            )}
            <button className="btn danger" onClick={close}>Close</button>
          </div>
        </div>

        {mode === "author"
          ? <Ribbon zoom={zoom} setZoom={setZoom} />
          : <div className="ribbon readonly">
              Read-only review. Select any text to comment on that exact line · hover a highlight to read it · click to open the thread.
            </div>}

        <div className="lockbar">
          Header, footer and headings are editable sections now, same as body text — only
          the template's theme (colors, fonts, layout) is fixed and can't be changed here.
        </div>
      </div>

      {mode === "author" ? (
        <AuthorView
          documentId={doc.id}
          rendition={rendition}
          zoom={zoom}
          content={content}
          setContent={setContent}
          onNotify={notify}
          flushRef={flushRef}
        />
      ) : (
        <ReviewView
          rendition={rendition} zoom={zoom}
          content={content} comments={comments} setComments={setComments}
        />
      )}

      {mode === "author" && (
        <div className="addpage-wrap">
          <button className="addpage" onClick={addPage}>+ Add page</button>
        </div>
      )}

      {toast && <div className={"toast " + (toast.tone || "")}>{toast.m}</div>}
    </EditorRegistryProvider>
  );
}
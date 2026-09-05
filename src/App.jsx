import React, { useRef, useState } from "react";
import UploadPanel from "./components/UploadPanel";
import DocumentList from "./components/DocumentList";
import AuthorView from "./views/AuthorView";
import ReviewView from "./views/ReviewView";
import Viewer from "./views/Viewer";
import { api } from "./lib/api";

/* The backend owns parsing, storage and the draft/submit/review state machine — this
   component just reflects whatever DocumentRecord the API returns. A document is now one
   HTML string (`doc.html`), not a rendition + per-block content map: there is no template,
   no locked regions, no slots — you upload a .docx, edit it as one free-form document (via
   DocumentEditor, powered by reactjs-tiptap-editor), and save/submit/approve it like any
   other file. Comments stay in-memory only for now — there's no comments API yet. */

export default function App() {
  // A tab opened via DocumentList's eye icon carries ?viewId=<id> — render the standalone
  // read-only Viewer instead of the normal editing app entirely.
  const viewId = new URLSearchParams(window.location.search).get("viewId");
  if (viewId) return <Viewer id={viewId} />;
  return <AppInner />;
}

function AppInner() {
  const [doc, setDoc] = useState(null);
  const [html, setHtml] = useState("");
  const [mode, setMode] = useState("author");
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
      setHtml(record.html || "");
      setComments([]);
      setMode("author");
      notify(`Parsed ${record.fileName}.`);
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
      setHtml(record.html || "");
      setComments([]);
      setMode(record.status === "Approved" || record.status === "UnderReview" ? "review" : "author");
      notify(`Opened ${record.fileName}.`);
    } catch (e) {
      notify(e.message || "Could not open that document.", "err");
    } finally {
      setBusy(false);
    }
  };

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

  const close = () => {
    if (!confirm("Close this document? It stays saved on the server — this only clears the screen."))
      return;
    setDoc(null); setHtml(""); setComments([]); setMode("author");
  };

  if (!doc) {
    return (
      <div className="min-h-screen bg-slate-500">
        <UploadPanel onReady={onUploaded} onError={(m) => notify(m, "err")} busy={busy} />
        <DocumentList onOpen={openExisting} onView={viewExisting} />
        {toast && <Toast toast={toast} />}
      </div>
    );
  }

  const openCount = comments.filter((c) => c.status === "OPEN").length;

  return (
    <div className="flex min-h-screen flex-col bg-slate-500">
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex overflow-hidden rounded border border-slate-300">
              <button
                className={`px-3 py-1.5 text-xs font-semibold ${mode === "author" ? "bg-emerald-700 text-white" : "bg-white text-slate-600"}`}
                onClick={() => setMode("author")}
              >
                Author
              </button>
              <button
                className={`px-3 py-1.5 text-xs font-semibold ${mode === "review" ? "bg-emerald-700 text-white" : "bg-white text-slate-600"}`}
                onClick={async () => { await flushRef.current?.(); setMode("review"); }}
              >
                Admin review
              </button>
            </div>
            <span className="text-xs text-slate-500">
              {doc.fileName} · {doc.status}
              {openCount ? ` · ${openCount} open comment${openCount > 1 ? "s" : ""}` : ""}
              {doc.versionNumber ? ` · v${doc.versionNumber}` : ""}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {mode === "author" ? (
              <>
                <button className="rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700" onClick={saveDraft}>
                  Save draft
                </button>
                <button className="rounded bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white" onClick={publish}>
                  Publish for review
                </button>
              </>
            ) : (
              <>
                <button className="rounded border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700" onClick={requestChanges}>
                  Request changes
                </button>
                <button className="rounded bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white" onClick={approve}>
                  Approve
                </button>
              </>
            )}
            <button className="rounded border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700" onClick={close}>
              Close
            </button>
          </div>
        </div>

        {mode === "review" && (
          <div className="bg-emerald-50 px-4 py-1.5 text-xs text-emerald-800">
            Read-only review. Select any text to comment on it · hover a highlight to read it · click to open the thread.
          </div>
        )}
      </div>

      {mode === "author" ? (
        <AuthorView documentId={doc.id} html={html} onChange={setHtml} onNotify={notify} flushRef={flushRef} />
      ) : (
        <ReviewView html={html} comments={comments} setComments={setComments} />
      )}

      {toast && <Toast toast={toast} />}
    </div>
  );
}

function Toast({ toast }) {
  return (
    <div
      className={`fixed bottom-6 left-1/2 z-50 max-w-[520px] -translate-x-1/2 rounded-md px-4 py-2.5 text-sm text-white shadow-lg ${
        toast.tone === "err" ? "bg-rose-800" : "bg-slate-900"
      }`}
    >
      {toast.m}
    </div>
  );
}

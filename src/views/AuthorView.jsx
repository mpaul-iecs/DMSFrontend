import React, { useCallback, useEffect, useRef } from "react";
import DocumentEditor from "../editors/DocumentEditor";
import { api } from "../lib/api";

/* One document, one editor. The editor instance is the source of truth while you type —
   nothing is lifted into React state or serialised on every keystroke (that was the typing
   lag), and there is NO autosave. Draft is written only when the app calls flushRef: the
   "Save draft" button, "Publish", or switching to Admin review. */
export default function AuthorView({ documentId, initialHtml, headerHtml, footerHtml, role, onSaved, onNotify, flushRef }) {
  const editorRef = useRef(null);
  const dirtyRef = useRef(false);

  const flush = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor || editor.isDestroyed) return;
    /* Only the body is edited here; header/footer are sent back unchanged so they persist. */
    const html = editor.getHTML();
    try {
      const updated = await api.saveDraft(documentId, { html });
      dirtyRef.current = false;
      onSaved?.(updated);
      return updated;
    } catch (e) {
      onNotify?.(e.message || "Could not save draft.", "err");
      throw e;
    }
  }, [documentId, onSaved, onNotify]);

  useEffect(() => {
    if (flushRef) flushRef.current = flush;
  }, [flush, flushRef]);

  /* Warn before leaving with unsaved edits — there's no autosave to fall back on now. */
  useEffect(() => {
    const warn = (e) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DocumentEditor
        content={initialHtml}
        headerHtml={headerHtml}
        footerHtml={footerHtml}
        role={role}
        onReady={(editor) => { editorRef.current = editor; }}
        onDirty={() => { dirtyRef.current = true; }}
      />
    </div>
  );
}

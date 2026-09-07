import React, { useCallback, useEffect, useRef } from "react";
import DocumentEditor from "../editors/DocumentEditor";
import { api } from "../lib/api";

/* One document, one editor. The editor instance is the source of truth while you type —
   nothing is lifted into React state or serialised on every keystroke (that was the typing
   lag), and there is NO autosave. Draft is written only when the app calls flushRef: the
   "Save draft" button, "Publish", or switching to Admin review. */
export default function AuthorView({ documentId, initialHtml, headerHtml, footerHtml, bodyCss, role, onSaved, onNotify, flushRef }) {
  const editorRef = useRef(null);
  const dirtyRef = useRef(false);
  const hfRef = useRef({ header: headerHtml, footer: footerHtml }); // admin edits land here

  const flush = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor || editor.isDestroyed) return;
    const html = editor.getHTML();
    try {
      const updated = await api.saveDraft(documentId, {
        html,
        headerHtml: hfRef.current.header,
        footerHtml: hfRef.current.footer,
      });
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
        bodyCss={bodyCss}
        role={role}
        onReady={(editor) => { editorRef.current = editor; }}
        onDirty={() => { dirtyRef.current = true; }}
        onNotify={onNotify}
        onHeaderFooterChange={(kind, html) => {
          hfRef.current = { ...hfRef.current, [kind]: html };
          dirtyRef.current = true;
        }}
      />
    </div>
  );
}

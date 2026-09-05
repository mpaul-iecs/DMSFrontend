import React, { useCallback, useEffect, useRef } from "react";
import DocumentEditor from "../editors/DocumentEditor";
import { api } from "../lib/api";

/* One document, one editor — no template slots. The whole HTML string is held in a ref
   and flushed on a 1.2s idle timer, or immediately when the app calls flushRef (save,
   publish, switching to review): PUT .../draft never cuts a version, only POST .../submit
   does. */
export default function AuthorView({ documentId, html, onChange, onNotify, flushRef }) {
  const buffer = useRef(html || "");
  const timer = useRef(null);

  useEffect(() => {
    buffer.current = html || "";
  }, [documentId]); // eslint-disable-line

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    const value = buffer.current;
    onChange(value);
    try {
      const updated = await api.saveDraft(documentId, value);
      onChange(updated.html);
    } catch (e) {
      onNotify?.(e.message || "Could not save draft.", "err");
      throw e;
    }
  }, [documentId, onChange, onNotify]);

  useEffect(() => {
    if (flushRef) flushRef.current = flush;
  }, [flush, flushRef]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const handleChange = useCallback(
    (next) => {
      buffer.current = next;
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, 1200);
    },
    [flush],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DocumentEditor content={html} onChange={handleChange} />
    </div>
  );
}

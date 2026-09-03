import React, { useCallback, useEffect, useRef } from "react";
import RenditionHost from "../components/RenditionHost";
import TiptapSlot from "../editors/TiptapSlot";
import { api } from "../lib/api";

/* Content is held in a ref and flushed on a 1.2s idle timer, or immediately when the app
   calls flushRef (save, publish, switching to review) — the same draft-vs-version split
   the backend enforces: PUT .../draft never cuts a version, only POST .../submit does
   (master spec §3.4).

   Tiptap only now — Lexical lost the evaluation (§3.1) and the backend stores a single
   content map per document rather than one per engine, so there's nothing for a second
   engine to key off of here anymore. */

export default function AuthorView({
  documentId,
  rendition,
  zoom,
  content,
  setContent,
  onNotify,
  flushRef,
}) {
  const buffer = useRef({ ...content });
  const timer = useRef(null);

  useEffect(() => {
    buffer.current = { ...content };
  }, [documentId]); // eslint-disable-line

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    const map = { ...buffer.current };
    setContent(map);
    try {
      const updated = await api.saveDraft(documentId, map);
      setContent(updated.content);
    } catch (e) {
      onNotify?.(e.message || "Could not save draft.", "err");
      throw e;
    }
  }, [documentId, setContent, onNotify]);

  useEffect(() => {
    if (flushRef) flushRef.current = flush;
  }, [flush, flushRef]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const handleChange = useCallback(
    (key, html) => {
      buffer.current[key] = html;
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, 1200);
    },
    [flush],
  );

  return (
    <RenditionHost
      rendition={rendition}
      zoom={zoom}
      renderSlot={(block) => (
        <TiptapSlot
          key={block.key}
          block={block}
          html={content[block.key] || ""}
          onChange={(html) => handleChange(block.key, html)}
        />
      )}
    />
  );
}
import React, { useEffect, useRef } from "react";

/* Small modal for editing a page header or footer, admin-only. It's a contentEditable
   region (not another full Tiptap instance — the header is a couple of lines) with the
   browser's own Ctrl+B / Ctrl+I / alignment shortcuts. Save hands back innerHTML, which
   the caller feeds to tiptap-pagination-plus's updateHeaderContent/updateFooterContent
   and persists on the next draft save. */
export default function HeaderFooterEditor({ kind, html, onSave, onCancel }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = html || "<p></p>";
      ref.current.focus();
    }
  }, [html]);

  const exec = (cmd, val) => {
    document.execCommand(cmd, false, val);
    ref.current?.focus();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-900/40 p-10"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
          <span className="text-sm font-semibold capitalize text-slate-700">Edit page {kind}</span>
          <button className="rounded px-2 text-slate-500 hover:bg-slate-100" onClick={onCancel}>✕</button>
        </div>

        <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
          <button className="rounded px-2 py-1 font-bold hover:bg-slate-200" onClick={() => exec("bold")}>B</button>
          <button className="rounded px-2 py-1 italic hover:bg-slate-200" onClick={() => exec("italic")}>I</button>
          <button className="rounded px-2 py-1 underline hover:bg-slate-200" onClick={() => exec("underline")}>U</button>
          <span className="mx-1 h-4 w-px bg-slate-300" />
          <button className="rounded px-2 py-1 hover:bg-slate-200" onClick={() => exec("justifyLeft")}>⯇</button>
          <button className="rounded px-2 py-1 hover:bg-slate-200" onClick={() => exec("justifyCenter")}>≡</button>
          <button className="rounded px-2 py-1 hover:bg-slate-200" onClick={() => exec("justifyRight")}>⯈</button>
        </div>

        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          className="tiptap max-h-[40vh] min-h-[120px] overflow-auto p-4 text-sm outline-none"
        />

        <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3">
          <button className="rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="rounded bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white"
            onClick={() => onSave(ref.current?.innerHTML || "")}
          >
            Save {kind}
          </button>
        </div>
      </div>
    </div>
  );
}

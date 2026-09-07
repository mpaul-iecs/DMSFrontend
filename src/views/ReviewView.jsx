import React, { useEffect, useRef, useState } from "react";
import DocumentEditor from "../editors/DocumentEditor";
import { setComments as pushComments } from "../editors/commentHighlight";

/* Read-only review, rendered through the SAME editor as Author (so it looks identical and
   paginates the same way). Comments are ProseMirror positions on the review doc, which
   doesn't change during review, so they stay put. */
export default function ReviewView({ html, headerHtml, footerHtml, comments, setComments }) {
  const editorRef = useRef(null);
  const commentsRef = useRef(comments); // for the DOM click handler, which is bound once
  const [pending, setPending] = useState(null); // { from, to, quote, x, y }
  const [open, setOpen] = useState(null); // { c, x, y }
  const [body, setBody] = useState("");

  // keep the decoration layer + the click-handler's view of the list in sync
  useEffect(() => {
    commentsRef.current = comments;
    pushComments(editorRef.current, comments);
  }, [comments]);

  const onReady = (editor) => {
    editorRef.current = editor;
    if (!editor) return;
    pushComments(editor, comments);

    const dom = editor.view.dom;
    dom.addEventListener("mouseup", () => {
      const { from, to, empty } = editor.state.selection;
      if (empty || to - from < 1) return;
      const rect = editor.view.coordsAtPos(from);
      setPending({
        from,
        to,
        quote: editor.state.doc.textBetween(from, to, " "),
        x: rect.left,
        y: rect.bottom,
      });
      setOpen(null);
    });
    dom.addEventListener("click", (e) => {
      const m = e.target.closest?.("[data-cid]");
      if (!m) return;
      const c = comments.find((x) => x.id === m.dataset.cid);
      if (c) {
        const r = m.getBoundingClientRect();
        setOpen({ c, x: r.left, y: r.bottom });
        setPending(null);
      }
    });
  };

  const add = () => {
    if (!body.trim() || !pending) return;
    setComments([
      ...comments,
      {
        id: "C" + Math.random().toString(36).slice(2, 8),
        from: pending.from,
        to: pending.to,
        quote: pending.quote,
        body,
        author: "Admin",
        at: new Date().toLocaleString(),
        status: "OPEN",
      },
    ]);
    setPending(null);
    setBody("");
    window.getSelection()?.removeAllRanges();
  };

  const resolve = (id) => {
    setComments(comments.map((c) => (c.id === id ? { ...c, status: "RESOLVED" } : c)));
    setOpen(null);
  };

  const popPos = (p) => ({
    left: Math.max(12, Math.min(p.x, window.innerWidth - 302)),
    top: p.y + 8,
  });

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <DocumentEditor
        key={html.length}
        content={html}
        headerHtml={headerHtml}
        footerHtml={footerHtml}
        comments={comments}
        editable={false}
        onReady={onReady}
      />

      {pending && (
        <div className="fixed z-50 w-[290px] rounded-md border border-slate-200 bg-white text-sm shadow-xl" style={popPos(pending)}>
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 font-semibold">
            <span>New comment</span>
            <button className="rounded px-1.5 text-slate-500 hover:bg-slate-100" onClick={() => setPending(null)}>✕</button>
          </div>
          <div className="p-3">
            <div className="italic text-amber-800">“{pending.quote}”</div>
            <textarea autoFocus rows={3} value={body} placeholder="Change this to 5 working days."
              onChange={(e) => setBody(e.target.value)}
              className="mt-2 w-full rounded border border-slate-300 p-1.5 text-sm" />
            <div className="mt-2 flex justify-end gap-1.5">
              <button className="rounded border border-slate-300 px-3 py-1 text-xs font-semibold" onClick={() => setPending(null)}>Cancel</button>
              <button className="rounded bg-emerald-700 px-3 py-1 text-xs font-semibold text-white" onClick={add}>Comment</button>
            </div>
          </div>
        </div>
      )}

      {open && (
        <div className="fixed z-50 w-[290px] rounded-md border border-slate-200 bg-white text-sm shadow-xl" style={popPos(open)}>
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 font-semibold">
            <span>{open.c.author}</span>
            <button className="rounded px-1.5 text-slate-500 hover:bg-slate-100" onClick={() => setOpen(null)}>✕</button>
          </div>
          <div className="p-3">
            <div className="italic text-amber-800">“{open.c.quote}”</div>
            <div className="mt-1.5">{open.c.body}</div>
            <div className="mt-1 font-mono text-[10px] text-slate-400">{open.c.at} · {open.c.status.toLowerCase()}</div>
            {open.c.status === "OPEN" && (
              <button className="mt-2 w-full rounded border border-slate-300 py-1 text-xs font-semibold" onClick={() => resolve(open.c.id)}>
                Mark resolved
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

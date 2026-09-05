import React, { useEffect, useRef, useState } from "react";

/* Read-only review of the whole document. Comments anchor to PLAIN-TEXT OFFSETS into the
   rendered HTML — never DOM paths, which move whenever formatting changes. In production
   this becomes a decoration plugin on the Tiptap doc; the stored anchor shape (start/end
   text offset) is identical either way. */

const locate = (root, offset) => {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let acc = 0, n;
  while ((n = w.nextNode())) {
    const len = n.textContent.length;
    if (acc + len >= offset) return { node: n, off: offset - acc };
    acc += len;
  }
  return null;
};

const offsetOf = (root, node, off) => {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let acc = 0, n;
  while ((n = w.nextNode())) {
    if (n === node) return acc + off;
    acc += n.textContent.length;
  }
  return null;
};

export default function ReviewView({ html, comments, setComments }) {
  const ref = useRef(null);
  const [pending, setPending] = useState(null);
  const [open, setOpen] = useState(null);
  const [tip, setTip] = useState(null);
  const [body, setBody] = useState("");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = html || '<p style="color:#a9b2bf">— nothing written yet —</p>';
    [...comments]
      .sort((a, b) => b.start - a.start)
      .forEach((c) => {
        const s = locate(el, c.start), e = locate(el, c.end);
        if (!s || !e) return;
        try {
          const r = document.createRange();
          r.setStart(s.node, s.off);
          r.setEnd(e.node, e.off);
          const mark = document.createElement("mark");
          mark.className = "cm" + (c.status === "RESOLVED" ? " resolved" : "");
          mark.dataset.cid = c.id;
          mark.appendChild(r.extractContents());
          r.insertNode(mark);
        } catch {
          /* offsets no longer resolvable → the real system re-anchors fuzzily here */
        }
      });
  }, [html, comments]);

  const onMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const el = ref.current;
    if (!el.contains(sel.anchorNode) || !el.contains(sel.focusNode)) return;
    const a = offsetOf(el, sel.anchorNode, sel.anchorOffset);
    const b = offsetOf(el, sel.focusNode, sel.focusOffset);
    if (a == null || b == null || a === b) return;
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    setPending({ start: Math.min(a, b), end: Math.max(a, b), quote: sel.toString(), rect });
    setOpen(null);
  };

  const add = () => {
    if (!body.trim()) return;
    setComments([
      ...comments,
      {
        id: "C" + Math.random().toString(36).slice(2, 8),
        start: pending.start,
        end: pending.end,
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

  const pos = (rect) => ({
    left: Math.max(12, Math.min(rect.left, window.innerWidth - 302)),
    top: rect.bottom + 8,
  });

  return (
    <div className="flex-1 overflow-auto bg-slate-500 py-10">
      <div className="dms-page">
        <div
          ref={ref}
          className="tiptap"
          onMouseUp={onMouseUp}
          onClick={(e) => {
            const m = e.target.closest?.("mark[data-cid]");
            if (!m) return;
            const c = comments.find((x) => x.id === m.dataset.cid);
            if (c) { setOpen({ c, rect: m.getBoundingClientRect() }); setPending(null); setTip(null); }
          }}
          onMouseOver={(e) => {
            const m = e.target.closest?.("mark[data-cid]");
            if (!m) return setTip(null);
            const c = comments.find((x) => x.id === m.dataset.cid);
            if (c) { const r = m.getBoundingClientRect(); setTip({ c, left: r.left, top: r.top - 46 }); }
          }}
          onMouseLeave={() => setTip(null)}
        />
      </div>

      {tip && !open && (
        <div className="fixed z-50 max-w-[280px] rounded bg-slate-900 px-3 py-2 text-xs text-white"
          style={{ left: tip.left, top: tip.top }}>
          <b>{tip.c.author}</b><br />{tip.c.body}
        </div>
      )}

      {pending && (
        <div className="fixed z-50 w-[290px] rounded-md border border-slate-200 bg-white text-sm shadow-xl"
          style={pos(pending.rect)}>
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 font-semibold">
            <span>New comment</span>
            <button className="rounded px-1.5 text-slate-500 hover:bg-slate-100" onClick={() => setPending(null)}>✕</button>
          </div>
          <div className="p-3">
            <div className="italic text-amber-800">“{pending.quote}”</div>
            <div className="mt-1 font-mono text-[10px] text-slate-400">[{pending.start}–{pending.end}]</div>
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
        <div className="fixed z-50 w-[290px] rounded-md border border-slate-200 bg-white text-sm shadow-xl" style={pos(open.rect)}>
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

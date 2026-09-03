import React, { useEffect, useRef, useState } from "react";
import RenditionHost from "../components/RenditionHost";

/* Read-only, engine-agnostic. Both editors serialise to HTML, so the reviewer
   renders that HTML and anchors comments to PLAIN-TEXT OFFSETS inside a block —
   never to DOM paths, which move whenever formatting changes.

   In production this becomes a decoration plugin (ProseMirror) or a decorator
   node (Lexical); the stored anchor shape is identical either way. */

const locate = (root, offset) => {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let acc = 0,
    n;
  while ((n = w.nextNode())) {
    const len = n.textContent.length;
    if (acc + len >= offset) return { node: n, off: offset - acc };
    acc += len;
  }
  return null;
};

const offsetOf = (root, node, off) => {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let acc = 0,
    n;
  while ((n = w.nextNode())) {
    if (n === node) return acc + off;
    acc += n.textContent.length;
  }
  return null;
};

export default function ReviewView({
  rendition,
  zoom,
  content,
  comments,
  setComments,
}) {
  return (
    <RenditionHost
      rendition={rendition}
      zoom={zoom}
      renderSlot={(block) => (
        <ReviewSlot
          key={block.key}
          block={block}
          html={content[block.key] || ""}
          comments={comments}
          setComments={setComments}
        />
      )}
    />
  );
}

function ReviewSlot({ block, html, comments, setComments }) {
  const ref = useRef(null);
  const [pending, setPending] = useState(null);
  const [open, setOpen] = useState(null);
  const [tip, setTip] = useState(null);
  const [body, setBody] = useState("");

  const mine = comments.filter((c) => c.blockKey === block.key);

  /* re-render content from source, then re-apply every highlight from offsets */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML =
      html ||
      '<p style="color:#a9b2bf">— nothing written in this section —</p>';
    [...mine]
      .sort((a, b) => b.start - a.start)
      .forEach((c) => {
        const s = locate(el, c.start),
          e = locate(el, c.end);
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
  }, [html, comments]); // eslint-disable-line

  const onMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const el = ref.current;
    if (!el.contains(sel.anchorNode) || !el.contains(sel.focusNode)) return;
    const a = offsetOf(el, sel.anchorNode, sel.anchorOffset);
    const b = offsetOf(el, sel.focusNode, sel.focusOffset);
    if (a == null || b == null || a === b) return;
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    setPending({
      start: Math.min(a, b),
      end: Math.max(a, b),
      quote: sel.toString(),
      rect,
    });
    setOpen(null);
  };

  const add = () => {
    if (!body.trim()) return;
    setComments([
      ...comments,
      {
        id: "C" + Math.random().toString(36).slice(2, 8),
        blockKey: block.key,
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
    setComments(
      comments.map((c) => (c.id === id ? { ...c, status: "RESOLVED" } : c)),
    );
    setOpen(null);
  };

  const pos = (rect) => ({
    left: Math.max(12, Math.min(rect.left, window.innerWidth - 302)),
    top: rect.bottom + 8,
  });

  return (
    <>
      <span className="slot-tag review">
        review · {block.key}
        {mine.length
          ? ` · ${mine.length} comment${mine.length > 1 ? "s" : ""}`
          : ""}
      </span>
      <div
        ref={ref}
        className="review-region"
        onMouseUp={onMouseUp}
        onClick={(e) => {
          const m = e.target.closest?.("mark[data-cid]");
          if (!m) return;
          const c = comments.find((x) => x.id === m.dataset.cid);
          if (c) {
            setOpen({ c, rect: m.getBoundingClientRect() });
            setPending(null);
            setTip(null);
          }
        }}
        onMouseOver={(e) => {
          const m = e.target.closest?.("mark[data-cid]");
          if (!m) return setTip(null);
          const c = comments.find((x) => x.id === m.dataset.cid);
          if (c) {
            const r = m.getBoundingClientRect();
            setTip({ c, left: r.left, top: r.top - 46 });
          }
        }}
        onMouseLeave={() => setTip(null)}
      />

      {tip && !open && (
        <div className="tip" style={{ left: tip.left, top: tip.top }}>
          <b>{tip.c.author}</b>
          <br />
          {tip.c.body}
        </div>
      )}

      {pending && (
        <div className="pop new" style={pos(pending.rect)}>
          <div className="head">
            <span>New comment</span>
            <button
              className="btn"
              style={{ padding: "1px 6px" }}
              onClick={() => setPending(null)}
            >
              ✕
            </button>
          </div>
          <div className="body">
            <div className="quote">“{pending.quote}”</div>
            <div className="anchor">
              {block.key} [{pending.start}–{pending.end}]
            </div>
            <textarea
              autoFocus
              rows={3}
              value={body}
              placeholder="Change this to 5 working days."
              onChange={(e) => setBody(e.target.value)}
              style={{ marginTop: 8 }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 6,
                marginTop: 8,
              }}
            >
              <button className="btn" onClick={() => setPending(null)}>
                Cancel
              </button>
              <button className="btn primary" onClick={add}>
                Comment
              </button>
            </div>
          </div>
        </div>
      )}

      {open && (
        <div className="pop" style={pos(open.rect)}>
          <div className="head">
            <span>{open.c.author}</span>
            <button
              className="btn"
              style={{ padding: "1px 6px" }}
              onClick={() => setOpen(null)}
            >
              ✕
            </button>
          </div>
          <div className="body">
            <div className="quote">“{open.c.quote}”</div>
            <div style={{ marginTop: 6 }}>{open.c.body}</div>
            <div className="anchor">
              {open.c.at} · {open.c.blockKey} · {open.c.status.toLowerCase()}
            </div>
            {open.c.status === "OPEN" && (
              <button
                className="btn"
                style={{ width: "100%", marginTop: 8 }}
                onClick={() => resolve(open.c.id)}
              >
                Mark resolved
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

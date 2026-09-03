import React, { useEffect, useRef, useState } from "react";

/* Word-style outer resize handles.

   Tiptap's built-in columnResizing only gives you the dividers BETWEEN columns — it
   cannot change the table's overall size. This overlay adds the three handles Word has:
   right edge (width), bottom edge (height), bottom-right corner (both).

   It is engine-agnostic: it finds the selected <table> through the DOM selection, measures
   it, and hands absolute target widths/heights back to whichever adapter is active. */

export function useSelectedTable(regionRef, deps = []) {
  const [box, setBox] = useState(null);

  useEffect(() => {
    const read = () => {
      const region = regionRef.current;
      if (!region) return setBox(null);

      const sel = document.getSelection();
      let node = sel?.anchorNode;
      if (!node || !region.contains(node)) return setBox(null);
      if (node.nodeType === 3) node = node.parentElement;

      const table = node.closest?.("table");
      if (!table || !region.contains(table)) return setBox(null);

      /* The page is CSS-scaled for zoom, so rects come back scaled. Recover the factor
         by comparing the measured rect with the untransformed offsetWidth. */
      const tRect = table.getBoundingClientRect();
      const rRect = region.getBoundingClientRect();
      const scale = table.offsetWidth ? tRect.width / table.offsetWidth : 1;

      setBox({
        table,
        scale: scale || 1,
        left: (tRect.left - rRect.left) / (scale || 1),
        top: (tRect.top - rRect.top) / (scale || 1),
        width: table.offsetWidth,
        height: table.offsetHeight,
      });
    };

    read();
    document.addEventListener("selectionchange", read);
    const id = setInterval(read, 400);           // catches content reflow after edits
    return () => { document.removeEventListener("selectionchange", read); clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return box;
}

export default function TableResizer({ box, onResize }) {
  const drag = useRef(null);
  const frame = useRef(0);

  useEffect(() => {
    const onMove = (e) => {
      const d = drag.current;
      if (!d) return;
      e.preventDefault();
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        const dx = (e.clientX - d.x0) / d.scale;
        const dy = (e.clientY - d.y0) / d.scale;

        const fw = d.axis === "y" ? 1 : Math.max(0.2, (d.w0 + dx) / d.w0);
        const fh = d.axis === "x" ? 1 : Math.max(0.2, (d.h0 + dy) / d.h0);

        onResize({
          widths: d.axis === "y" ? null : d.cols.map((w) => Math.max(36, Math.round(w * fw))),
          heights: d.axis === "x" ? null : d.rows.map((h) => Math.max(20, Math.round(h * fh))),
        });
      });
    };

    const onUp = () => {
      if (!drag.current) return;
      drag.current = null;
      document.body.classList.remove("resizing-table");
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      cancelAnimationFrame(frame.current);
    };
  }, [onResize]);

  if (!box) return null;

  const start = (axis) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    const t = box.table;
    const firstRow = t.rows[0];
    drag.current = {
      axis,
      x0: e.clientX, y0: e.clientY,
      w0: t.offsetWidth, h0: t.offsetHeight,
      scale: box.scale,
      cols: Array.from(firstRow?.cells || []).map((c) => c.offsetWidth),
      rows: Array.from(t.rows).map((r) => r.offsetHeight),
    };
    document.body.classList.add("resizing-table");
  };

  const s = { left: box.left, top: box.top, width: box.width, height: box.height };

  return (
    <div className="tbl-resize" style={s}>
      <span className="tbl-frame" />
      <span className="tbl-h right" onMouseDown={start("x")} title="Drag to set table width" />
      <span className="tbl-h bottom" onMouseDown={start("y")} title="Drag to set table height" />
      <span className="tbl-h corner" onMouseDown={start("xy")} title="Drag to resize the table" />
    </div>
  );
}
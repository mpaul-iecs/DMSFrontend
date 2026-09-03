import React, { useRef } from "react";
import { NodeViewWrapper } from "@tiptap/react";

/* Image node view with a Word-style corner drag handle. The WRAPPER carries the width
   (percent of the containing block) and the <img> just fills it — that keeps the handle
   glued to the image's real corner at any size, and stops a percent width from blowing
   the wrapper out to full width. Handle shows only while the node is selected. */
export default function ImageNV({ node, updateAttributes, selected }) {
  const wrapRef = useRef(null);
  const hasWidth = !!node.attrs.width;

  const startResize = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const wrap = wrapRef.current;
    const box = wrap?.parentElement;
    if (!wrap || !box) return;
    const startX = e.clientX;
    const startW = wrap.offsetWidth;
    const parentW = box.offsetWidth || startW;

    const onMove = (ev) => {
      const next = Math.max(40, startW + (ev.clientX - startX));
      const pct = Math.max(5, Math.min(100, Math.round((next / parentW) * 100)));
      updateAttributes({ width: pct + "%" });
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  return (
    <NodeViewWrapper
      ref={wrapRef}
      className={"img-nv" + (selected ? " sel" : "")}
      style={{ width: node.attrs.width || "fit-content" }}
    >
      <img
        src={node.attrs.src}
        alt={node.attrs.alt || ""}
        title={node.attrs.title || ""}
        style={{ width: hasWidth ? "100%" : undefined }}
        draggable={false}
      />
      <span className="nv-drag" data-drag-handle contentEditable={false} title="Drag to move">⠿</span>
      <span className="img-grip" contentEditable={false} onMouseDown={startResize} />
    </NodeViewWrapper>
  );
}

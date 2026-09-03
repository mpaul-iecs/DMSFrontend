import React, { useRef } from "react";
import { NodeViewWrapper } from "@tiptap/react";

/* Image node view with a Word-style corner drag handle. Width is stored as a percent of
   the containing block so it survives a zoom change and never overflows the page. The
   handle only shows while the node is selected (click the image once). */
export default function ImageNV({ node, updateAttributes, selected }) {
  const imgRef = useRef(null);

  const startResize = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const img = imgRef.current;
    if (!img) return;
    const startX = e.clientX;
    const startW = img.offsetWidth;
    const box = img.closest(".img-nv")?.parentElement;
    const parentW = box?.offsetWidth || startW;

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
    <NodeViewWrapper className={"img-nv" + (selected ? " sel" : "")}>
      <img
        ref={imgRef}
        src={node.attrs.src}
        alt={node.attrs.alt || ""}
        title={node.attrs.title || ""}
        style={{ width: node.attrs.width || undefined }}
        draggable={false}
      />
      <span className="img-grip" contentEditable={false} onMouseDown={startResize} />
    </NodeViewWrapper>
  );
}

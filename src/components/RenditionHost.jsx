import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/* Injects the stored rendition (page chrome + locked content), finds every
   [data-block-key] slot, and portals `renderSlot(block)` into it. The surrounding
   HTML is never re-rendered by React — that is the point: the template is inert.

   Zoom is applied as a scale transform on a wrapper sized to the page's NATURAL
   width, so Letter, A4 and landscape templates all stay centred and aligned instead
   of drifting when the scale changes.

   A block's key can now appear more than once in the DOM — e.g. a docx header/footer
   block is reused verbatim on every "added" page (see the backend's AddPage endpoint),
   so the SAME blockKey shows up in two different slot elements. That's fine for
   renderSlot (each portal still gets the right block), but createPortal's own React
   key has to be unique per DOM node, not per blockKey — otherwise React warns about
   duplicate keys across the portal list. portalKey below disambiguates by DOM order. */

export default function RenditionHost({ rendition, zoom = "fit", renderSlot }) {
  const boxRef = useRef(null);      // scroll container, gives us the available width
  const hostRef = useRef(null);     // the rendition itself, measured pre-transform
  const [slots, setSlots] = useState([]);
  const [nat, setNat] = useState({ w: 816, h: 1056 });
  const [avail, setAvail] = useState(1000);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.innerHTML = rendition.html;

    const found = [];
    host.querySelectorAll("[data-block-key]").forEach((el, idx) => {
      el.classList.add("slot");
      const block = rendition.blocks.find((b) => b.key === el.dataset.blockKey);
      if (block) found.push({ block, el, portalKey: `${block.key}__${idx}` });
    });
    setSlots(found);

    const page = host.querySelector("section.docx, .pdf-page");
    setNat({
      w: page?.offsetWidth || host.offsetWidth || 816,
      h: host.offsetHeight || 1056,
    });
  }, [rendition.html, rendition.blocks]);

  /* content grows as the author types, and the container changes with the window */
  useEffect(() => {
    const host = hostRef.current, box = boxRef.current;
    if (!host || !box) return;
    const ro = new ResizeObserver(() => {
      const page = host.querySelector("section.docx, .pdf-page");
      setNat({ w: page?.offsetWidth || host.offsetWidth || 816, h: host.offsetHeight || 1056 });
      setAvail(box.clientWidth);
    });
    ro.observe(host);
    ro.observe(box);
    setAvail(box.clientWidth);
    return () => ro.disconnect();
  }, [rendition.html]);

  const scale = zoom === "fit"
    ? Math.min(1.4, Math.max(0.25, (avail - 72) / nat.w))
    : Number(zoom);

  return (
    <div className="canvas" ref={boxRef}>
      <style dangerouslySetInnerHTML={{ __html: stripScripts(rendition.css) }} />
      <div className="zoomwrap" style={{ width: nat.w * scale, height: nat.h * scale }}>
        <div
          ref={hostRef}
          className="rendition"
          style={{ width: nat.w, transform: `scale(${scale})`, transformOrigin: "top left" }}
        />
      </div>
      {slots.map(({ block, el, portalKey }) => createPortal(renderSlot(block), el, portalKey))}
    </div>
  );
}

/* The file is untrusted input even in a prototype. In the real system this is a
   server-side allow-list sanitiser (Ganss.Xss); here it is a blunt guard. */
function stripScripts(css = "") {
  return css.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/@import[^;]+;/gi, "");
}
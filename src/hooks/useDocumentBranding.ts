import { useEffect } from "react";

/**
 * Sets the browser tab / popup-window title and favicon while the calling page is mounted, and
 * restores both on unmount. Used by the full-page editor popup so its window reads "DMS EDITOR"
 * with the app logo instead of the app's default title/icon.
 */
export default function useDocumentBranding(title: string, iconHref: string) {
  useEffect(() => {
    const previousTitle = document.title;
    let link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    const created = !link;
    const previous = link ? { href: link.href, type: link.type } : null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.type = "image/png";
    link.href = iconHref;
    document.title = title;

    return () => {
      document.title = previousTitle;
      if (created) link.remove();
      else if (previous) {
        link.href = previous.href;
        link.type = previous.type;
      }
    };
  }, [title, iconHref]);
}

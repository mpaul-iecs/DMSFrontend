import { useEffect, type RefObject } from "react";

export default function useClickOutside(ref: RefObject<HTMLElement | null>, onOutsideClick: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutsideClick();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onOutsideClick]);
}

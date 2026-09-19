import { useCallback, useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
}
const getSnapshot = () => !!document.fullscreenElement;
const getServerSnapshot = () => false;

/**
 * Toggle the whole app between normal and browser full-screen ("expand").
 *
 * `isFullscreen` is read from the browser (`document.fullscreenElement`) via
 * `fullscreenchange`, NOT kept as local state — the browser itself exits full screen on Esc
 * (that can't be intercepted or disabled by a page), so a local flag would go stale the moment
 * the user presses it. Listening to the event keeps the button's icon/tooltip correct for every
 * way of leaving full screen. `isSupported` is false where the API is missing/disabled (e.g.
 * iPhone Safari), so callers can hide the control.
 */
export default function useFullscreen() {
  const isFullscreen = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isSupported = typeof document !== "undefined" && document.fullscreenEnabled;

  const toggle = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      // Denied (no user gesture / blocked by policy) — nothing useful to show; state stays as is.
    }
  }, []);

  return { isFullscreen, isSupported, toggle };
}

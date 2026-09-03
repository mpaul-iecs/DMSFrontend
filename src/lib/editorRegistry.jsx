import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";

/* One shared ribbon has to drive whichever editor was last focused, in either engine.
   Each slot registers a small command adapter here on focus; the ribbon calls it.

   Editor instances are deliberately NOT put in app state — they are not serialisable.
   In the real app this is a plain Map in context, exactly like this. */

const Ctx = createContext(null);

export function EditorRegistryProvider({ children }) {
  const [active, setActive] = useState(null); // { key, engine, api }

  const register = useCallback((entry) => setActive(entry), []);
  /* A slot unmounting must only wipe the registry if IT was the active one — otherwise
     tearing down any background slot (StrictMode double-mount, RenditionHost rebuilding
     its portal targets) would deaden the ribbon for the slot the user is actually in.
     Called with no key it still force-clears (e.g. closing the document). */
  const clear = useCallback(
    (key) => setActive((cur) => (key == null || cur?.key === key ? null : cur)),
    [],
  );

  const value = useMemo(
    () => ({ active, register, clear }),
    [active, register, clear],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useEditorRegistry = () => useContext(Ctx);

/* The ribbon keeps driving the LAST focused editor even after focus moves to a
   toolbar control, so every command re-focuses first. */
export function useActiveApi() {
  const reg = useContext(Ctx);
  return reg?.active?.api ?? null;
}

import axios from "axios";
import debounce from "lodash/debounce";
import api from "./axiosInstance";
import endpoints from "../utilities/endpoint";
import type { BaseResponse } from "../types/auth";
import type { Role } from "../types/role";

const SEARCH_DEBOUNCE_MS = 350;

// Plain module state, not a React ref/useState — searchRoles is called from
// AsyncSelect's loadOptions in any component that needs a role picker, so the
// cache and in-flight request naturally live at the service level, not per-component.
let rolesCache: Role[] | null = null;
let activeSearchAbort: AbortController | null = null;

// GET /roles has no server-side search param, so the network call only ever
// happens once (cached above); after that every keystroke just re-filters in
// memory. Still debounced + cancellable, production-grade, for two reasons:
// (1) it protects the very first search — typing fast before the cache is
// populated could otherwise fire several concurrent /roles requests, and this
// cancels every stale one so only the latest wins; (2) it's forward-compatible
// — if /roles ever gains a real ?search= param, this already debounces/cancels
// correctly with zero changes to any caller.
const debouncedRoleFetch = debounce(
  (inputValue: string, resolve: (roles: Role[]) => void, signal: AbortSignal) => {
    (async () => {
      try {
        if (!rolesCache) {
          const res = await api.get<BaseResponse<Role[]>>(endpoints.roles.base, { signal });
          rolesCache = res.data.responseData ?? [];
        }
        const needle = inputValue.trim().toLowerCase();
        resolve(needle ? rolesCache.filter((r) => r.name.toLowerCase().includes(needle)) : rolesCache);
      } catch (err) {
        // A superseded request was aborted by a newer keystroke — leave this
        // promise unresolved; the caller (react-select) only cares about the
        // most recent call's result.
        if (axios.isCancel(err)) return;
        resolve([]);
      }
    })();
  },
  SEARCH_DEBOUNCE_MS,
);

/** All raw HTTP calls for the role domain live here — thunks/components only orchestrate them. */
const roleService = {
  getAll: (signal?: AbortSignal) => api.get<BaseResponse<Role[]>>(endpoints.roles.base, { signal }),

  getById: (idRole: number) => api.get<BaseResponse<Role>>(endpoints.roles.byId(idRole)),

  /** Debounced, cancellable, cached role search — feed straight into AsyncSelect's loadOptions. */
  searchRoles: (inputValue: string): Promise<Role[]> =>
    new Promise((resolve) => {
      activeSearchAbort?.abort();
      const controller = new AbortController();
      activeSearchAbort = controller;
      debouncedRoleFetch(inputValue, resolve, controller.signal);
    }),
};

export default roleService;

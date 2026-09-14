# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

InnerEye DMS — Document Management System frontend. React 18 + TypeScript, built with Vite, styled with Tailwind CSS v4. Talks to an ASP.NET Core backend (`InnerEye.DMS.Api`) whose DTOs are mirrored 1:1 in `src/types/`.

## Commands

```bash
npm run dev         # start Vite dev server
npm run build        # tsc -b (project references build) && vite build — the real type-check gate
npm run typecheck     # tsc -b --noEmit — must be run this way, see note below
npm run lint          # eslint .
npm run preview        # preview a production build
```

There is no test runner configured in this project yet.

**`typecheck` must stay `tsc -b --noEmit`, not `tsc --noEmit`.** The root `tsconfig.json` has no `include`, only `references` to `tsconfig.app.json`/`tsconfig.node.json` — plain `tsc --noEmit` against it silently checks nothing and always exits 0. Only the `-b` (project references build) form actually type-checks the referenced projects.

Always run `npm run typecheck`, `npm run lint`, and `npm run build` after non-trivial changes — `build` catches some project-reference-mode errors that `typecheck` alone can (rarely) miss.

## Architecture

### Auth flow (session-scoped, no register/forgot-password)

This app has a single entry point — login — no self-registration or password reset. Auth is intentionally **not** "stay signed in forever": the backend issues an httpOnly refresh-token cookie with no `Expires`/`Max-Age` (a true session cookie, dropped when the browser closes), so the frontend mirrors that:

- `src/store/store.ts` persists only the `auth` slice, and does so to **`sessionStorage`**, not `localStorage` — this is deliberate, matching the backend's session-only cookie. Don't switch it to `localStorage`.
- `persistConfig` in `store.ts` is explicitly typed as `PersistConfig<RootReducerState>`. Don't remove that annotation — without it, `persistReducer`'s generic can't be inferred from the hand-rolled `sessionStorage` object (see above) and silently collapses to `{}`, which breaks `RootState` app-wide (`useAppSelector` errors with "Property 'auth'/'menu' does not exist on type 'PersistPartial'" on every page, since the persisted reducer's state type becomes just `PersistPartial` with no actual fields).
- The session storage engine is hand-rolled in `store.ts` instead of imported from `redux-persist/lib/storage/session`. That subpath is CJS and Vite's dev bundler doesn't always interop it correctly (`storage.setItem` ends up `undefined` at runtime) — see the comment in that file before changing it back.
- On app boot (`App.tsx`), if redux says `isAuthenticated` but there's no in-memory access token (a page reload), it silently calls `initAuthThunk` to rotate the httpOnly refresh cookie into a fresh access token. If the cookie is gone (browser was closed), this fails and the user lands back on `/login`.
- The access token itself lives only in memory (`services/axiosInstance.ts` module state via `setAccessToken`/`getAccessToken`), never persisted — only the refresh cookie (server-side, httpOnly) and the `isAuthenticated`/`user` flags (sessionStorage) survive a reload.
- `axiosInstance.ts` has a standard single-flight refresh-on-401 interceptor: concurrent requests that 401 queue behind one in-flight refresh call rather than each firing their own.

**Service/thunk split**: raw HTTP calls belong in `src/services/*Service.ts` (e.g. `authService.ts`). Redux thunks in `src/store/*/  *Thunks.ts` only orchestrate — call the service, manage the access token, dispatch. Don't put `axios` calls directly in thunks or components.

### Backend contract mirroring

`src/types/auth.ts` mirrors the backend's C# DTOs field-for-field (`LoginRequest` ↔ `LoginRequestDto`, `CurrentUser` ↔ `CurrentUserDto`, `BaseResponse<T>` ↔ `BaseResponseDto<T>`, etc. — see the doc comment on each interface for the exact backend type it mirrors). The backend uses `System.Text.Json` default camelCasing, so response envelopes are `{ error, message, statusCode, errorCode?, responseData? }`. When backend DTOs change, update the corresponding interface here rather than loosening types.

The `Auth` login response only carries `accessToken`, `empNo`, `userName`, `roles` — no `permissions`. Full profile (`roles` + `permissions` + `tenantId`) requires a follow-up `GET /auth/me` call, which `authThunks.ts` does automatically after both login and refresh.

Endpoints live in one place: `src/utilities/endpoint.ts`, built off `VITE_API_BASE_URL` (see `.env`). Path segments match the backend's PascalCase controller route (`/Auth/...`, `/Menus/...`) — the ASP.NET route template is `api/v{version}/dms/[controller]`, so segment casing follows the C# controller name exactly, not lowercase REST convention.

### Dynamic menu & permissions

The sidebar is not hardcoded — `Sidebar.tsx` fetches `GET /menus/me` (`fetchMyMenuThunk`, `store/menu/`) on mount and renders whatever tree comes back: Module (section heading) → MainMenu (collapsible group) → SubMenu (the actual `NavLink`, using its own `url`). `MainMenu` itself carries no `url` in the DTO — it's never a link, only an expand/collapse header. The currently-active route's group auto-expands; this is computed with `useMemo` off `location.pathname`, not synced into state via a `useEffect` (avoid re-introducing that — it was flagged by `react-hooks/set-state-in-effect` and reverted to the derived-value approach).

Menu/submenu icons are backend-driven strings (`menuIcon`/`subMenuIcon`) expected to match a `lucide-react` export name exactly (e.g. `"LayoutDashboard"`) — resolved via `utilities/icon.ts#resolveIcon`, which falls back to a plain dot icon for an unrecognized name rather than throwing.

`MenusController` is currently anonymous on the backend with hardcoded dummy `empNo`/`tenantId` — no bearer token or `X-Tenant-Id` header is sent yet. When it becomes `[Authorize]`'d and tenant-scoped (see the backend's `TenantValidationMiddleware`, which 401s if a caller's `X-Tenant-Id` header disagrees with their JWT's `tenantId` claim), add the header in `services/menuService.ts` — `axiosInstance.ts` already attaches the bearer token to every request, so only the tenant header needs wiring at that point, sourced from `state.auth.user.tenantId`.

The Settings page's "Assign Menu Permission" card calls `POST /menus/permissions` (`assignMenuPermissionThunk`) using a flat menu list from `GET /menus/permissions/me` (`Select`) and the role list from `GET /roles` (`AsyncSelect`, see below) to populate its two pickers. The `menu` redux slice (`modules`, `permissions`) is deliberately **not** persisted (not in `store.ts`'s `whitelist`) — it refetches fresh every session, unlike `auth`.

`GET /roles` (`services/roleService.ts`, `types/role.ts`) has no server-side search param, so the role `AsyncSelect` in `SettingsPage.tsx` fetches the full list once (cached in a `useRef`, not redux — it's only needed on this one page) and filters client-side per keystroke in `loadOptions`. If the backend ever adds a `?search=` query param, switch that to a real server-side call instead of the full-fetch-then-filter.

The assign-permission form binds `react-select`'s option objects (`{ value, label }`) directly as `react-hook-form` field values via `Controller` (not the raw `idRole`/`idMenu` numbers) — the numeric IDs are only extracted from `field.value.value` at submit time, right before building the `AssignMenuPermissionRequest` payload. This sidesteps fighting yup's typings for nested option-object schemas; the form uses `Controller`'s own `rules={{ required }}` instead of a yup resolver.

### Routing

`src/routes/AppRoutes.tsx` uses React Router's **data router** API (`createBrowserRouter` + a `RouteObject[]` tree), not the `<Routes>`/`<Route>` JSX form — consumed in `App.tsx` via `<RouterProvider router={router} />`. `ProtectedRoute` / `PublicOnlyRoute` are plain wrapper components (not route-level loaders) that redirect based on `useAuth()`'s `isAuthenticated`.

Note: `<ProtectedRoute>` around the authenticated `AppLayout` branch has at times been left commented out mid-development (to test pages without needing a live login). If `typecheck`/`build` fail on an unused `ProtectedRoute` import in this file, check whether it's commented out before assuming it's a new regression — confirm with the user whether to restore the guard or just drop the unused import.

### Styling: Tailwind v4 CSS-first config

There is no `tailwind.config.js` — theme customization lives in `src/index.css` via `@theme { }`. Two cascade-layer gotchas already bit this project once each; don't reintroduce them:

1. **Custom theme colors (`--color-primary-*`, `--color-danger-*`, etc.) must be declared inside `@theme { }`, not a plain `:root { }` block.** Tailwind v4 only generates utility classes (`bg-primary-500`, `text-danger-600`, ...) for variables declared inside `@theme`. A plain `:root` block just defines a CSS variable with no corresponding utility.
2. **Any custom global CSS (resets, focus rings, etc.) must be wrapped in `@layer base { }`.** Tailwind's own utilities live in `@layer utilities`. Cascade layers mean *unlayered* CSS always beats *any* layered CSS regardless of selector specificity — an unlayered `* { padding: 0 }` will silently zero out every `px-*`/`py-*` utility in the app no matter how specific the utility's selector is.

Runtime theme switching (4 color presets — ocean/teal/indigo/slate) works by overwriting the `--color-*` CSS variables via `documentElement.style.setProperty` in `src/utilities/theme.ts` — Tailwind utilities reference these variables under the hood, so swapping the variable value re-themes every utility without regenerating any CSS.

### i18n

`react-i18next`, initialized in `src/i18n/index.ts`, resources in `src/i18n/locals/{en,hi}.json` (note: `locals`, not `locales`). Language preference persists to `sessionStorage` (key `innereye-lang`), consistent with the session-scoped auth model above. Only add translation keys that are actually referenced in code — this project has had dead keys from an earlier "Vendor Management System" scaffold pruned before; don't reintroduce speculative keys for unbuilt features.

### Toasts

`src/utilities/toast.ts` wraps `react-toastify` — call `toast.success(...)`, `toast.error(...)`, `toast.warning(...)`, `toast.info(...)` from anywhere rather than importing `react-toastify` directly. `TOAST_CONTAINER_CONFIG` in that file is the single place to change position/timing/theme; it's spread onto `<ToastContainer>` in `App.tsx`. Uses react-toastify's own default rendering (`theme: "colored"`) — a custom-styled toast content component was tried and reverted because it didn't size correctly for short messages.

### Dropdowns & tooltips

`react-select` powers both dropdown components — `components/ui/Select.tsx` (static `options` array) and `components/ui/AsyncSelect.tsx` (API-backed, takes `loadOptions`). Both are generic over the option shape and share one style config: `components/ui/selectStyles.ts#buildSelectStyles` is the single place to change how every dropdown looks (colors reference `@theme` CSS vars like `var(--color-primary-500)`, so they re-theme with the color preset same as Tailwind utilities do). The chevron/loading-indicator overrides live separately in `components/ui/SelectIndicators.tsx` — kept out of `selectStyles.ts` deliberately, since mixing a plain function export with component exports in one file breaks Fast Refresh (`react-refresh/only-export-components`).

`components/ui/Tooltip.tsx` renders via `createPortal(..., document.body)` with inline styles (not Tailwind classes) for its colors, since portaled content can lose Tailwind's cascade context — same `@theme` var references as the selects for the `success`/`error`/`warning`/`info` variants. Use it to reveal full text wherever something is truncated (`truncate`, `line-clamp-*`) so a value is never permanently hidden.

### Forms

Forms use `react-hook-form` + `@hookform/resolvers/yup` with schemas in `src/validations/`. See `LoginPage.tsx` / `validations/authValidation.ts` for the pattern: `useForm<T>({ resolver: yupResolver(schema) })`, `register(...)` spread onto `Input`, `formState.errors` fed to `Input`'s `error` prop.

### State

Redux Toolkit, one slice per domain under `src/store/<domain>/`. Use the typed `useAppDispatch`/`useAppSelector` from `src/store/hooks.ts`, never the bare `react-redux` hooks.

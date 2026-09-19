# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Keep this file current.** In any session, new or continuing — after making a non-trivial code change (a new convention, a gotcha worth not repeating, a changed architectural decision, a fixed bug whose cause isn't obvious from the diff alone), update the relevant section of this file in the same turn, before considering the task done. Don't wait to be asked. A change with nothing future sessions need to know (a one-line typo fix, pure formatting) doesn't need an entry — use judgment, but default to documenting.

**Also keep `AGENTS.md` (same directory) in sync.** It's a condensed pointer at this file for Antigravity and other AGENTS.md-reading agents, not a fork — if an update here changes anything summarized there (a non-negotiable convention, a command, a core architectural rule), mirror it in `AGENTS.md` in the same turn. If the change is outside what `AGENTS.md` summarizes, no edit needed there.

## Cross-machine paths

This project is worked on from two machines. Cross-references elsewhere in this file to the sibling backend's `CLAUDE.md` use the Windows path (`D:\DMSBackend\CLAUDE.md`) — **leave those as they are**, they're correct on Windows. On Mac, resolve them against these paths instead:

| | Windows | Mac |
|---|---|---|
| This repo (DMSFrontend) | `D:\DMSFrontend` | `/Users/monishpaul2000/Documents/PROJECTS/DMS/DMSFrontend` |
| Sibling (DMSBackend) | `D:\DMSBackend` | `/Users/monishpaul2000/Documents/PROJECTS/DMS/DMSBackend` |

`D:\dms-editor\...` references point at the standalone Tiptap POC (Mac: `/Users/monishpaul2000/Documents/PROJECTS/DMS/DMSEditor`) that `src/editor/` was ported from (see "Template governance" below — the port is complete as of 2026-09-19). The POC itself is no longer actively developed, but stays around as reference material for the proven extension/pagination configuration — don't chase either path down unless explicitly asked to revisit the POC itself.

## Project

InnerEye DMS — Document Management System frontend. React 18 + TypeScript, built with Vite, styled with Tailwind CSS v4. Talks to an ASP.NET Core backend (`InnerEye.DMS.Api`) whose DTOs are mirrored 1:1 in `src/types/`.

Static images are never imported directly from `src/assets/` in a component — they go through `src/assets/index.ts`'s `Images` object (`import Images from "../../assets"; <img src={Images.logo} />`). Add a new asset by importing it there and adding it to the `Images` object, not with a one-off `import logo from "../../assets/logo.png"` in the component that needs it.

Every bundled image also gets recompressed automatically at build time by `vite-plugin-image-optimizer` (`vite.config.ts`, wraps `sharp` for raster formats and `svgo` for SVG — both devDependencies, required for it to actually run rather than silently skip that format). This is a safety net on top of, not a replacement for, keeping source images reasonably sized to begin with — it recompresses, it doesn't resize, so a 2000px-wide image dropped into `assets/` still ships at 2000px wide (just better-compressed). Downscale to the size it's actually displayed at before adding it.

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

`MenusController` is currently anonymous on the backend with hardcoded dummy `empNo`/`tenantId`, so the `X-Tenant-Id` header described below is ignored server-side for now — it's already wired frontend-side ahead of `MenusController` becoming `[Authorize]`'d and tenant-scoped (see the backend's `TenantValidationMiddleware`, which 401s if a caller's `X-Tenant-Id` header disagrees with their JWT's `tenantId` claim).

### Authorization: menu-scoped permissions

The backend embeds one JWT claim per granted flag, shaped `"menu:{idMenu}:{action}"` (e.g. `"menu:724:edit"`), landing in `CurrentUser.permissions` (`GET /auth/me`). `action` is `view | create | edit | delete | report` today (backend's `NotificationType`-style "extend as needed" set, not a closed list — see `utilities/permission.ts`'s doc comment) — there's no separate `ViewYN` column on the backend (`MST_Role_Detail`); "view" is derived as an OR of the other four flags (`MenuRepository.cs`'s `GetMenuRowsForRoleAsync` SQL) — a role-detail row can exist with every flag explicitly `0` (revoked but kept for audit), and that correctly yields no view access, not "row exists so view it."

- `utilities/permission.ts#menuPermission(idMenu, action)` — builds the claim string; the one place that knows the `"menu:{id}:{action}"` shape.
- `hooks/useAuth.ts` — `hasPermission(perm)` (raw string, `ProtectedRoute.tsx`'s `permission` prop uses this) and `canMenu(idMenu, action)` (the ergonomic id+action form Sidebar/MenuGuard/`Can` actually use) are both backed by a memoized `Set` built from `user.permissions`, not a live `.includes()` scan per call.
- `components/auth/Can.tsx` — declarative gate for any future per-menu action button: `<Can idMenu={x} action="edit"><Button>Edit</Button></Can>`. No new plumbing needed per menu/action when a future create/edit/delete button gets added somewhere — wrap it the same way.
- `Sidebar.tsx` filters every submenu by `canMenu(sub.idMenu, "view")` *before* the single-link-vs-group branching (not after), and drops a main-menu group entirely once its visible-submenu count hits zero, rather than rendering an empty header.
- `routes/MenuGuard.tsx` is the route-level counterpart — hiding a sidebar link doesn't stop someone typing/bookmarking the URL directly. It matches the current path against `state.menu.allMenus` (`GET /menus`, the **unfiltered** catalogue), not `state.menu.modules` (`GET /menus/me`) — `/menus/me` is already permission-filtered server-side, so a menu the user just lost "view" for disappears from `modules` entirely, and using `modules` as the "is this URL menu-governed" source made MenuGuard blind to exactly the case it needs to catch (revoked access silently rendered unguarded instead of being blocked). `allMenus` decouples "is this URL part of the menu system" from "can *this* user view it" (`canMenu`, evaluated separately). Every authenticated route in `AppRoutes.tsx` is wrapped in `<MenuGuard>`, including ones not currently in the dynamic menu tree (`/profile`, `/settings`) — it's a no-op for those (no match, no permission to check), and future-proofs them if they ever become menu-driven.
- `AppLayout.tsx` is the single owner of both `fetchMyMenuThunk` (`modules`) and `fetchAllMenusThunk` (`allMenus`) — dispatched once per mount; `SettingsPage.tsx` does **not** also dispatch `fetchAllMenusThunk` itself (would double-fetch). `<Outlet />` only renders once both `state.menu.fetched` and `state.menu.allMenusFetched` are true (dedicated booleans, not `loading`/`modules.length` — a user with zero menu access has an empty `modules` forever, so list-length alone can't distinguish "not fetched yet" from "fetched, found nothing"). This matters because `MenuGuard` must never evaluate against a still-empty pre-fetch list — that would briefly render a page the user can't actually view.
- **`GET /auth/me`'s Roles/Permissions are resolved LIVE from ESSP on every call (`IIdentityClaimsService.ResolveAsync`), not read off the current JWT's claims.** This was a deliberate backend fix, not always true — `AuthController.Me()` used to do `HttpContext.GetRoles()`/`GetPermissions()`, which only reflects whatever was baked into the access token at its last mint (login or `/auth/refresh`). `refreshCurrentUserThunk()` calls `/auth/me` **without** rotating the token specifically so the acting session can see its own just-made permission change immediately — but with the old JWT-reading implementation, that call just re-echoed the stale token contents, so the "fix" silently did nothing and the bug looked intermittent (it actually depended on whether a real reload/token-rotation had *also* happened in between). If this regresses (a Settings-page permission change stops showing up in the same session without a reload), check `AuthController.Me()` first — it must call `_identityClaims.ResolveAsync(empNo, ct)`, not read `HttpContext.GetRoles()`/`GetPermissions()`. The JWT's own baked-in claims remain the snapshot actually enforced by `[HasPermission]` on every other request — only this identity-hydration endpoint is live; that's an intentional, accepted divergence (see `AuthController.cs`'s doc comment on `Me()`), not something to "fix" by making authorization itself re-resolve per request. `SettingsPage.tsx`'s assign-permission form dispatches `refreshCurrentUserThunk()` alongside `fetchMyMenuThunk()` right after a successful assignment, **awaited together via `Promise.all(...).unwrap()`** (not fire-and-forget — racing them unawaited left Sidebar occasionally out of sync with no sign anything was wrong), so the *acting* session's own Sidebar/MenuGuard update immediately without needing a full reload. A different user's session still needs its own refresh/re-login (no realtime permission push exists — the SignalR notification hub is a separate, unrelated channel).
- `App.tsx` force-reloads on a browser back/forward-cache (bfcache) restore (`pageshow` event, `event.persisted === true`) — bfcache can resurrect a fully-rendered pre-permission-change snapshot with no JS re-execution when the user clicks the browser Back button, which would otherwise let a revoked page render again with zero code path involved to stop it.
- **Backend gotcha, not frontend, but worth knowing when nothing seems to take effect**: ASP.NET Core does not hot-reload C# changes the way Vite hot-reloads the frontend — the running API process must be manually restarted after every backend edit (`CanView` logic, permission claim generation, etc.) or it keeps serving the old build. "Works sometimes, not others" when testing a permission change is a strong signal the API wasn't restarted between edits.

### Bearer token & tenant header

`services/axiosInstance.ts`'s request interceptor attaches both `Authorization: Bearer <token>` and `X-Tenant-Id` to every outgoing request automatically — no per-service wiring needed. Both live as module-scoped variables in that file (`accessToken`/`tenantId`, set via `setAccessToken`/`setTenantId`, read via `getAccessToken`/`getTenantId`, cleared via `clearAccessToken`/`clearTenantId`), the same pattern for both. **Deliberately not read from the redux store** — `axiosInstance.ts` importing `store.ts` would create a circular import (`store.ts` → `authSlice.ts` → `authThunks.ts` → `authService.ts` → `axiosInstance.ts` → `store.ts`). `authThunks.ts`'s `fetchCurrentUser` (shared by `loginThunk` and `initAuthThunk`) calls `setTenantId(user.tenantId)` right alongside `setAccessToken`; `logoutThunk` and both thunks' failure paths call `clearTenantId()` alongside `clearAccessToken()`. When adding a new call site that resolves the current user outside `authThunks.ts`, mirror this — don't reach for `state.auth.user.tenantId` from within `axiosInstance.ts`.

The Settings page's "Assign Menu Permission" card calls `POST /menus/permissions` (`assignMenuPermissionThunk`) using the full menu catalogue from `GET /menus` (`fetchAllMenusThunk` → `state.menu.allMenus`, `Select`) and the role list from `GET /roles` (`AsyncSelect`, see below) to populate its two pickers. Deliberately **not** `GET /menus/permissions/me` — that's scoped to the logged-in user's own visible menus, which is wrong for an admin screen assigning permissions to *other* roles; `allMenus` is the unscoped catalogue. The `menu` redux slice (`modules`, `allMenus`, `permissions`) is **not** persisted (not in `store.ts`'s `whitelist`) — it refetches fresh every session, unlike `auth`.

Once both Role and Menu are picked, the form calls `GET /menus/{idMenu}/permissions/{idRole}` (`menuService.getRolePermission`) and pre-checks the CRUD checkboxes with whatever permission already exists for that pair (a `useWatch` + `useEffect` in `SettingsPage.tsx`, cancels itself via a `cancelled` flag if the role/menu selection changes again before the request resolves). This is so `POST /menus/permissions` — an upsert that replaces the full flag set — always submits the existing flags plus whatever the admin actually changed, instead of silently wiping out the unrelated ones back to `false`. No matching row (a brand-new role/menu pair) just leaves the checkboxes as the admin left them.

`GET /roles` (`services/roleService.ts`, `types/role.ts`) has no server-side search param, so `roleService.searchRoles(inputValue)` fetches the full list once and filters client-side per keystroke thereafter — debounced (`lodash/debounce`, 350ms) and cancellable (`AbortController`, aborts any still-in-flight request when a newer keystroke supersedes it) so a fast typist can't fire overlapping `/roles` requests. `SettingsPage.tsx`'s role `AsyncSelect` just calls it directly as `loadOptions`. If the backend ever adds a real `?search=` param, only `searchRoles`'s internals need to change — every caller stays the same.

**Don't move that cache/debounce/abort state into a component (`useRef`/`useMemo`) — it lives at module scope in `roleService.ts` on purpose.** This project's ESLint config includes React Compiler's `react-hooks/refs` rule, which flags a ref read from inside a closure captured by `useMemo`/`useRef` (like a debounced async callback) as an unprovable "may read ref during render," even when it plainly can't happen. Module-level state sidesteps the rule entirely and is arguably the more correct home for it anyway — it's shared reference data (all roles), not something scoped to one component instance.

The assign-permission form binds `react-select`'s option objects (`{ value, label }`) directly as `react-hook-form` field values via `Controller` (not the raw `idRole`/`idMenu` numbers) — the numeric IDs are only extracted from `field.value.value` at submit time, right before building the `AssignMenuPermissionRequest` payload. This sidesteps fighting yup's typings for nested option-object schemas; the form uses `Controller`'s own `rules={{ required }}` instead of a yup resolver.

### Per-user preferences (AppSettings)

Theme and language (and any future per-user preference) are persisted server-side in the backend's generic `AppSettings` key/value table, not only in the sessionStorage-persisted `auth` slice — the backend is the source of truth across devices/browsers; sessionStorage is just the last-known-good value for the instant this tab loads, same session-scoped lifetime as the rest of `auth`.

- `types/appSettings.ts#AppSettingsMap` (`Record<string,string>`) mirrors the backend's flat key/value shape 1:1 — `CurrentUser.settings` (`types/auth.ts`) carries the same shape, since `GET /auth/me` folds the caller's settings into the identity response (one round trip on login/init/refresh, not a separate fetch).
- `services/appSettingsService.ts` — `getMySettings()` (`GET /app-settings`) / `upsertMySettings({ settings })` (`PUT /app-settings`, upserts any number of keys in one call, returns the full updated map). Not usually called directly for theme/language — see below.
- `store/auth/authThunks.ts#upsertAppSettingsThunk` — the one place that calls the service for theme/language. `authSlice.ts`'s internal `applySettings(state, user)` helper reads `user.settings.theme`/`user.settings.language` (only if present — a brand-new account with nothing saved yet just keeps whatever's already in state) and is called from every thunk that lands a fresh `CurrentUser`: `initAuthThunk.fulfilled`, `loginThunk.fulfilled`, `refreshCurrentUserThunk.fulfilled`. `upsertAppSettingsThunk.fulfilled` itself also re-syncs `themePreset`/`language` from the server's response (the actual persisted values, not just an echo of what was sent) and updates `state.user.settings`.
- `SettingsPage.tsx`'s `handleThemeChange`/`handleLanguageChange` apply the change **locally first** (`dispatch(setTheme/setLanguage)` + `applyTheme`/`i18n.changeLanguage`, exactly as before this table existed — instant feedback, no spinner), then fire `upsertAppSettingsThunk` to persist it. Not awaited and no error toast on failure — the local UI state is always whatever the user just clicked, there's nothing to visually roll back, and the next successful save (or next login's `GET /auth/me`) reconciles it. Don't add a loading/error UI around this call unless a real "silently lost preference" complaint shows up.
- Backend pattern (mirror this for any new per-user preference key, not a new column/table): `AppSetting` is a generic key/value row keyed by `(ownerEmpId, key)` — adding a new setting is just a new key string, no migration. See `D:\DMSBackend\CLAUDE.md`'s "App settings" entry for the full backend-side shape.

### Error & offline pages

`AppRoutes.tsx` wraps the whole route tree in one pathless root `RouteObject` whose `errorElement` is `pages/ErrorPage.tsx` — a single global error boundary (via `useRouteError`/`isRouteErrorResponse`) rather than one per page, since React Router data routers propagate a thrown render/loader/action error up to the nearest ancestor route with an `errorElement`. This is for unexpected exceptions, not for expected API failures — those still go through `toast.error(...)`.

`pages/OfflinePage.tsx` is not a route — `App.tsx` renders it as a full-screen takeover (before the router) whenever `hooks/useOnlineStatus.ts` (listens to the `online`/`offline` window events) reports the browser is offline, since connectivity can drop on any page and nothing behind it can reliably call the API anyway.

### Routing

`src/routes/AppRoutes.tsx` uses React Router's **data router** API (`createBrowserRouter` + a `RouteObject[]` tree), not the `<Routes>`/`<Route>` JSX form — consumed in `App.tsx` via `<RouterProvider router={router} />`. `ProtectedRoute` / `PublicOnlyRoute` are plain wrapper components (not route-level loaders) that redirect based on `useAuth()`'s `isAuthenticated`.

Note: `<ProtectedRoute>` around the authenticated `AppLayout` branch has at times been left commented out mid-development (to test pages without needing a live login). If `typecheck`/`build` fail on an unused `ProtectedRoute` import in this file, check whether it's commented out before assuming it's a new regression — confirm with the user whether to restore the guard or just drop the unused import.

### Styling: Tailwind v4 CSS-first config

There is no `tailwind.config.js` — theme customization lives in `src/index.css` via `@theme { }`. Two cascade-layer gotchas already bit this project once each; don't reintroduce them:

1. **Custom theme colors (`--color-primary-*`, `--color-danger-*`, etc.) must be declared inside `@theme { }`, not a plain `:root { }` block.** Tailwind v4 only generates utility classes (`bg-primary-500`, `text-danger-600`, ...) for variables declared inside `@theme`. A plain `:root` block just defines a CSS variable with no corresponding utility.
2. **Any custom global CSS (resets, focus rings, etc.) must be wrapped in `@layer base { }`.** Tailwind's own utilities live in `@layer utilities`. Cascade layers mean *unlayered* CSS always beats *any* layered CSS regardless of selector specificity — an unlayered `* { padding: 0 }` will silently zero out every `px-*`/`py-*` utility in the app no matter how specific the utility's selector is.

Runtime theme switching (4 color presets — ocean/teal/indigo/slate) works by overwriting the `--color-*` CSS variables via `documentElement.style.setProperty` in `src/utilities/theme.ts` — Tailwind utilities reference these variables under the hood, so swapping the variable value re-themes every utility without regenerating any CSS.

**Fluid font sizes: `clamp()`, opt-in and narrowly scoped.** `--text-fluid-heading` / `--text-fluid-stat` in `index.css`'s `@theme` (same mechanism as `--shadow-neu-*` → `shadow-neu-*`: any `--text-*` var becomes a real `text-*` utility) wrap a `clamp(min, preferred, max)` value, used as `text-fluid-heading`/`text-fluid-stat` class names. Currently applied to `LoginPage.tsx`'s hero `<h1>` and `DashboardPage.tsx`'s `StatCardTile` value — both are fixed `text-2xl`/`text-4xl` sizes sitting in containers that can narrow to an in-between width Tailwind's `sm:`/`md:` breakpoint steps don't cover, so a wide value/heading could clip past its card edge at exactly those widths instead of scaling down. `clamp()` fixes that class of bug because it scales continuously with viewport width instead of jumping at fixed breakpoints. **Don't reach for this by default** — it's for a reproduced overflow on a large/heading-sized text node in a width-constrained container, not a general replacement for `text-sm`/`text-lg`/etc. Most text never hits this failure mode, and clamp adds a layer of indirection not worth paying where a fixed size already fits at every breakpoint. When a new spot needs it, add a `--text-fluid-*` token (don't inline a one-off `clamp()` in a `style` prop) so the scale stays centralized and reusable.

### Neumorphic design system

The whole app uses a neumorphic ("soft UI") visual style — surfaces are distinguished by shadow depth, not borders or color blocks. `--color-surface-100` (`src/index.css`, `@theme`) is the single flat background color shared by the page body, cards, the sidebar, the header, and every form field — nothing sits on a *different* background from its parent, only a shadow separates it. `--color-surface-*` is fixed and **not** re-derived per runtime color preset — `utilities/theme.ts` only overwrites the primary/danger/success/warning scales, never surface, so the shadow tokens below stay correct across every preset without recomputation.

`src/index.css`'s `@theme` declares a set of `--shadow-neu-*` tokens (Tailwind v4 turns any `--shadow-*` custom property into a real `shadow-*` utility class), computed once against `--color-surface-100`:
- `shadow-neu-raised` / `shadow-neu-raised-sm` — a surface "pops up" off the page (cards via `components/ui/Card.tsx`, buttons, icon chips, the active pagination button).
- `shadow-neu-pressed` / `shadow-neu-pressed-sm` / `shadow-neu-pressed-lg` — a surface is "pushed in" (form fields, search bars, the checked-off state of an active sidebar nav link — selected = pressed, not a solid highlight).
- `shadow-neu-pressed-danger` / `shadow-neu-pressed-success` — insets tinted for a status callout (e.g. an approved/rejected notice box) rather than a solid colored background.
- `shadow-neu-sidebar` / `shadow-neu-header` — the sidebar/header's own asymmetric depth shadow (they don't use `border-r`/`border-b`).

**Compose, don't clobber, with `ring-*`**: Tailwind v4's `shadow-*` and `ring-*` utilities both write into a shared `--tw-shadow`/`--tw-ring-shadow` stack that the final `box-shadow` combines, so `shadow-neu-pressed focus:ring-2 focus:ring-primary-500/40` (see `Input.tsx`/`PasswordInput.tsx`) layers a focus ring on top of the pressed shadow instead of one replacing the other. Error state adds a permanent `ring-2 ring-danger-500/30` the same way, rather than a `border-red-*` swap.

`react-select` (`Select.tsx`/`AsyncSelect.tsx` via `selectStyles.ts`) can't consume Tailwind classes for its internals, so its control/menu styles reference the same tokens directly as CSS `var(--shadow-neu-pressed)`/`var(--shadow-neu-raised)` values in inline style objects, with focus/error composed manually as a second comma-separated `boxShadow` layer (there's no ring utility to piggyback on there) — keep any dropdown styling changes here, not by trying to reintroduce Tailwind classes into `selectStyles.ts`.

`components/ui/Card.tsx` is the reusable wrapper that replaced the old `bg-white rounded-xl border border-gray-200` pattern everywhere (`DashboardPage`, `ProfilePage`, `SettingsPage`, `TemplatePage`) — `bg-surface-100 rounded-2xl shadow-neu-raised`, with a `noPadding` prop for cards that manage their own inner spacing (e.g. wrapping `EmptyState`/`DataTable`). Use it instead of hand-rolling the border pattern for any new card-like container.

`components/ui/Badge.tsx` is the reusable status pill — `variant: "draft" | "in_review" | "approved" | "rejected"` (exported as `BadgeVariant`) maps to the same soft gradient-pill palette as the reference design's STATUS_META (draft = gray, in_review = amber, approved = green, rejected = red); the label text is passed as `children`, not baked into the variant, so callers control the copy (`DashboardPage.tsx`'s `STATUS_LABEL` map is the pattern to follow). Use it instead of hand-rolling a status `<span>` anywhere a document/template/user status needs to render — it's the same four statuses documents, templates, and eventually workflow steps all share.

`Tooltip.tsx` is deliberately **not** neumorphic — it stays a solid, high-contrast colored pill (dark/success/error/warning/info variants), since a floating tooltip needs to read clearly above whatever it's over, not blend into the page surface the way a resting card or field does.

### i18n

`react-i18next`, initialized in `src/i18n/index.ts`, resources in `src/i18n/locals/{en,hi}.json` (note: `locals`, not `locales`). Language preference persists to `sessionStorage` (key `innereye-lang`), consistent with the session-scoped auth model above. Only add translation keys that are actually referenced in code — this project has had dead keys from an earlier "Vendor Management System" scaffold pruned before; don't reintroduce speculative keys for unbuilt features.

### Template governance

Types (`src/types/template.ts`), services (`src/services/templateService.ts`,
`src/services/templateTypeService.ts`), thunks/slice (`src/store/template/`), pages
(`TemplateListPage.tsx`, `TemplateDetailPage.tsx`, `TemplateFormPage.tsx` used at both
`/templates/new` and `/templates/:id/edit`) and routes (`/templates`, `/templates/new`,
`/templates/:id`, `/templates/:id/edit`, all `<MenuGuard>`-wrapped) mirror the backend's
`TemplatesController`/`TemplateTypesController` (`api/v1/dms/templates`,
`api/v1/dms/templatetypes`).

- **Template name / template type name uniqueness is enforced application-layer, not via a DB
  unique constraint (fixed 2026-09-18).** `TemplateName` is intentionally reused across every
  version in a version chain (`CreateNewVersionAsync` on the backend copies it unchanged), so a
  unique index would break versioning. Instead, `TemplateService.CreateDraftAsync` and
  `TemplateTypeService.CreateAsync`/`UpdateAsync` on the backend check for an existing
  case-insensitive name match before insert and throw `TemplateNameAlreadyExistsException` /
  `TemplateTypeNameAlreadyExistsException` (409, new `ErrorCode.TEMPLATE_NAME_ALREADY_EXISTS` /
  `TEMPLATE_TYPE_NAME_ALREADY_EXISTS`) if found — see `D:\DMSBackend\CLAUDE.md` for the backend
  detail. No frontend yup async validation was added (a network round trip mid-typing is
  unnecessary complexity) — `TemplateFormPage.tsx`'s submit handlers already surface the
  backend's `message` via `templateThunks.ts`'s `extractErrorMessage`, so the new "already exists"
  message just flows through the existing `toast.error(res.payload ?? ...)` path unchanged.
- **Template list shows only the latest version of each family (fixed 2026-09-18).**
  `GET /Templates` now always filters to `IsLatestVersion` server-side
  (`TemplateRepository.GetPagedAsync`) — previously every version of every family appeared as a
  separate row. To see the full version history, `TemplateDetailPage.tsx` fetches
  `GET /Templates/{id}/versions` (`fetchTemplateVersionsThunk`, `state.template.versions`),
  rendered via `components/ui/Accordion.tsx` (a new generic single-open-at-a-time accordion
  primitive — reuse it for any future collapsible list instead of building a one-off) through
  `components/template/TemplateVersionAccordion.tsx` (the template-versions-specific wrapper:
  status Badge per row, "(viewing)" tag on the current one, "View this version" link that
  navigates to `/templates/{thatVersionId}` for any other row rather than rendering N inline
  previews, since the versions endpoint only returns summary fields). **The backend walks the
  real `ParentTemplateId` lineage (`ITemplateRepository.GetVersionChainAsync` — find the root by
  walking `ParentTemplateId` up, then walk every descendant back down), not a `TemplateName`
  match (fixed 2026-09-18, was the original implementation)** — matching by name silently merged
  unrelated templates that happened to share a name from before name-uniqueness was enforced
  (pre-existing dirty test data), producing a version list padded with repeats of unrelated
  templates. Returned already ordered `VersionNumber` descending (latest first) — the accordion's
  `defaultExpandedId` is simply `versions[0]?.id`, no client-side max-finding needed anymore. The
  card only renders when there's more than one version.
- **`vv1` double-"v" bug in the detail page header subtitle (fixed 2026-09-18).** The backend's
  `versionLabel` already includes its own `v` prefix (`"v1"`, `"v2"`, ...) — `TemplateDetailPage.tsx`'s
  header subtitle was rendering a hardcoded extra `v{selected.versionLabel}`, producing `vv1`.
  Now renders `{selected.versionLabel}` directly, matching `TemplateListPage.tsx`'s Version column
  (which was already correct).
- **Document preview is now a bounded-height scroll viewport, not an unbounded-growth block (fixed
  2026-09-18).** `TemplateDetailPage.tsx`'s "Document preview" card previously let the A4 page div
  grow to its own `min-h-250` regardless of content, so a short document rendered as a huge mostly-
  blank box. The outer container (`bg-surface-200/60 rounded-xl p-6`) now also carries
  `max-h-175 overflow-y-auto`, bounding vertical space while the inner A4-proportioned page
  (`min-h-125` — lowered from `min-h-250` since the bounded outer container made the old baseline
  read as oversized) can still grow taller than the viewport; the user scrolls within the card to
  see a longer document instead of the whole page growing. Width was also narrowed further (fixed
  2026-09-18): `max-w-198.5` (794px, full A4-at-96dpi) read too wide sitting in the 2/3-width
  detail-page column, so it's now `max-w-125` (500px, `px-12` inner padding) — still A4-proportioned
  in spirit, just scaled down to actually look like a page instead of filling the card. Still
  deliberately NOT using `aspect-ratio` (tried and reverted previously — decoupling width/height
  was the correct call).
- **The "Document preview" `Card` itself shrinks to the page's width now (`max-w-fit`, fixed
  2026-09-18), instead of stretching the full 2/3-width grid column.** A narrow A4-proportioned
  page centered inside a full-width card left a lot of surrounding gray padding that read as "too
  much padding" — the fix was shrinking the card, not just the page inside it. Also dropped a
  redundant padding layer (`p-6` → `p-3` on the scroll-viewport div, `px-16 py-14` → `px-10 py-12`
  on the page div itself) — three nested padding layers (Card's own `p-6` + the gray wrapper's
  `p-6` + the page's own padding) was more than needed once the card no longer fills the column.
- **Version-mismatch symptom (same "v2" showing different data depending on entry point) was a
  real data-integrity bug, not a display bug — see `D:\DMSBackend\CLAUDE.md`'s Template governance
  section for the fix** (`CreateNewVersionAsync` could be called twice against the same parent,
  producing two sibling children both labeled `v2`; fixed with a DB unique index on
  `ParentTemplateId` plus an app-layer pre-check). No frontend change was needed once the backend
  data/guard were fixed — `TemplateVersionAccordion`'s rendering was already correct, it was just
  faithfully displaying genuinely inconsistent underlying data.
- **Backend schema normalization: `TemplateMaster` split into `Template` (family identity) +
  `TemplateVersion` (per-version workflow row), 2026-09-18 — see `D:\DMSBackend\CLAUDE.md`'s
  Template governance section for the full backend-side rationale/migration detail.**
  `ParentTemplateId` is gone entirely — the old self-referencing lineage (walked in
  `ITemplateRepository.GetVersionChainAsync`, referenced above) is replaced by a plain
  `TemplateVersion.TemplateId` FK to the shared family row, and `GET /Templates/{id}/versions`
  now does a straight FK query instead of a parent-pointer chain-walk (same response shape,
  same ordering — no frontend rendering change needed). Two DTO-level effects on this repo:
  `types/template.ts`'s `TemplateListItemDto` gained `templateId: number` (`Template.Id`, the
  family id — distinct from the existing `id`, which is unchanged and still `TemplateVersion.Id`,
  still what `/templates/{id}` routes use) and `TemplateDto.parentTemplateId` was removed (grepped
  clean — nothing in this repo read it beyond the type declaration itself). The new
  `IX_TemplateVersions_Template_NonTerminal` filtered unique index (on `TemplateVersion.TemplateId`,
  filtered to `Status IN ('DRAFT','PENDINGAPPROVAL')`) replaces the old
  `IX_TemplateMasters_ParentTemplateId` as the backend's race-condition backstop for "at most one
  non-terminal version per template" — purely backend-internal, no frontend-visible behavior change.
- **"Back" falls back to `/templates` only when there's no real in-app history to go back to**
  (`location.key === "default"`, e.g. a direct URL load or a fresh tab) — otherwise it's a plain
  `navigate(-1)`. Added defensively (fixed 2026-09-18) after a reported "Back always returns to
  the list instead of the previously-viewed version" symptom that turned out to most likely be a
  side effect of the version-mismatch data bug above (navigating between two rows that both
  claimed to be "v2" was confusing regardless of where Back landed) — no actual routing bug was
  found (no stray `replace: true` anywhere in this module, `TemplateVersionAccordion`'s "View this
  version" already did a plain history-pushing `navigate()`). Re-test after the backend fix before
  assuming this needs more work.
- **`idMenu={724}` is the confirmed real menu id** for Template Governance (user-provided,
  2026-09-17, verified against a real `GET /auth/me` response: `permissions` includes
  `"menu:724:view"`, `"menu:724:create"`, `"menu:724:edit"`, `"menu:724:delete"`,
  `"menu:724:report"`). Every `<Can idMenu={724} action="...">` gate on this module uses `724`.
- **Action strings were corrected to the actual grantable CRUD set — do not use custom action
  strings like `"submit"`/`"approve"`/`"reject"`/`"createNewVersion"`/`"updateReviewInterval"`.**
  An earlier pass in this module gated the workflow buttons with those custom strings to mirror the
  backend's `[HasPermission("menu:90:submit")]`-style attributes literally. That was wrong: the real
  `GET /auth/me` permission list for menu 724 only ever contains the standard
  `view|create|edit|delete|report` set — that's *all* the Settings page's permission-assignment UI
  (`SettingsPage.tsx`'s CRUD checkboxes) is capable of granting, for any menu, ever. A custom string
  like `"menu:724:submit"` can never appear in a real user's `permissions` array through any existing
  admin flow, so gating on it would permanently hide the button for every user, including admins.
  Fixed by remapping every gate to the closest real CRUD action instead: submit/approve/reject/
  updateReviewInterval → `action="edit"`, createNewVersion → `action="create"`. **The backend had
  this exact same bug and has also been fixed (2026-09-17)** — `TemplatesController`'s five
  `[HasPermission]` attributes now check `menu:724:edit`/`menu:724:create` instead of the old
  placeholder-idMenu, unreachable-action-string versions; see `D:\DMSBackend\CLAUDE.md`'s Template
  governance note for the backend-side detail.
- **Asymmetric permission enforcement, by design.** Section/field CRUD (`addSection`/`updateSection`/
  `deleteSection`/`addField`/`updateField`/`deleteField`) and template list/get/create-draft have
  **no** `[HasPermission]` on the backend at all — still wrapped in `<Can idMenu={724} action="edit"/
  "create"/"delete">` client-side anyway, purely for UI consistency/defense-in-depth (same rationale
  as `Can.tsx`'s "any future per-menu action button" bullet), even though the backend doesn't
  enforce it yet for these specific actions. Don't assume every `<Can>` wrap here has a matching
  backend check — only the 5 actions above do.
- **New Badge variants**: `Badge.tsx`'s `BadgeVariant` gained `pendingApproval`, `deprecated`, and
  `overdue` (review-due indicator) alongside the existing `draft`/`in_review`/`approved`/`rejected`
  — kept as separate keys rather than reusing the 4 existing ones, since they're meaningfully
  distinct states. `DashboardPage.tsx`'s local `StatusKey` type had to narrow to
  `Extract<BadgeVariant, "draft" | "in_review" | "approved" | "rejected">` when this landed, since
  its `STATUS_LABEL` map only covers those 4 — if `BadgeVariant` grows again, check that map too.
- **No rendition endpoint exists on the backend.** `TemplateRenditionDto`/`TemplateRenditionBlockDto`
  are declared in the backend payloads as a forward-looking shape but nothing returns them today.
  The read-only preview on `TemplateDetailPage.tsx` is composed client-side instead: sections are
  bucketed by `sectionKind` (`"header"` → header HTML, `"footer"` → footer HTML, `"section"` sections
  sorted by `sectionOrder` and joined → body) and rendered directly. If a real rendition endpoint
  ships later, replace this bucketing with a fetch instead of re-deriving it from `sections[]`.
- **Client-side placeholder-token validation** (`validations/templateValidation.ts`'s
  `PLACEHOLDER_REGEX`/`extractPlaceholderKeys`) mirrors the backend's exact bracket-syntax regexes
  per `TemplatePlaceholderFormat` (doubleCurly/doubleSquare/singleSquare) — used as a non-blocking
  UX hint in `TemplateFormPage.tsx`'s section rows (green when every bound field's `fieldKey`
  appears as a token in that section's HTML, red listing which keys are missing). This is a hint
  only, not authoritative — the backend still 400s (`FieldKeyNotFoundInSectionContentException`/
  `InvalidPlaceholderSyntaxException`) on an actual mismatch at save time.
- **Section/field CRUD only works in `draft` status** — the backend 409s otherwise
  (`TemplateNotDraftException`). `TemplateFormPage.tsx`'s `SectionBuilder` checks this
  (`isDraft`) and renders a plain message instead of the editor when the template has left draft.
  Exactly one header and one footer section are allowed per template — the "+ Header"/"+ Footer"
  buttons disable once one already exists (client-side mirror of `DuplicateHeaderOrFooterSectionException`).
- **Editor: the `D:\dms-editor` Tiptap port is now complete (landed 2026-09-19).** The
  dependency surface (`reactjs-tiptap-editor`, `@tiptap/*` v3.31.3, `tiptap-pagination-plus`,
  `katex`, `easydrawer`, `@excalidraw/excalidraw`) — previously flagged as "React 18
  compatibility risk, not verified" — was confirmed working by direct smoke test (`npm run
  build`/`typecheck` with real imports from every one of these packages) before any real
  editor code was written; the risk was moot, a prior pass had already installed the deps and
  never actually tried them. `src/editor/` is the ported, reusable engine — a sibling to
  `components/`/`pages/`/`services/`, not nested under `components/template/`, because it's
  deliberately **not template-only**: `FullPageEditor.tsx`'s props (`EditorSectionInput[]`,
  `onSave`, `fieldPanel` — see `core/types.ts`) never reference a template type/thunk/service,
  so a future document-editing feature can reuse it by mapping its own data into that shape.
  - **Two toolbar scopes, two extension modules.** `core/focusedExtensions.ts` (~15
    extensions: bold/italic/underline/strike, alignment, color/highlight, font family/size,
    headings, lists, links, tables, images, undo/redo, clear formatting) backs the inline
    per-section editor. `core/fullExtensions.ts` (everything else DMSEditor's POC wired in —
    video, columns, callouts, code blocks, Excalidraw, Mermaid, KaTeX, emoji, Twitter, Giphy,
    attachments, etc. — minus Lock and Comments, dropped entirely since no backend persists
    either and the permission model here is just edit-permission-gated author vs. read-only
    reviewer) backs the full-page popup editor only. **These are two separate files, not one
    shared module with two builder functions** — a single `extensions.ts` importing both sets
    statically would drag Excalidraw/Mermaid/KaTeX into every bundle that imports anything
    from `src/editor/`, including the eagerly-loaded Template Builder form. Don't merge them
    back into one file.
  - **`SectionInlineEditor.tsx` replaces `components/template/SectionHtmlEditor.tsx`** (now
    deleted) at its one call site, `TemplateFormPage.tsx`'s `SectionRow` — same external
    contract (`value`/`onChange`/`disabled`/`placeholder` props, `insertAtCursor` via ref).
    `insertAtCursor` is now just `editor.chain().focus().insertContent(text).run()` — the old
    component's `lastRangeRef`/capture-before-blur `Range` workaround is gone, since it was
    only needed for raw `contentEditable`; a real ProseMirror instance keeps its own selection
    independent of DOM focus.
  - **Field-insertion panel**: `src/editor/FieldPanel.tsx` (generic, `{label, token}[]` +
    `onInsert`) + `components/template/TemplateFieldPanel.tsx` (template-domain adapter,
    fetches `fieldService.list` and wraps via `wrapPlaceholder`). In the inline form,
    `SectionBuilder` (`TemplateFormPage.tsx`) owns a `Map<sectionId, RefObject>` +
    `activeSectionId` — each `SectionRow` creates its own ref and reports it up via
    `registerEditorRef` **inside a `useEffect`**, never during render (this project's
    `react-hooks/refs` lint rule — see the `roleService.ts` note above — flags reading a
    ref's `.current` at render time; the map itself is fine to mutate in effects/handlers,
    just not read while rendering `SectionRow`s in a `.map()`). In the popup editor,
    `FullPageEditor`'s `fieldPanel` prop is a **render function** `(insertAtCursor) => ReactNode`
    rather than a plain node, so the caller-supplied panel gets bound to that specific
    editor instance without `FullPageEditor` needing to know what kind of panel it is.
  - **Popup editor composes, doesn't blob.** `FullPageEditor.tsx` shows header + all body
    sections + footer as one continuous paginated document (matching
    `TemplateDetailPage.tsx`'s composed read-only preview, just editable), but never persists
    it as one HTML blob. `SectionMarkerExtension.ts` wraps each body section in a
    `<div data-section-id data-section-kind>` that survives ProseMirror round-tripping (plain
    unregistered `data-*` attributes on a generic div would otherwise be stripped — this is
    why the extension declares them via `addAttributes()`). `composeSections.ts`'s
    `composeSectionsToHtml`/`decomposeHtmlToSections` build and later re-split that HTML.
    Header/footer never enter the main ProseMirror doc at all — they're separate strings fed
    to `tiptap-pagination-plus`'s `headerLeft`/`footerLeft` config, edited via
    `HeaderFooterDialog.tsx` (a re-themed port of the POC's `HeaderFooterEditor.jsx`) and
    diffed as plain strings, not through the marker mechanism. On Save, only sections whose
    HTML actually changed since the last save get dispatched through the **existing**
    `upsertSectionThunk` (`TemplateEditorPage.tsx`'s `handleSave` loop) — **no new backend
    endpoint**, no DMSBackend changes at all for this feature.
  - **New route precedent: full-page, no-chrome, authenticated.** `/templates/:id/editor`
    (`routes/AppRoutes.tsx`) is the first route in this app that sits inside `<ProtectedRoute>`
    but **outside** `<AppLayout>` — opened via `window.open(...)` from
    `TemplateDetailPage.tsx`'s new popup-editor button (same deliberate no-`noopener` pattern
    as `handleOpenNewTab`, same sessionStorage-auth rationale). `<MenuGuard>` is a no-op here
    (can't exact-match a parameterized path against the unfiltered menu catalogue, same as
    `/profile`/`/settings`) — `TemplateEditorPage.tsx` does its own `canMenu(724,
    "view"/"edit")` check. The button itself is **not** gated by `<Can action="edit">` —
    unlike the "Edit" button, a view-only reviewer still needs to open this, just read-only.
  - **Code-split: `TemplateEditorPage` is lazy-loaded** (`routes/LazyTemplateEditorPage.tsx`,
    wrapped in `<Suspense>` at its route). This isn't optional polish — a first pass that
    imported it eagerly grew the main app bundle from ~1.5MB to ~2.6MB (measured via `npm run
    build`), because `fullExtensions.ts`'s Excalidraw/Mermaid/KaTeX imports would otherwise
    load on every page, including login. `src/editor/index.ts` deliberately does **not**
    re-export `FullPageEditor` (only `SectionInlineEditor`/`FieldPanel`/types) for the same
    reason — import it directly from `src/editor/FullPageEditor` if you ever need it
    somewhere new, and keep that new call site lazy too.
  - **Re-theming boundary.** Every toolbar button/dialog in `src/editor/toolbar/` is custom
    Tailwind/neumorphic, calling Tiptap commands directly (`editor.chain().focus()....run()`)
    — `reactjs-tiptap-editor`'s own `RichText*` UI components and its `style.css` are **not**
    used there. The one exception: `FullPageEditor.tsx` renders a handful of the library's own
    `RichText*`/`RichTextBubble*` components (Excalidraw, KaTeX, emoji picker, Twitter, Giphy,
    ExportPdf/ImportWord/ExportWord, search-and-replace, Mermaid, Drawer, format painter) with
    their default styling — rebuilding custom UI around these libraries' own complex internal
    state (canvases, file parsing, search decorations) was judged disproportionate scope. Don't
    reskin these, and don't import `reactjs-tiptap-editor/style.css` or any `RichText*`
    component anywhere else in `src/editor/`.
  - `DMSEditor` (see this file's "Cross-machine paths" section) remains useful as reference
    material for the proven extension/pagination configuration — `docs/backend-integration.md`
    there still documents the (unrelated, not-yet-built) document-editing `DocumentController`
    contract this engine is designed to eventually be reused for.
- **`TemplateDetailPage.tsx` header actions (2026-09-19): Download, "Open full editor in new window", and Edit — nothing else.** The `ExternalLink` icon now opens the full-page editor (`/templates/:id/editor`) as a sized popup (`window.open(..., "documentPopup", "width=1200,...")`, still no `noopener`); the separate `PenSquare` button and second handler were removed as duplicates. It's ungated by `<Can>` so view-only reviewers get the read-only editor. The form-builder **Edit** button (`/templates/:id/edit`, `<Can idMenu={724} action="edit">`) is **no longer gated on `status === "draft"`** — the builder is where header/footer/body sections are edited in any status (note the backend still 409s section CRUD outside draft, and `SectionBuilder` shows its non-draft message; loosen that separately if non-draft editing is really wanted). `TemplateListPage`'s row-level "Open in new tab" ExternalLink still opens the plain detail page, a different behavior from the detail header's.
- **Sections/fields are editable in every status except `rejected` (2026-09-19).** Backend: `TemplateService.EnsureEditable` and `FieldService.EnsureEditable` now throw `TemplateNotDraftException` only for `TemplateStatus.Rejected` (the old draft-only rule is gone; the exception/`TEMPLATE_NOT_DRAFT` error code name is kept, only its message changed). Submit/approve/reject workflow guards are unchanged and still status-specific. Frontend: `TemplateFormPage.tsx`'s `SectionBuilder` takes `isEditable` (`status !== "rejected"`) instead of `isDraft`. Editing an approved template's sections mutates that version in place (no auto new-version) — a deliberate product decision.
- **Builder page (`/templates/:id/edit`) layout (2026-09-19):** title row shows version label + status `Badge` and an `ExternalLink` button that opens the full editor popup (`/templates/:id/editor`, no `noopener`, not `<Can>`-gated). The right column (`lg:w-104`, `lg:sticky`) stacks the Fields insert panel above a **Live preview** card. `TemplateEditorPage` also puts the status in its title.
- **Live preview = `src/editor/DocumentPreview.tsx`** — read-only paginated A4 (same `buildFullExtensions` + `core/pagination.ts`'s `A4_PAGINATION_OPTIONS` as `FullPageEditor`, so page breaks/header/footer position match the real editor), scaled to its container with CSS `zoom` (never above 1:1), content updates debounced 250ms. It takes generic `EditorSectionInput[]`. It pulls in the heavy full extension set, so it is **lazy-only** via `components/template/LazyDocumentPreview.tsx` (separate chunk, verified in `npm run build`) — don't import it eagerly or re-export it from `src/editor/index.ts`. The preview reflects **unsaved** edits: each `SectionRow.handleHtmlChange` reports up via `onDraftChange` (an event handler, not an effect) into `SectionBuilder`'s `draftHtml` map, which overrides persisted HTML in `previewSections`. `reactjs-tiptap-editor/style.css` is deliberately not needed/imported (it's scoped under a class we never add; `editor.css` covers tables etc.). `TemplateDetailPage`'s own preview is still the older non-paginated client-side composition.
- **Multi-page templates (2026-09-19).** A "page" = the body sections (`sectionKind === "section"`) sharing a `pageIndex` (1-based; `null` = page 1, so every pre-existing template is a single page — the DB column/DTO field already existed and was previously unused, **no migration**). Header/footer are template-wide, not per page. Backend `TemplateService.ExportAsync` groups body sections by `PageIndex ?? 1`, orders by `SectionOrder` within a page, and joins pages with `<hr class="page-break" />` (which `DocxExportService` already turns into a real Word page break) — that's what makes a 2-page template download as 2 pages. Builder (`TemplateFormPage.tsx`'s `SectionBuilder`, which also owns the edit-mode title row): title row = `Edit template — name`, then the **page count**, version, status badge, and on the right an `Add page` button placed **before** the full-editor `ExternalLink` button. There is no outer "Sections" card — pages sit directly on the page background; every page is a framed `PagePanel` ("Page N · x sections"). The **first page's panel hosts the template-wide header + footer sections** and the `+ Header`/`+ Footer` buttons (hidden once they exist; they render above/below that page's body sections, with a "repeat on every page" hint) — if page 1 is deleted they move to whichever page is now first, and are never deleted with a page. With **more than one page** each panel header is a collapse toggle (chevron) plus a delete-page button; adding a page collapses the others and opens the new one. With one page it's a plain label, no chevron/delete. Collapsed panels are hidden with CSS, **not unmounted**, so unsaved editor state isn't lost. A page always has ≥ 1 section (`+ Page` creates a blank section; deleting a page deletes its sections one by one after `window.confirm`); gaps in `pageIndex` after a delete are harmless since pages are labelled by position. `DocumentPreview` renders **one paginated editor per page** (stacked, `Page i of n` labels, header/footer repeated, explicit page always starts a new sheet). **Known limitation:** `FullPageEditor` still composes all body sections into one continuous flow (sorted by page then order) — it has no forced break between pages, so it can differ from preview/download for pages that don't fill a sheet. `TemplateDetailPage`'s old preview just draws a dashed divider between pages.
- **Section headings render in the document (2026-09-19).** A body section with `titleVisibleInDocument` shows its `label` as a bold, normal-size paragraph above its body — in `DocumentPreview` (live, including the unsaved label typed in `SectionRow`, via `SectionBuilder`'s `drafts` map of `{html?, label?}`), in the backend `ExportAsync` (`BuildSectionHtml`), in `TemplateDetailPage`'s preview, and in `FullPageEditor`. In the full editor the heading is a `<p data-section-title>` (paragraph attribute registered in `SectionMarkerExtension`, `keepOnSplit: false`) that `decomposeHtmlToSections` strips on save, so the title is never written into a section's body HTML — edit titles via the section label in the builder. Header/footer never get a heading. `TemplateDetailPage` no longer has an "open full editor" button (only Download + Edit); the builder page keeps it. Preview page size is capped with `DocumentPreview`'s `maxScale` (0.42, builder column `lg:w-112`) so the page stays small and centered in the wider card.
- **Skeletons + detail preview (2026-09-19).** `components/template/TemplateEditorSkeleton.tsx` (title bar, toolbar rows, A4 sheet, field panel) is `TemplateEditorPage`'s loading state AND the `<Suspense>` fallback for its lazy chunk in `AppRoutes.tsx`; `TemplateDetailSkeleton.tsx` is the detail page's own — they are deliberately separate (different layouts), don't share one. `TemplateDetailPage`'s document preview is now `LazyDocumentPreview` (read-only, paginated, one editor per page, section titles) in a fixed `lg:w-136` column — the old hand-composed HTML preview is gone. The section→editor mapping is shared in `utilities/templateSections.ts#toEditorSections` (used by the editor page and the detail page). The builder's preview page size is two constants at the top of `TemplateFormPage.tsx` (`PREVIEW_MAX_SCALE` 0.34 / `PREVIEW_MAX_HEIGHT` 26rem) — tune them together (height ≈ 1123 × scale + padding so one page has no scrollbar).
- **Editor popup loading is two-phase (2026-09-19).** Constructing `FullPageEditor` (dozens of extensions) is one long synchronous block during which the browser can't paint, so a skeleton that only lived during the network fetch went skeleton → blank → editor. `TemplateEditorPage` now: (1) renders only `TemplateEditorSkeleton` once data arrives, (2) mounts the editor after a 60ms timer with the skeleton still overlaid (`fixed inset-0 z-50`), (3) removes the overlay when `FullPageEditor`'s `onReady` prop fires (one `requestAnimationFrame` after the editor exists). Keep that ordering if you touch it. Builder right column is now `lg:w-96` (left column flex-1) with `px-1.5` preview viewport padding.
- **Builder edit-mode skeleton + detail layout swap (2026-09-19).** `TemplateFormPage` in edit mode returns `components/template/TemplateBuilderSkeleton.tsx` while `!selected || selectedLoading` (a third separate skeleton — builder / detail / editor each have their own). Only fetch state gates it: section saves never toggle `selectedLoading`, so it can't unmount the builder and drop unsaved edits. `TemplateDetailPage` body is now: **left (wide, `flex-1`)** = Versions, then Review history; **right (`lg:w-100`, narrowed again on request so the left column gains width)** = Document preview, then the action buttons / reject box / review-interval card (unchanged, just moved with the preview), then Activity log. On small screens the right column comes first (`order-1 lg:order-2`). `TemplateDetailSkeleton` mirrors the swap.
- **Header full-screen toggle (2026-09-19).** `components/layout/Header.tsx` has an Expand/Exit button (bell-style, `Maximize`/`Minimize` icons, Tooltip) backed by `hooks/useFullscreen.ts` (Fullscreen API on `documentElement`). Its state comes from `document.fullscreenElement` via `useSyncExternalStore` + `fullscreenchange`, **not** local state: Esc exits full screen natively and can't be intercepted, so a local flag would go stale; the event keeps icon/tooltip in sync. Hidden where `document.fullscreenEnabled` is false (iPhone Safari). F11 (browser chrome full screen) isn't reflected — it's not the Fullscreen API.
- **Preview zoom, shared size, detail layout, rename (2026-09-19).** `DocumentPreview` has its own zoom (− / % / +, steps 50–300% as a multiplier on the fit-to-width scale; the % is relative to a real A4 sheet, click it to reset; the viewport scrolls both ways once zoomed past its size) — it applies to both previews (form page Live preview + detail page Document preview). Both use the same compact size from `components/template/previewSize.ts` (`PREVIEW_MAX_SCALE` 0.34 / `PREVIEW_MAX_HEIGHT` 26rem; tune together) — the constants no longer live in `TemplateFormPage.tsx`. `TemplateDetailPage` left column = Versions, then **Review history and Activity log side by side** (`xl:grid-cols-2`); right column = compact preview + actions. **`TemplateBuilderForm` was renamed `TemplateFormPage`** (`src/pages/TemplateFormPage.tsx`; `TemplateBuilderSkeleton` keeps its name) — older notes in this file were updated to the new name.
- **Preview card component + pan (2026-09-19).** Both template previews now render through one component, `components/template/TemplateDocumentPreviewCard.tsx` (Card + Suspense + title, props `title`/`subtitle`/`icon`/`sections`), which feeds `previewSize.ts`'s compact size (`PREVIEW_MAX_HEIGHT` 25rem) into the lazy `editor/DocumentPreview` engine — don't hand-roll a Card/Suspense around `LazyDocumentPreview` again. The card's title is passed as `DocumentPreview`'s `header` prop so it shares one row with the zoom buttons (saves a row of height). `DocumentPreview` supports drag-to-pan (mouse/pen pointer events on the viewport, `cursor-grab active:cursor-grabbing`, drag state in a ref; touch pans natively) — mainly for horizontal overflow when zoomed in. Viewport padding is `py-2`.
- **Field insert panel (`src/editor/FieldPanel.tsx`) look:** each field is a raised neumorphic button matching the header's notification bell (`shadow-neu-raised-sm`, pressed on hover/active); the list scrolls after ~5 rows (`max-h-84`, with padding/negative-margin so shadows aren't clipped). The builder's Live preview viewport is `78vh` tall so one A4 page fits without scrolling.
- **Lint gotchas fixed the same day:** (a) don't copy props/loaded data into state from an effect (`react-hooks/set-state-in-effect`) — derive it: `TemplateDetailPage`'s review-interval input stores only a `{forId, value}` draft and falls back to `selected.reviewInDays`; `FieldListPage` derives `templatesLoading` from `templatesLoadedFor !== selectedType.value` instead of a flag set in the fetch effect; `TemplateFormPage` no longer mirrors `selected.placeholderFormat`/`creationMode` into state (only the create form uses them). (b) `let ok: boolean;` not `let ok = false;` when every branch assigns before use (`no-useless-assignment`). (c) `npm run lint` at repo root can fail with a `tsconfigRootDir` "multiple candidate" parse error if a stray `.claude/worktrees/*` checkout exists (gitignored) — delete the leftover worktree, or lint with `npx eslint src`.
- **"Open in new tab" (list rows) is a real `window.open(url, "_blank")`**, not an in-page route push or
  modal — present as an `ExternalLink` icon button on both `TemplateListPage.tsx` row actions
  and `TemplateDetailPage.tsx`'s header, for both creation modes (`formBuilder` and `docxUpload`
  converge on the same `TemplateDto.sections[]` shape once a draft exists, so there's one
  affordance, not two). **Deliberately does NOT pass `"noopener,noreferrer"`** (fixed 2026-09-17,
  was passing it originally) — that severs the new tab's `window.opener` relationship, and per
  spec sessionStorage only copies into a new same-origin tab when an opener relationship exists
  (see this file's "Auth flow" section on why `auth` persists to sessionStorage, not
  localStorage). With `noopener` set, the new tab booted with empty sessionStorage and looked
  logged out even though the user was authenticated. Safe to drop here since the target URL is
  same-origin, internal, and not user-controlled (a numeric template id) — don't reintroduce
  `noopener`/`noreferrer` on these two call sites.
- **Field creation flow was previously broken and has been fixed.** The original `SectionRow`
  eagerly dispatched `upsertFieldThunk` the moment "+ Field" was clicked, with an
  auto-generated `fieldKey` (`field_${Date.now()}`) that could never match a placeholder token
  already present in the section's `defaultContentHtml` — the backend always rejected it with
  `FieldKeyNotFoundInSectionContentException`. Fixed: "+ Field" now opens a local-only draft
  row (`SectionRow`'s `newField` state, not dispatched anywhere) with its own fieldKey/label/type
  inputs and Add/Cancel buttons; `upsertFieldThunk` only fires once the admin has typed a
  `fieldKey` that (they're expected to) match a token already in the section's HTML, on
  clicking "Add". `FieldRow` (editing an already-persisted field) is unchanged.
- **Header/footer sections never render an editable title or "Lock title" checkbox.**
  `titleVisibleInDocument` is `false` for `sectionKind !== "section"` at creation time (title is
  never shown for header/footer), so editing/locking a title that's never displayed was
  meaningless UI. `SectionRow` now branches on `section.sectionKind === "section"`: only body
  sections get the editable label `Input` + "Lock title" `Checkbox`; header/footer render a
  fixed "Header"/"Footer" label and skip the checkbox entirely. `handleSave`'s payload still
  submits `isTitleLocked: false` unconditionally for header/footer regardless of any stale local
  state.
- **Unsaved-changes indicator on "Save section."** `SectionRow` derives `isDirty` via `useMemo`
  by comparing local `label`/`html`/`titleLocked`/`bodyLocked`/`required` state against the
  `section` prop's persisted values; the button label appends `" •"` when dirty. This is a
  visual hint only — no autosave was added, saving stays an explicit click per this project's
  existing convention.
- **`STATUS_LABEL` (uppercase status display text) now lives in `utilities/templateStatus.ts`**,
  shared by `TemplateListPage.tsx`'s status column and `TemplateDetailPage.tsx`'s header badge
  (previously that badge rendered the raw camelCase `status` string, e.g. `pendingApproval`,
  uncapitalized). `TemplateStatusStepper.tsx`'s own step labels are intentionally NOT driven by
  this map and stay title-case — this map is only for status text rendered outside the stepper.
- **`Download` and `GET /templates/{id}/download`**: a binary `.docx` response, so
  `templateService.downloadTemplate(id)` calls `api.get(url, { responseType: "blob" })` rather
  than going through the normal JSON-envelope flow every other `templateService` call uses — no
  thunk, since a one-off blob download has no state worth putting in the slice. The download
  button on `TemplateDetailPage.tsx`'s header (`Download` icon, next to "Open in new tab") reads
  a filename off the `Content-Disposition` response header when present (regex-parsed,
  `filename*=UTF-8''...` or plain `filename="..."`) and falls back to
  `{templateName}-{versionLabel}.docx` from `state.selected` otherwise, then triggers the save
  via a temporary `<a>` + `URL.createObjectURL`/`revokeObjectURL`.
- **Audit trail / activity log**: `types/template.ts#TemplateAuditLogEntryDto` (`{ id, action,
  oldValues, newValues, performedByUserId, performedAt }`) mirrors the confirmed real backend
  DTO — corrected 2026-09-17 from an earlier reasonable-guess shape (`{action, performedBy,
  performedAt, details}`) built in parallel before the backend's exact fields were known.
  **There is no resolved display name** — `AuditLog` only stores the raw acting user's id
  (identity is ESSP-resolved live elsewhere in this app, not locally joinable from an audit
  row), so `TemplateDetailPage.tsx`'s "Activity log" card renders `{entry.action} by User
  #{entry.performedByUserId}` rather than a name. `entry.newValues` (not a separate `details`
  field) is shown as the secondary line when present. Wired via `fetchTemplateAuditLogThunk` (`store/template/
  templateThunks.ts`) + `auditLog`/`auditLogLoading` state in the slice, dispatched alongside
  `fetchTemplateByIdThunk`/`fetchReviewHistoryThunk` on mount. Deliberately a separate card from
  "Review history" (which is `ReviewCycleDto[]`/`fetchReviewHistoryThunk` — a different backend
  concept, the review-cycle workflow, not a generic audit trail) — same list/empty-state
  rendering pattern, not merged into one card.
- **`DataTable.tsx`'s empty state is a general fix, not template-specific.** The component
  previously returned early on `data.length === 0` with only a centered icon+message block,
  which also dropped the `<thead>` and the pagination footer — so an empty result set (e.g. an
  empty Templates list) rendered with no header row at all. Fixed generally: the table/`<thead>`
  and pagination footer always render now; the empty state renders inside a single `<tr><td
  colSpan={columns.length}>` in `<tbody>` instead of replacing the whole table. This is a shared
  component used well beyond Template Governance — the fix applies everywhere `DataTable` is
  used, not just here.
- **"Back" button** (`ArrowLeft` icon + "Back" label, `navigate(-1)`) added near the top of
  `TemplateListPage.tsx`, `TemplateDetailPage.tsx`, and `TemplateFormPage.tsx` — plain
  neumorphic ghost-style button (`hover:shadow-neu-raised-sm`, no fixed pattern existed
  elsewhere in the codebase to match, so this established one; reuse it if a "Back" affordance
  is needed on a future page).
- `TemplateStatusStepper.tsx` (`components/template/`) is the shared color-coded workflow stepper —
  green/blue circles for the draft→pendingApproval→approved happy path, a red circle for
  `rejected` and a gray one for `deprecated` as terminal side-states (not forced onto the 3-step
  line). Used on `TemplateDetailPage.tsx`; extracted as its own component since Badge pills alone
  don't convey the workflow-progress shape the user asked for.
- Template metadata (name/type/department/reviewInDays/placeholderFormat) is treated as
  **immutable after draft creation** in this pass — `TemplateFormPage.tsx`'s top form only
  submits on `/templates/new`; editing an existing draft only touches sections/fields. The backend
  doesn't expose a "update template metadata" endpoint distinct from section/field upserts, so this
  wasn't a corner cut so much as matching what's actually there.
- **`src/pages/FieldListPage.tsx` (`/fields`, `idMenu=10727`)** — a standalone admin view over the
  `FieldsController` domain (`fieldService.ts`), separate from the section builder's inline field
  editing on `TemplateFormPage.tsx`. Flow: pick a Template Type (`Select`, options from
  `state.template.templateTypes` via the existing `fetchTemplateTypesThunk`) → pick a Template
  (`Select`, options from `templateService.list({ templateTypeId })`, refetched whenever the type
  changes, disabled until a type is picked) → once a template (version) is picked, its fields load
  via `fieldService.list({ templateVersionId: <selected id> })` and render as a list with a
  create-field form below. No redux slice for this page's own list/selection state — it's called
  directly from the component (`fieldService`/`templateService`), matching the existing
  `departmentService` precedent for reference-data lookups that don't need to be shared elsewhere.
  The placeholder-format shown on this page is read-only, sourced from the selected template's own
  `placeholderFormat` (`GET /templates/{id}` via `templateService.getById`) — placeholder format is
  a template-level setting, not a field-level one, so this page never lets it be edited, only
  displays it as guidance next to the create-field form.
- **`wrapPlaceholder` (`src/utilities/placeholder.ts`)** — the inverse of
  `extractPlaceholderKeys`/`PLACEHOLDER_REGEX` in `validations/templateValidation.ts`: given a
  `fieldKey` and a `TemplatePlaceholderFormat`, returns the ready-to-insert bracketed token (e.g.
  `wrapPlaceholder("invoiceNo", "doubleCurly")` → `"{{invoiceNo}}"`). Keep this in sync with
  `PLACEHOLDER_REGEX`'s bracket shapes if a new placeholder format is ever added — one file defines
  the shape, the other detects it.
- **`TemplateFormPage.tsx`'s `SectionRow` no longer has an inline field-creation form (fixed
  2026-09-18).** It briefly had both an old "+Field" mini-form (create a field bound to this one
  section, a leftover from before the `TemplateField` version-rescoping) AND the newer
  "insert existing field's placeholder at cursor" `Select` dropdown side by side — confusing and
  redundant with the dedicated `/fields` page. Removed entirely: `newField` state, the "+Field"
  button, `FieldRow`, and `section.fields`-based rendering (that data no longer means "fields bound
  to this section" post-rescoping — it was actually the *same* full per-version field list
  duplicated onto every section's DTO, so editing it from any one section's row was already
  misleading). `SectionRow` now only shows the insert-dropdown; all field create/edit/delete happens
  on `FieldListPage.tsx`. `handleSave`'s section-upsert payload now always sends `fields: []`
  (fields aren't submitted through a section save anymore).
- **`TemplateFieldDto.sectionId` was stale — fixed to `templateVersionId` (fixed 2026-09-18).** The
  backend's `TemplateField` entity/DTO were renamed from `SectionId` to `TemplateVersionId` in an
  earlier pass, but this frontend type wasn't updated to match — a real type/contract drift, not
  just unused. Caught by inspection, not a runtime symptom (nothing read the field), but fix it if
  you see `sectionId` referenced anywhere touching `TemplateFieldDto` again — it's wrong.
- **`TemplateTypeListPage.tsx` gained a Delete action (fixed 2026-09-18)** — it only had Edit before,
  even though `idMenu=10726` already grants `delete` to admins, so the button simply didn't exist
  to gate. Backend: `DELETE /TemplateTypes/{id}` (`[HasPermission("menu:10726:delete")]`,
  `ITemplateTypeService.DeleteAsync`) soft-deletes (`IsActive=false`) rather than a hard delete —
  `GenericRepository.GetAllAsync`'s existing `.Where(x => x.IsActive)` filter means a deleted type
  just stops appearing in the list, no special-casing needed elsewhere. Frontend:
  `templateTypeService.remove`/`deleteTemplateTypeThunk`, a plain `window.confirm(...)` before
  dispatching (no custom confirm-dialog component exists in this app yet — if one gets built later,
  swap this for it), gated `<Can idMenu={10726} action="delete">` on the row action.
- **`FieldListPage.tsx`'s create-field form now supports dropdown options** (fixed 2026-09-18) — it
  previously hardcoded `options: []` regardless of `fieldType`, so a `dropdown` field could never
  actually have any choices. Now shows a small add/remove option-row editor (label + value pairs)
  only when `fieldType === "dropdown"`, filters out any half-filled rows before submit. Both
  `TemplateFieldOptionDto`/`UpsertFieldOptionRequestDto` (backend-mirrored types, already existed)
  are genuinely needed — this isn't dead schema, it's the only way a dropdown-type field's choices
  get defined. Field key/label inputs also gained example placeholder text (`"e.g. customerName"`/
  `"e.g. Customer Name"`) — both were already validated as required (`handleCreateField`'s
  `.trim()` check), just lacked any hint at what to type.
- **`SectionHtmlEditor.tsx`'s `insertAtCursor` and the cursor-preservation gotcha.** The component
  is now `forwardRef<SectionHtmlEditorHandle, SectionHtmlEditorProps>` (composed as
  `memo(forwardRef(...))`, which does typecheck under this project's strict TS config — verified via
  `tsc -b --noEmit`) exposing `insertAtCursor(text: string): void` via `useImperativeHandle`, used
  by `TemplateFormPage.tsx`'s `SectionRow` to wire an "insert placeholder token" `Select`
  dropdown next to each section's editor (selecting a field calls `wrapPlaceholder(field.fieldKey,
  placeholderFormat)` then `editorRef.current.insertAtCursor(token)`; the `Select` is intentionally
  uncontrolled/always-reset to `null` since picking an option is a one-shot "insert and done" action,
  not a persisted value). **The real gotcha**: by the time a sibling control's `onChange` fires, the
  browser has already moved DOM focus off the contentEditable div, so `window.getSelection()` no
  longer reflects any position inside the editor — calling `execCommand('insertHTML', ...)` at that
  point would insert nowhere predictable (browser-dependent, often the start/end of the document
  rather than where the user's cursor actually was). Fixed by continuously capturing the editor's
  own `Range` on `onSelect`/`onKeyUp`/`onMouseUp`/`onBlur` into a `lastRangeRef` (cloned via
  `range.cloneRange()` so later DOM mutations don't invalidate it, and only accepted if it falls
  inside the editor's own DOM subtree), then `insertAtCursor` re-focuses the div, restores that
  saved range onto the live `Selection` before running `execCommand`, and falls back to inserting at
  the end of the content if no range was ever captured (should be rare — editor never
  focused/selected yet). Any future dropdown-inserts-into-editor feature in this codebase should
  follow this same capture-before-blur/restore-before-insert pattern rather than reading
  `window.getSelection()` fresh at insert time.
- **`components/template/TemplateDetailSkeleton.tsx`** replaced `TemplateDetailPage.tsx`'s old
  full-page `Loader2`-spinner loading branch (`if (selectedLoading || !selected) { ... }`). Built
  from `animate-pulse` blocks on `bg-surface-200` (this app's neumorphic surface token, not
  `bg-gray-200`) wrapped in the same `Card` components the loaded page uses, matching real card
  positions/proportions (header title+subtitle+badge/icon-buttons, the 3-circle status stepper, the
  A4-proportioned document-preview card, and the versions/review-history/activity-log sidebar cards)
  closely enough that the loading→loaded transition doesn't visibly jump. A spinner-only loading
  state looks worse than no spinner once a skeleton this close to the real layout exists — prefer
  this pattern (a dedicated `*Skeleton.tsx` component per detail/heavy page, not a generic spinner)
  for any future page with a similarly complex loaded layout.
- **`TemplatePlaceholderFormat` gained two members (2026-09-18)**: `"singleCurly"` (`{x}`) and
  `"parentheses"` (`(x)`), alongside the original `doubleCurly`/`doubleSquare`/`singleSquare` —
  mirrors `InnerEye.DMS.Foundation/Enums/TemplatePlaceholderFormat.cs`'s now-5-member enum.
- **Field endpoints were rescoped off sections onto the template version (2026-09-18)** — the
  backend's `TemplatesController` field routes are now `POST /Templates/{id}/fields` and
  `DELETE /Templates/{id}/fields/{fieldId}` (no `sectionId` route segment; a field still carries
  its owning `sectionId` as data on `TemplateFieldDto`, just not as a URL param anymore).
  `endpoint.ts`'s `templates.fields`/`templates.fieldById` were updated to match, and
  `templateService.ts`'s `upsertField`/`deleteField` (called from `templateThunks.ts`'s
  `upsertFieldThunk`/`deleteFieldThunk`, and in turn `TemplateFormPage.tsx`'s `SectionRow`/
  `FieldRow`) dropped their `sectionId` parameter entirely — `FieldRow` no longer takes a
  `sectionId` prop at all, since nothing downstream needs it anymore.
- **`src/pages/TemplateTypeListPage.tsx` (new, route `/template-types`, `<MenuGuard>`-wrapped)**
  is a small CRUD page for `TemplateTypeDto` reference data, backed by the new `FieldsController`-
  adjacent `TemplateTypesController` create/update routes (`POST`/`PUT /templatetypes[/{id}]`,
  `templateTypeService.ts`'s `create`/`update`). **`idMenu=10726`** gates it (a *different* menu
  id from `724` — Template Types is its own menu-governed submodule, not folded into Template
  Governance's `724`), `action="create"`/`"edit"` per the same real-CRUD-only convention as the
  `724` bullet above (no custom action strings). Uses `DataTable`/`Card noPadding`/the established
  `ArrowLeft` "Back" button pattern; create/edit is one inline `Card` form (not a separate route)
  since this is small reference data, with `Checkbox` for the two `allowedCreationModes` flags
  combined client-side into the backend's comma-joined `[Flags]`-string shape (`"formBuilder,
  docxUpload"` when both are checked) — see `combineCreationModes` in that file. New thunks
  `createTemplateTypeThunk`/`updateTemplateTypeThunk` (`templateThunks.ts`) and a
  `savingTemplateType` slice flag (separate from the module-wide `saving` flag, since template-type
  saves are unrelated to a selected template's own save state) back it; `fetchTemplateTypesThunk`
  already existed (shared with `TemplateFormPage.tsx`'s type picker) and was reused as-is.
- **`src/services/fieldService.ts` (new)** — raw HTTP calls for the standalone `FieldsController`
  (`GET /Fields?templateVersionId=`, `POST /Fields`, `PUT /Fields/{id}`, `DELETE /Fields/{id}`,
  gated `menu:10727:*` on the backend). **Not yet wired into any page or thunk** — this task only
  added the service; a dedicated Fields management page/thunks and the cursor-insert-placeholder
  feature are separate follow-up work. `UpsertFieldRequestDto` (`types/template.ts`) gained an
  optional `templateVersionId?: number | null` to match the backend DTO addition — only meaningful
  for this standalone route; the nested `Templates/{id}/fields` route (`templateService.ts`)
  ignores it and derives the version from its own route param.

### Realtime notifications

Backend contract: `NotificationsController` (`api/v1/dms/Notifications`, `[Authorize]`) — `GET /` (feed, `page`/`pageSize`/`unreadOnly`/`search`/`type` query params, `BaseResponse<PagedResultDto<NotificationListItemDto>>`), `GET /unread-count`, `POST /{id}/read`, `POST /read-all`, `POST /{id}/open` (marks read + returns the deep link to navigate to). `{id}` in every one of these is `NotificationRecipient.Id` (the feed row's own `id` field) — **not** `notificationId`. Realtime transport is a SignalR hub at `/hubs/notifications` (origin root, not under the `/api/v1/dms` base — `endpoint.ts`'s `API_ORIGIN` derives this), authenticated via `accessTokenFactory` (browsers can't set headers on the WS upgrade, so the backend reads the JWT off an `access_token` query-string param instead). The hub has no client-invokable methods — it's push-only, one event: `"notification:new"`.

`NotificationType` (`types/notification.ts`) mirrors the backend enum of the same name — `general | approval | workflow | reminder | system`. It's a starting set (backend doc comment: "extend it as real notification templates are categorized") — adding a member means updating it in exactly two places: this TS union and `components/notifications/notificationTypeMeta.ts`'s `NOTIFICATION_TYPE_META` (icon + color per type). Backend enums here are serialized via `JsonStringEnumConverter(JsonNamingPolicy.CamelCase, false)`, so a C# `NotificationType.General` reaches the wire as `"general"`, lowercased — the TS union values must stay lowercase to match, unlike `ErrorCode` elsewhere which is a plain `string`.

`services/notificationHub.ts` holds the SignalR connection as module-scoped state (`startNotificationHub`/`stopNotificationHub`/`onNewNotification`) — same rationale as `axiosInstance.ts`'s `accessToken`/`tenantId`: importing the redux store here to gate on `isAuthenticated` would risk the same import cycle documented there. `hooks/useNotificationRealtime.ts` is the one place that owns the connection's lifecycle (start/stop keyed on `state.auth.isAuthenticated`, mounted once in `AppLayout.tsx` — not per-component, so there's exactly one connection regardless of how many components care about notifications) and shows the realtime toast on `"notification:new"`. That push payload (`RealtimeNotificationPayload`) carries `Notification.Id`, not the recipient id the REST mark-read/open calls need — don't try to splice it directly into `NotificationListItem` state; the hook just refetches the unread count and lets the bell/page's own fetches pick up the new row next time they run.

`store/notification/` (not persisted, like `menu`) holds `dropdownItems` (bell, top 20), `feed` (`/notifications` page, 30/page infinite scroll with `hasMore`/`page`/`filters`), and `unreadCount`. Mark-read/mark-all-read are optimistic: `notificationSlice.ts`'s `markReadLocally`/`markAllReadLocally` reducers are dispatched by the component *before* `markReadThunk`/`markAllReadThunk` fire, so the UI updates instantly; on failure the thunk's catch block just dispatches `fetchUnreadCountThunk()` to resync rather than trying to precisely roll back the optimistic flag (a notification that visually reads "read" but didn't quite persist server-side is a low-stakes, rare edge case — not worth the extra reducer complexity).

`components/notifications/NotificationRow.tsx` is the single row renderer shared by the bell dropdown (`dense` prop) and the notifications page — has a deep-link icon only when `item.deepLink` is set (clicking the row then calls `onOpen`, which navigates and marks read via the `/open` endpoint), plus an explicit "mark read" checkmark for any unread row so a notification can be dismissed without necessarily following its link.

### Toasts

`src/utilities/toast.ts` wraps `react-toastify` — call `toast.success(...)`, `toast.error(...)`, `toast.warning(...)`, `toast.info(...)` from anywhere rather than importing `react-toastify` directly. `TOAST_CONTAINER_CONFIG` in that file is the single place to change position/timing/theme; it's spread onto `<ToastContainer>` in `App.tsx`. Uses react-toastify's own default rendering (`theme: "colored"`) — a custom-styled toast content component was tried and reverted because it didn't size correctly for short messages.

### Fonts

IBM Plex Sans, self-hosted via `@fontsource/ibm-plex-sans` (not a Google Fonts `<link>`/CDN — no runtime external request, works offline, no FOUC). Only 4 weight `.css` files are imported in `main.tsx` (`200`, `400`, `600`, `700`) — importing the bare package would pull in every weight unnecessarily. **IBM Plex Sans has no 800/ExtraBold weight** (it only ships 100–700); 700/Bold is the heaviest actually available, used in place of 800 everywhere in this codebase — don't add an `800.css` import, it doesn't exist and breaks the build.

`index.css`'s `@theme` sets `--font-sans` to `"IBM Plex Sans", system-ui, sans-serif`, overriding Tailwind's default stack, so plain `font-sans` (and anything that falls back to it, like `body`'s `font-family: var(--font-sans)`) already renders in it globally — no need to opt in per element for normal body text.

`components/ui/Text.tsx` exports `IBMPlexSans200`/`400`/`600`/`700` — small wrapper components (`as` prop for which tag, default `span`) for when a specific weight needs to be explicit/reusable rather than reached for as a raw `font-semibold` etc. utility class inline. Both are valid; the named components exist for call sites where the *semantic* weight matters enough to name it.

**Convention: every rendered text node wraps in one of these, instead of a `font-*` weight utility class.** Applied throughout `Header.tsx`, `Sidebar.tsx`, `Select.tsx`/`AsyncSelect.tsx` (label/error), `EmptyState.tsx`, `Checkbox.tsx`, and every page. Rough weight mapping used when retrofitting: former `font-bold` → `IBMPlexSans700` (page `<h1>` titles), former `font-semibold`/`font-medium` → `IBMPlexSans600` (card `<h3>` titles, nav links, form labels, emphasized text — there's no loaded 500 weight, so `font-medium` call sites collapse to 600 rather than rendering unloaded-weight fallback), no weight class → `IBMPlexSans400` (plain body/help/error text). When adding new UI, wrap new text the same way rather than reaching for a `font-*` class — keep the `className` prop for layout/color only (e.g. `text-sm text-gray-700`), never for weight.

**A few text sources are NOT wrapped, and that's correct, not an oversight**: strings passed to `react-select` as plain-string props (`placeholder`, `noOptionsMessage`, `loadingMessage`) aren't JSX children we control — react-select renders them internally, but they still inherit IBM Plex Sans automatically via CSS `font-family` inheritance from `body`, so there's nothing broken, just nothing to wrap. Same for any other library-rendered string prop.

`components/ui/Checkbox.tsx` — custom-styled, not a native `<input type="checkbox">` visually. Keeps a real checkbox input (`sr-only`, marked `peer`) driving a styled sibling box + animated `Check` icon via Tailwind `peer-*` variants, so it stays fully keyboard/screen-reader accessible and is a drop-in for `register(...)` (forwards its ref) same as a native input would be. Use it instead of a raw `<input type="checkbox">` anywhere in the app; see `SettingsPage.tsx`'s permission flags for the pattern.

### Dropdowns & tooltips

`react-select` powers both dropdown components — `components/ui/Select.tsx` (static `options` array) and `components/ui/AsyncSelect.tsx` (API-backed, takes `loadOptions`). Both are generic over the option shape and share one style config: `components/ui/selectStyles.ts#buildSelectStyles` is the single place to change how every dropdown looks (colors reference `@theme` CSS vars like `var(--color-primary-500)`, so they re-theme with the color preset same as Tailwind utilities do). The chevron/loading-indicator overrides live separately in `components/ui/SelectIndicators.tsx` — kept out of `selectStyles.ts` deliberately, since mixing a plain function export with component exports in one file breaks Fast Refresh (`react-refresh/only-export-components`).

`components/ui/AsyncPaginateSelect.tsx` (wraps `react-select-async-paginate`'s `AsyncPaginate`) is the "load more on scroll" counterpart to `AsyncSelect.tsx`, for reference-data lists too large to fetch in one call — reuse this pattern for any future menu/dropdown that needs pagination rather than reinventing it. Same `buildSelectStyles`/`SelectIndicators`/label-error conventions as `AsyncSelect.tsx`. Its `loadPageOptions` prop matches the library's own `LoadOptions` shape — `(search, loadedOptions, additional) => Promise<{ options, hasMore, additional }>` — where `additional.page` tracks the next page to fetch and `hasMore` is derived by comparing the running loaded-item count against the backend's total. First consumer: the Department picker in `TemplateFormPage.tsx` (see below).

### Departments (reference data)

`GET /api/v1/dms/Departments?search=&page=&pageSize=` (`[Authorize]` only) returns `BaseResponseDto<List<DepartmentDto>>` plus an `X-Total-Count` response header — `src/services/departmentService.ts#listDepartments` reads that header the same way `templateService.ts`'s `list` does, returning `{ items, totalCount }`. `src/types/department.ts#DepartmentDto` mirrors the backend 1:1: `departmentId`, `departmentName`, `deptCode` (nullable). No redux slice — it's paged/searched reference data consumed directly by `AsyncPaginateSelect`'s `loadPageOptions`, not something to hold in app state.

`TemplateFormPage.tsx`'s Department field is one `AsyncPaginateSelect` bound via `Controller` to a single `department: { value: number; label: string } | null` RHF field (replacing the old separate `departmentId` number input + `departmentName` text input) — `departmentId`/`departmentName` are extracted from `department.value`/`department.label` at submit time to populate `CreateTemplateDraftRequestDto`/`CreateTemplateDraftFormRequestDto` (those DTOs still carry the two separate fields; only the form's own RHF shape changed). `templateDraftSchema` (`validations/templateValidation.ts`) validates `department` as a required `{ value, label }` object instead of two separate required primitives. Template Type in the same form also now goes through `Select.tsx` via `Controller` instead of a raw HTML `<select>`, for consistency with every other dropdown in the app.

`components/ui/Tooltip.tsx` renders via `createPortal(..., document.body)` with inline styles (not Tailwind classes) for its colors, since portaled content can lose Tailwind's cascade context — same `@theme` var references as the selects for the `success`/`error`/`warning`/`info` variants. Use it to reveal full text wherever something is truncated (`truncate`, `line-clamp-*`) so a value is never permanently hidden.

**Tooltip replaces native `title=` on every icon-only button** (done 2026-09-19: `TemplateDetailPage`, `TemplateListPage`, `TemplateTypeListPage`, `FieldListPage`, `NotificationRow`) — wrap the `<button>` in `<Tooltip content="...">` and give the button an `aria-label` (a native `title` would double up with the custom tooltip). Positioning is measured in `useLayoutEffect` (no flash at 0,0), auto-flips only when the opposite side actually has room, clamps to the viewport on both axes, re-aims the arrow at the trigger when the body slides sideways, recomputes on scroll (capture, so inner scroll containers count)/resize, hides on click, and caps `maxWidth` to `100vw - 16px` for phones. The arrow is a rotated 8px square centered ON the tooltip's edge (`top`/`bottom`/`left`/`right: 0` + `translate(-50%,-50%) rotate(45deg)`) so half is hidden inside the body and it reads as a caret — offsetting it -4px instead leaves a detached diamond (fixed 2026-09-19). The wrapper is an `inline-block` span, so pass layout classes like `ml-auto` via `Tooltip`'s `className`, not the button's. Use `placement="bottom"` for buttons in a page header near the top edge. When adding a new icon button, do the same rather than reaching for `title=`.

### Forms

Forms use `react-hook-form` + `@hookform/resolvers/yup` with schemas in `src/validations/`. See `LoginPage.tsx` / `validations/authValidation.ts` for the pattern: `useForm<T>({ resolver: yupResolver(schema) })`, `register(...)` spread onto `Input`, `formState.errors` fed to `Input`'s `error` prop.

`components/ui/PasswordInput.tsx` is the drop-in for `Input.tsx` on any password field — same `label`/`error` props and `register(...)`-spreadable (forwards its ref), plus a `lucide-react` `Eye`/`EyeOff` toggle button that flips the underlying `<input>` between `type="password"`/`type="text"`. Visibility state is local to the component (`useState`), not lifted or persisted. Use it instead of `Input` with `type="password"` anywhere in the app — see `LoginPage.tsx` for the pattern.

### State

Redux Toolkit, one slice per domain under `src/store/<domain>/`. Use the typed `useAppDispatch`/`useAppSelector` from `src/store/hooks.ts`, never the bare `react-redux` hooks.

### Component memoization

Every component (function component in `src/components/`, `src/pages/`, etc.) must be wrapped with `React.memo`. Any function passed as a prop or used as a dependency (event handlers, callbacks passed to children) must be wrapped with `useCallback`, and any derived/computed value must be wrapped with `useMemo` — both with a correct, complete dependency array. Apply this to new components as they're written, and when touching an existing component for other reasons.

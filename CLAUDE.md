# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

### Bearer token & tenant header

`services/axiosInstance.ts`'s request interceptor attaches both `Authorization: Bearer <token>` and `X-Tenant-Id` to every outgoing request automatically — no per-service wiring needed. Both live as module-scoped variables in that file (`accessToken`/`tenantId`, set via `setAccessToken`/`setTenantId`, read via `getAccessToken`/`getTenantId`, cleared via `clearAccessToken`/`clearTenantId`), the same pattern for both. **Deliberately not read from the redux store** — `axiosInstance.ts` importing `store.ts` would create a circular import (`store.ts` → `authSlice.ts` → `authThunks.ts` → `authService.ts` → `axiosInstance.ts` → `store.ts`). `authThunks.ts`'s `fetchCurrentUser` (shared by `loginThunk` and `initAuthThunk`) calls `setTenantId(user.tenantId)` right alongside `setAccessToken`; `logoutThunk` and both thunks' failure paths call `clearTenantId()` alongside `clearAccessToken()`. When adding a new call site that resolves the current user outside `authThunks.ts`, mirror this — don't reach for `state.auth.user.tenantId` from within `axiosInstance.ts`.

The Settings page's "Assign Menu Permission" card calls `POST /menus/permissions` (`assignMenuPermissionThunk`) using the full menu catalogue from `GET /menus` (`fetchAllMenusThunk` → `state.menu.allMenus`, `Select`) and the role list from `GET /roles` (`AsyncSelect`, see below) to populate its two pickers. Deliberately **not** `GET /menus/permissions/me` — that's scoped to the logged-in user's own visible menus, which is wrong for an admin screen assigning permissions to *other* roles; `allMenus` is the unscoped catalogue. The `menu` redux slice (`modules`, `allMenus`, `permissions`) is **not** persisted (not in `store.ts`'s `whitelist`) — it refetches fresh every session, unlike `auth`.

Once both Role and Menu are picked, the form calls `GET /menus/{idMenu}/permissions/{idRole}` (`menuService.getRolePermission`) and pre-checks the CRUD checkboxes with whatever permission already exists for that pair (a `useWatch` + `useEffect` in `SettingsPage.tsx`, cancels itself via a `cancelled` flag if the role/menu selection changes again before the request resolves). This is so `POST /menus/permissions` — an upsert that replaces the full flag set — always submits the existing flags plus whatever the admin actually changed, instead of silently wiping out the unrelated ones back to `false`. No matching row (a brand-new role/menu pair) just leaves the checkboxes as the admin left them.

`GET /roles` (`services/roleService.ts`, `types/role.ts`) has no server-side search param, so `roleService.searchRoles(inputValue)` fetches the full list once and filters client-side per keystroke thereafter — debounced (`lodash/debounce`, 350ms) and cancellable (`AbortController`, aborts any still-in-flight request when a newer keystroke supersedes it) so a fast typist can't fire overlapping `/roles` requests. `SettingsPage.tsx`'s role `AsyncSelect` just calls it directly as `loadOptions`. If the backend ever adds a real `?search=` param, only `searchRoles`'s internals need to change — every caller stays the same.

**Don't move that cache/debounce/abort state into a component (`useRef`/`useMemo`) — it lives at module scope in `roleService.ts` on purpose.** This project's ESLint config includes React Compiler's `react-hooks/refs` rule, which flags a ref read from inside a closure captured by `useMemo`/`useRef` (like a debounced async callback) as an unprovable "may read ref during render," even when it plainly can't happen. Module-level state sidesteps the rule entirely and is arguably the more correct home for it anyway — it's shared reference data (all roles), not something scoped to one component instance.

The assign-permission form binds `react-select`'s option objects (`{ value, label }`) directly as `react-hook-form` field values via `Controller` (not the raw `idRole`/`idMenu` numbers) — the numeric IDs are only extracted from `field.value.value` at submit time, right before building the `AssignMenuPermissionRequest` payload. This sidesteps fighting yup's typings for nested option-object schemas; the form uses `Controller`'s own `rules={{ required }}` instead of a yup resolver.

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

`components/ui/Tooltip.tsx` renders via `createPortal(..., document.body)` with inline styles (not Tailwind classes) for its colors, since portaled content can lose Tailwind's cascade context — same `@theme` var references as the selects for the `success`/`error`/`warning`/`info` variants. Use it to reveal full text wherever something is truncated (`truncate`, `line-clamp-*`) so a value is never permanently hidden.

### Forms

Forms use `react-hook-form` + `@hookform/resolvers/yup` with schemas in `src/validations/`. See `LoginPage.tsx` / `validations/authValidation.ts` for the pattern: `useForm<T>({ resolver: yupResolver(schema) })`, `register(...)` spread onto `Input`, `formState.errors` fed to `Input`'s `error` prop.

`components/ui/PasswordInput.tsx` is the drop-in for `Input.tsx` on any password field — same `label`/`error` props and `register(...)`-spreadable (forwards its ref), plus a `lucide-react` `Eye`/`EyeOff` toggle button that flips the underlying `<input>` between `type="password"`/`type="text"`. Visibility state is local to the component (`useState`), not lifted or persisted. Use it instead of `Input` with `type="password"` anywhere in the app — see `LoginPage.tsx` for the pattern.

### State

Redux Toolkit, one slice per domain under `src/store/<domain>/`. Use the typed `useAppDispatch`/`useAppSelector` from `src/store/hooks.ts`, never the bare `react-redux` hooks.

### Component memoization

Every component (function component in `src/components/`, `src/pages/`, etc.) must be wrapped with `React.memo`. Any function passed as a prop or used as a dependency (event handlers, callbacks passed to children) must be wrapped with `useCallback`, and any derived/computed value must be wrapped with `useMemo` — both with a correct, complete dependency array. Apply this to new components as they're written, and when touching an existing component for other reasons.

# AGENTS.md

This file is for Antigravity (and any other AGENTS.md-reading agent) working in this repository.
It is a pointer + quick-reference, not a fork — **`CLAUDE.md` in this same directory is the single
source of truth** for this project's conventions. Read `CLAUDE.md` in full before making any
non-trivial change; don't rely on the summary below alone once you're past a first orientation
pass, since `CLAUDE.md` is updated more often and in more depth than this file.

**Keep this file current, alongside `CLAUDE.md`.** Whenever a change updates `CLAUDE.md` (a new
convention, a gotcha, a changed architectural decision), mirror the same update here in the same
turn if it changes something in the summary below. If it doesn't affect anything summarized here,
no edit is needed — this file intentionally stays a condensed pointer, not a full duplicate.

## Project

InnerEye DMS — Document Management System frontend. React 18 + TypeScript, Vite, Tailwind CSS v4.
Talks to an ASP.NET Core backend (`InnerEye.DMS.Api`, separate repo) whose DTOs are mirrored 1:1
in `src/types/`.

## Commands

```bash
npm run dev         # start Vite dev server
npm run build        # tsc -b (project references build) && vite build — the real type-check gate
npm run typecheck     # tsc -b --noEmit — must be run this way (plain `tsc --noEmit` checks nothing here)
npm run lint          # eslint .
```

Run `typecheck`, `lint`, and `build` after any non-trivial change — treat all three as required,
not optional, before considering a change finished. There is no test runner configured yet.

## Non-negotiable conventions (see `CLAUDE.md` for the full reasoning behind each)

- **Every function component wrapped in `React.memo`.** Every callback passed as a prop wrapped
  in `useCallback`; every derived/computed value wrapped in `useMemo`. Correct, complete
  dependency arrays — not `// eslint-disable` around a missing one.
- **Service/thunk split**: raw HTTP calls only in `src/services/*Service.ts`. Redux thunks
  (`src/store/<domain>/<domain>Thunks.ts`) orchestrate — call the service, dispatch. Never call
  `axios` directly from a thunk or component.
- **State**: Redux Toolkit, one slice per domain under `src/store/<domain>/`. Always the typed
  `useAppDispatch`/`useAppSelector` from `src/store/hooks.ts` — never the bare `react-redux` hooks.
- **Styling is neumorphic ("soft UI")**: surfaces are distinguished by shadow depth
  (`shadow-neu-raised*`/`shadow-neu-pressed*`, `src/index.css`'s `@theme`), not borders or flat
  color blocks. `--color-surface-100` is the one background every surface shares. Don't introduce
  `border`/flat-card patterns — use `components/ui/Card.tsx`.
- **Tailwind v4, CSS-first — no `tailwind.config.js`.** Theme tokens live in `src/index.css`'s
  `@theme { }` block. Custom theme colors *must* be declared inside `@theme`, not a plain `:root`
  block, or no utility class gets generated for them. Any custom global CSS must be wrapped in
  `@layer base { }` (unlayered CSS silently beats every Tailwind utility regardless of specificity).
- **Every rendered text node** wraps in one of `components/ui/Text.tsx`'s `IBMPlexSans200/400/600/700`
  (weight as a named component, not a `font-*` utility class) — keep `className` for layout/color only.
- **Fluid `clamp()` text sizing is opt-in, not default.** Only for a reproduced overflow on
  large/heading text in a width-constrained container (`--text-fluid-*` tokens in `@theme`). Don't
  reach for it as a general replacement for `text-sm`/`text-lg`/etc.
- **Backend contract mirroring**: `src/types/*.ts` interfaces mirror backend C# DTOs field-for-field
  (see each interface's doc comment for which DTO it mirrors). When a backend DTO changes, update
  the matching TS interface — don't loosen the type to paper over a mismatch.
- **Endpoints** live in one place, `src/utilities/endpoint.ts`. Path segments match the backend's
  PascalCase controller route casing exactly (`/Auth/...`, `/Menus/...`), not lowercase REST convention.
- **Auth is session-scoped, not "stay signed in forever"**: the `auth` slice persists to
  `sessionStorage`, never `localStorage` — this is deliberate (mirrors the backend's session-only
  refresh cookie). Don't switch it.
- **Menu-scoped permissions** (`"menu:{idMenu}:{action}"` claims) gate both the sidebar
  (`Sidebar.tsx`) and routing (`routes/MenuGuard.tsx`) — any new authenticated route must be
  wrapped in `<MenuGuard>` in `AppRoutes.tsx`, and any new per-menu action button should use
  `components/auth/Can.tsx` rather than a one-off permission check.
- **ASP.NET Core backend does not hot-reload.** If a backend change "isn't taking effect" or
  behaves "intermittently," the API process almost certainly needs a manual restart — this is not
  a frontend bug to chase.

## Where to look next

- Full architecture, the reasoning behind every convention above, and everything not summarized
  here (realtime notifications, i18n, forms, dropdowns/tooltips, fonts, routing, error/offline
  pages, per-user AppSettings): **`CLAUDE.md`**.
- Backend conventions (layering, DI, migrations, error codes): `D:\DMSBackend\CLAUDE.md` (separate repo).

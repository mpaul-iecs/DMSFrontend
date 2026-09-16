import { memo, useCallback, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import useNotificationRealtime from "../../hooks/useNotificationRealtime";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchAllMenusThunk, fetchMyMenuThunk } from "../../store/menu/menuThunks";
import Loader from "../ui/Loader";

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useNotificationRealtime();

  const dispatch = useAppDispatch();
  const menuFetched = useAppSelector((s) => s.menu.fetched);
  const allMenusFetched = useAppSelector((s) => s.menu.allMenusFetched);

  // Single owner of both fetches — Sidebar and MenuGuard (via AppRoutes.tsx) both just read
  // state.menu, neither dispatches it, so there's exactly one GET /menus/me and one
  // GET /menus per session. Both are needed: `modules` (permission-filtered) for what
  // Sidebar shows, `allMenus` (the full unfiltered catalogue) for MenuGuard to tell "not
  // part of the menu system" apart from "filtered out, no permission" — see MenuGuard.tsx.
  useEffect(() => {
    dispatch(fetchMyMenuThunk());
    dispatch(fetchAllMenusThunk());
  }, [dispatch]);

  const handleSidebarClose = useCallback(() => setSidebarOpen(false), []);
  const handleMenuClick = useCallback(() => setSidebarOpen(true), []);

  return (
    <div className="min-h-screen bg-surface-100">
      <Sidebar open={sidebarOpen} onClose={handleSidebarClose} />
      <div className="lg:ml-64">
        <Header onMenuClick={handleMenuClick} />
        <main className="p-4 lg:p-6 max-w-7xl mx-auto">
          {/* Gated on both `fetched` flags, not `loading`: MenuGuard (wrapping each route
              below) decides whether the user may view the current page based on
              state.menu.modules + allMenus, so that decision must never run against a still-
              empty pre-fetch menu tree — that would briefly render a page the user has no
              permission for. */}
          {menuFetched && allMenusFetched ? <Outlet /> : <Loader />}
        </main>
      </div>
    </div>
  );
}

export default memo(AppLayout);

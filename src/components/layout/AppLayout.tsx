import { memo, useCallback, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import useNotificationRealtime from "../../hooks/useNotificationRealtime";

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useNotificationRealtime();

  const handleSidebarClose = useCallback(() => setSidebarOpen(false), []);
  const handleMenuClick = useCallback(() => setSidebarOpen(true), []);

  return (
    <div className="min-h-screen bg-surface-100">
      <Sidebar open={sidebarOpen} onClose={handleSidebarClose} />
      <div className="lg:ml-64">
        <Header onMenuClick={handleMenuClick} />
        <main className="p-4 lg:p-6 max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default memo(AppLayout);

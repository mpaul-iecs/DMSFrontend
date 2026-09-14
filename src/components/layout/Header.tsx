import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Bell, ChevronDown, UserCircle2, Settings, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import useAuth from "../../hooks/useAuth";
import useClickOutside from "../../hooks/useClickOutside";
import { logoutThunk } from "../../store/auth/authThunks";
import { useAppDispatch } from "../../store/hooks";

interface HeaderProps {
  onMenuClick: () => void;
  notificationCount?: number;
}

export default function Header({ onMenuClick, notificationCount = 0 }: HeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, () => setMenuOpen(false));

  const initials = (user?.userName?.[0] || "?").toUpperCase();
  const badgeLabel = notificationCount > 9 ? "9+" : String(notificationCount);

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
      <button onClick={onMenuClick} className="p-2 rounded-lg hover:bg-gray-100 lg:hidden">
        <Menu className="w-5 h-5 text-gray-600" />
      </button>
      <div className="hidden lg:block" />

      <div className="flex items-center gap-3">
        <button className="p-2 rounded-lg hover:bg-gray-100 relative" aria-label="Notifications">
          <Bell className="w-5 h-5 text-gray-500" />
          {notificationCount > 0 && (
            <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-danger-500 text-white text-[10px] font-semibold flex items-center justify-center leading-none">
              {badgeLabel}
            </span>
          )}
        </button>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2.5 pl-3 border-l border-gray-200"
          >
            <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-semibold">
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-gray-800 leading-tight">{user?.userName}</p>
              <p className="text-xs text-gray-400">{user?.roles?.[0] || "User"}</p>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg border border-gray-200 shadow-lg py-1.5 z-40">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/profile");
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                <UserCircle2 className="w-4 h-4" />
                {t("nav.profile")}
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/settings");
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                <Settings className="w-4 h-4" />
                {t("nav.settings")}
              </button>
              <div className="my-1.5 border-t border-gray-100" />
              <button
                onClick={() => {
                  setMenuOpen(false);
                  dispatch(logoutThunk());
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
                {t("nav.logout")}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

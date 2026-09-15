import { memo, useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, ChevronDown, UserCircle2, Settings, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import useAuth from "../../hooks/useAuth";
import useClickOutside from "../../hooks/useClickOutside";
import { logoutThunk } from "../../store/auth/authThunks";
import { useAppDispatch } from "../../store/hooks";
import NotificationBell from "../notifications/NotificationBell";
import { IBMPlexSans400, IBMPlexSans600 } from "../ui/Text";

interface HeaderProps {
  onMenuClick: () => void;
}

function Header({ onMenuClick }: HeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  useClickOutside(menuRef, closeMenu);

  const toggleMenu = useCallback(() => setMenuOpen((v) => !v), []);

  const goToProfile = useCallback(() => {
    setMenuOpen(false);
    navigate("/profile");
  }, [navigate]);

  const goToSettings = useCallback(() => {
    setMenuOpen(false);
    navigate("/settings");
  }, [navigate]);

  const handleLogout = useCallback(() => {
    setMenuOpen(false);
    dispatch(logoutThunk());
  }, [dispatch]);

  const initials = useMemo(() => (user?.userName?.[0] || "?").toUpperCase(), [user?.userName]);

  return (
    <header className="sticky top-0 z-30 h-20 bg-surface-100 shadow-neu-header flex items-center justify-between px-4 lg:px-6">
      <button onClick={onMenuClick} className="p-2 rounded-xl hover:shadow-neu-raised-sm transition-shadow lg:hidden">
        <Menu className="w-5 h-5 text-gray-600" />
      </button>
      <div className="hidden lg:block" />

      <div className="flex items-center gap-3">
        <NotificationBell />

        <div className="relative" ref={menuRef}>
          <button onClick={toggleMenu} className="flex items-center gap-2.5 pl-3">
            <div className="w-8 h-8 rounded-full bg-linear-to-br from-primary-500 to-primary-700 shadow-neu-raised-sm flex items-center justify-center text-white text-sm">
              <IBMPlexSans600>{initials}</IBMPlexSans600>
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm text-gray-800 leading-tight">
                <IBMPlexSans600>{user?.userName}</IBMPlexSans600>
              </p>
              <p className="text-xs text-gray-400">
                <IBMPlexSans400>{user?.roles?.[0] || "User"}</IBMPlexSans400>
              </p>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-surface-100 rounded-2xl shadow-neu-raised py-1.5 z-40">
              <button
                onClick={goToProfile}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <UserCircle2 className="w-4 h-4" />
                <IBMPlexSans400>{t("nav.profile")}</IBMPlexSans400>
              </button>
              <button
                onClick={goToSettings}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <Settings className="w-4 h-4" />
                <IBMPlexSans400>{t("nav.settings")}</IBMPlexSans400>
              </button>
              <div className="my-1.5 border-t border-surface-200" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:text-red-700"
              >
                <LogOut className="w-4 h-4" />
                <IBMPlexSans400>{t("nav.logout")}</IBMPlexSans400>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default memo(Header);

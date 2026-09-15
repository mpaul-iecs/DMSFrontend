import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, type NavLinkRenderProps } from "react-router-dom";
import { X, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { fetchMyMenuThunk } from "../../store/menu/menuThunks";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { resolveIcon } from "../../utilities/icon";
import type { MenuMain } from "../../types/menu";
import Images from "../../assets";
import { IBMPlexSans600 } from "../ui/Text";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

function Sidebar({ open, onClose }: SidebarProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const location = useLocation();
  const { modules, loading } = useAppSelector((s) => s.menu);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    dispatch(fetchMyMenuThunk());
  }, [dispatch]);

  // Whichever main-menu group contains the current route auto-expands, unless the
  // user has explicitly toggled that group (tracked separately in openGroups).
  const autoOpenKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const module of modules) {
      for (const main of module.mainMenus) {
        if (main.subMenus.some((sub) => sub.url && location.pathname.startsWith(sub.url))) {
          keys.add(groupKey(module.moduleName, main));
        }
      }
    }
    return keys;
  }, [modules, location.pathname]);

  const toggleGroup = useCallback(
    (key: string) =>
      setOpenGroups((prev) => ({ ...prev, [key]: !(prev[key] ?? autoOpenKeys.has(key)) })),
    [autoOpenKeys]
  );

  const linkClass = useCallback(
    ({ isActive }: NavLinkRenderProps) =>
      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
        isActive ? "bg-primary-500/10 text-primary-600" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }`,
    []
  );

  const subLinkClass = useCallback(
    ({ isActive }: NavLinkRenderProps) =>
      `flex items-center gap-3 pl-9 pr-3 py-2 rounded-lg text-sm transition-all duration-150 ${
        isActive ? "bg-primary-500/10 text-primary-600" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }`,
    []
  );

  const menuTree = useMemo(
    () =>
      modules.map((module) =>
        module.mainMenus.map((main) => {
          const key = groupKey(module.moduleName, main);

          // A main menu with zero or one submenu is a direct link — no dropdown.
          // When there IS a single submenu, it represents the actual destination, so
          // its own name/icon take priority over the (now purely structural) main menu's.
          if (main.subMenus.length <= 1) {
            const only = main.subMenus[0];
            const to = main.url ?? only?.url ?? "#";
            const Icon = resolveIcon(only?.subMenuIcon ?? main.menuIcon);
            const label = only?.subMenu ?? main.mainMenu;
            return { type: "link" as const, key, to, Icon, label };
          }

          // Falls back to the first submenu's icon if MenuIcon wasn't set at the
          // main-menu level — keeps the group header from silently showing the
          // generic dot icon just because MenuIcon was left empty in the DB.
          const MainIcon = resolveIcon(main.menuIcon ?? main.subMenus[0]?.subMenuIcon);
          return {
            type: "group" as const,
            key,
            MainIcon,
            label: main.mainMenu,
            subMenus: main.subMenus.map((sub) => ({
              idMenu: sub.idMenu,
              url: sub.url ?? "#",
              label: sub.subMenu,
              SubIcon: resolveIcon(sub.subMenuIcon ?? main.menuIcon),
            })),
          };
        }),
      ),
    [modules]
  );

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="relative flex items-center justify-center px-5 h-20 border-b border-gray-100">
          <img src={Images.logo} alt={t("app.name")} className="h-12 w-auto object-contain" />
          <button
            onClick={onClose}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-gray-100 lg:hidden"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {loading && modules.length === 0 && (
            <div className="px-3 py-2 space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 rounded-lg bg-gray-100 animate-pulse" />
              ))}
            </div>
          )}

          {menuTree.map((mains) =>
            mains.map((entry) => {
              if (entry.type === "link") {
                const Icon = entry.Icon;
                return (
                  <NavLink key={entry.key} to={entry.to} end onClick={onClose} className={linkClass}>
                    <Icon className="w-5 h-5 shrink-0" />
                    <IBMPlexSans600>{entry.label}</IBMPlexSans600>
                  </NavLink>
                );
              }

              const MainIcon = entry.MainIcon;
              const isOpen = openGroups[entry.key] ?? autoOpenKeys.has(entry.key);
              return (
                <SidebarGroup
                  key={entry.key}
                  groupKey={entry.key}
                  MainIcon={MainIcon}
                  label={entry.label}
                  isOpen={isOpen}
                  subMenus={entry.subMenus}
                  onToggle={toggleGroup}
                  onClose={onClose}
                  subLinkClass={subLinkClass}
                />
              );
            }),
          )}
        </nav>
      </aside>
    </>
  );
}

interface SidebarGroupProps {
  groupKey: string;
  MainIcon: ReturnType<typeof resolveIcon>;
  label: string;
  isOpen: boolean;
  subMenus: { idMenu: number | string; url: string; label: string; SubIcon: ReturnType<typeof resolveIcon> }[];
  onToggle: (key: string) => void;
  onClose: () => void;
  subLinkClass: (props: NavLinkRenderProps) => string;
}

const SidebarGroup = memo(function SidebarGroup({
  groupKey,
  MainIcon,
  label,
  isOpen,
  subMenus,
  onToggle,
  onClose,
  subLinkClass,
}: SidebarGroupProps) {
  const handleToggle = useCallback(() => onToggle(groupKey), [onToggle, groupKey]);

  return (
    <div>
      <button
        onClick={handleToggle}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all duration-150"
      >
        <MainIcon className="w-5 h-5 shrink-0" />
        <IBMPlexSans600 as="span" className="flex-1 text-left">
          {label}
        </IBMPlexSans600>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="mt-0.5 space-y-0.5">
          {subMenus.map((sub) => {
            const SubIcon = sub.SubIcon;
            return (
              <NavLink key={sub.idMenu} to={sub.url} onClick={onClose} className={subLinkClass}>
                <SubIcon className="w-3.5 h-3.5 shrink-0" />
                <IBMPlexSans600>{sub.label}</IBMPlexSans600>
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
});

const groupKey = (moduleName: string, main: MenuMain) => `${moduleName}::${main.mainMenu}`;

export default memo(Sidebar);

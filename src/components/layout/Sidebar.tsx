import { NavLink, type NavLinkRenderProps } from "react-router-dom";
import { LayoutDashboard, X, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

interface NavItem {
  to: string;
  icon: typeof LayoutDashboard;
  key: string;
}

const navItems: NavItem[] = [{ to: "/", icon: LayoutDashboard, key: "nav.dashboard" }];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { t } = useTranslation();

  const linkClass = ({ isActive }: NavLinkRenderProps) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
      isActive ? "bg-primary-500/10 text-primary-600" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
    }`;

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
              <ShieldCheck className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-bold text-gray-900 tracking-tight">{t("app.name")}</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 lg:hidden">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end onClick={onClose} className={linkClass}>
              <item.icon className="w-5 h-5 shrink-0" />
              {t(item.key)}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}

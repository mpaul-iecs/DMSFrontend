import * as LucideIcons from "lucide-react";
import { Circle, type LucideIcon } from "lucide-react";

/**
 * Menu icon names come from the backend (MST_Menu.MenuIcon / SubMenuIcon) as plain strings
 * expected to match a lucide-react export name (e.g. "LayoutDashboard", "Users"). Falls back
 * to a generic dot so an unrecognized/misspelled name never breaks the sidebar.
 */
export function resolveIcon(name?: string | null): LucideIcon {
  if (!name) return Circle;
  const icon = (LucideIcons as unknown as Record<string, LucideIcon>)[name];
  return icon ?? Circle;
}

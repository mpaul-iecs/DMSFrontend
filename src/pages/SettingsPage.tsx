import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm, useWatch, Controller } from "react-hook-form";
import { Palette, Globe, ShieldPlus, Loader2 } from "lucide-react";
import { setTheme, setLanguage } from "../store/auth/authSlice";
import { COLOR_PRESETS, applyTheme } from "../utilities/theme";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { assignMenuPermissionThunk, fetchMyMenuThunk } from "../store/menu/menuThunks";
import { refreshCurrentUserThunk, upsertAppSettingsThunk } from "../store/auth/authThunks";
import roleService from "../services/roleService";
import menuService from "../services/menuService";
import toast from "../utilities/toast";
import Button from "../components/ui/Button";
import AsyncSelect from "../components/ui/AsyncSelect";
import Select from "../components/ui/Select";
import Checkbox from "../components/ui/Checkbox";
import Card from "../components/ui/Card";
import { IBMPlexSans400, IBMPlexSans600, IBMPlexSans700 } from "../components/ui/Text";

const LANGUAGES = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
];

const PERMISSION_FLAGS = [
  { name: "canCreate", label: "Create" },
  { name: "canEdit", label: "Edit" },
  { name: "canDelete", label: "Delete" },
  { name: "canReport", label: "Report" },
] as const;

interface RoleOption {
  value: number;
  label: string;
}

interface MenuOption {
  value: number;
  label: string;
}

interface AssignPermissionFormValues {
  role: RoleOption | null;
  menu: MenuOption | null;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canReport: boolean;
}

const EMPTY_FORM: AssignPermissionFormValues = {
  role: null,
  menu: null,
  canCreate: false,
  canEdit: false,
  canDelete: false,
  canReport: false,
};

interface ThemeOptionButtonProps {
  presetKey: string;
  name: string;
  color: string;
  active: boolean;
  onSelect: (key: string) => void;
}

const ThemeOptionButton = memo(function ThemeOptionButton({
  presetKey,
  name,
  color,
  active,
  onSelect,
}: ThemeOptionButtonProps) {
  const handleClick = useCallback(() => onSelect(presetKey), [onSelect, presetKey]);
  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-3 p-3 rounded-xl bg-surface-100 transition-shadow ${
        active ? "shadow-neu-pressed-sm" : "shadow-neu-raised-sm hover:shadow-neu-raised"
      }`}
    >
      <div className="w-8 h-8 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <IBMPlexSans600 as="span" className="text-sm text-gray-700">
        {name}
      </IBMPlexSans600>
    </button>
  );
});

interface LanguageOptionButtonProps {
  code: string;
  label: string;
  native: string;
  active: boolean;
  onSelect: (code: string) => void;
}

const LanguageOptionButton = memo(function LanguageOptionButton({
  code,
  label,
  native,
  active,
  onSelect,
}: LanguageOptionButtonProps) {
  const handleClick = useCallback(() => onSelect(code), [onSelect, code]);
  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-3 px-5 py-3 rounded-xl bg-surface-100 transition-shadow flex-1 ${
        active ? "shadow-neu-pressed-sm" : "shadow-neu-raised-sm hover:shadow-neu-raised"
      }`}
    >
      <div className="text-left">
        <p className="text-sm text-gray-800">
          <IBMPlexSans600>{native}</IBMPlexSans600>
        </p>
        <p className="text-xs text-gray-400">
          <IBMPlexSans400>{label}</IBMPlexSans400>
        </p>
      </div>
    </button>
  );
});

function SettingsPage() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const currentTheme = useAppSelector((s) => s.auth.themePreset) || "ocean";
  const currentLang = useAppSelector((s) => s.auth.language) || "en";
  const { allMenus, assigning } = useAppSelector((s) => s.menu);
  const [checkingExisting, setCheckingExisting] = useState(false);

  // No fetchAllMenusThunk dispatch here — AppLayout.tsx already fetches allMenus once,
  // globally, before any authenticated route (including this one) can render.

  // Applies locally first for instant feedback, then persists to the backend's AppSettings
  // table (source of truth from GET /auth/me on the next load) — a failed save just gets
  // silently retried next time the user picks a preset; there's nothing destructive to roll
  // back since the local UI state is always what the user just clicked, not what the server has.
  const handleThemeChange = useCallback(
    (key: string) => {
      dispatch(setTheme(key));
      applyTheme(key);
      dispatch(upsertAppSettingsThunk({ theme: key }));
    },
    [dispatch]
  );

  const handleLanguageChange = useCallback(
    (code: string) => {
      dispatch(setLanguage(code));
      i18n.changeLanguage(code);
      sessionStorage.setItem("innereye-lang", code);
      dispatch(upsertAppSettingsThunk({ language: code }));
    },
    [dispatch, i18n]
  );

  const menuOptions: MenuOption[] = useMemo(
    () =>
      allMenus.map((m) => ({
        value: m.idMenu,
        label: [m.moduleName, m.mainMenu, m.subMenu].filter(Boolean).join(" / "),
      })),
    [allMenus],
  );

  // Debounce/cache/cancellation for the role search lives in roleService.searchRoles
  // (module-level state, not a component ref) — see the comment there for why.
  const loadRoleOptions = useCallback(async (inputValue: string): Promise<RoleOption[]> => {
    const roles = await roleService.searchRoles(inputValue);
    return roles.map((r) => ({ value: r.idRole, label: r.name }));
  }, []);

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<AssignPermissionFormValues>({ defaultValues: EMPTY_FORM });

  const selectedRole = useWatch({ control, name: "role" });
  const selectedMenu = useWatch({ control, name: "menu" });

  // Once both role and menu are picked, pull whatever permission already exists for that
  // pair and pre-check the flags with it — so submitting sends the existing flags plus
  // whatever the admin just changed, rather than silently wiping out the rest to false.
  useEffect(() => {
    if (!selectedRole || !selectedMenu) return;
    let cancelled = false;

    (async () => {
      setCheckingExisting(true);
      try {
        const res = await menuService.getRolePermission(selectedMenu.value, selectedRole.value);
        const existing = res.data.responseData;
        if (cancelled || !existing) return;
        setValue("canCreate", existing.canCreate);
        setValue("canEdit", existing.canEdit);
        setValue("canDelete", existing.canDelete);
        setValue("canReport", existing.canReport);
      } catch {
        // No existing row (or the lookup failed) — leave the flags as the admin left them.
      } finally {
        if (!cancelled) setCheckingExisting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedRole, selectedMenu, setValue]);

  const onAssignSubmit = useCallback(
    async (data: AssignPermissionFormValues) => {
      if (!data.role || !data.menu) return;
      try {
        await dispatch(
          assignMenuPermissionThunk({
            idRole: data.role.value,
            idMenu: data.menu.value,
            canCreate: data.canCreate,
            canEdit: data.canEdit,
            canDelete: data.canDelete,
            canReport: data.canReport,
          }),
        ).unwrap();
        toast.success("Permission updated.");
        reset(EMPTY_FORM);
        // The assignment only touches a DB row for the target role — nothing else tells
        // this session its own authorization changed (e.g. when an admin assigns permission
        // to their own role, as in normal testing/setup). Refresh both permission sources
        // this session cares about — the JWT-derived permissions (Sidebar/MenuGuard's
        // canMenu checks) and the menu tree itself (Sidebar's own list) — so the effect is
        // visible immediately instead of only after a full page reload.
        //
        // Awaited (not fire-and-forget): Sidebar needs BOTH to have actually landed before
        // its permission-filtered menuTree is correct — a newly-granted menu only shows once
        // `modules` includes it AND `canMenu` reflects the new permission. Racing them
        // unawaited meant an occasional dropped/slow request left the two out of sync with
        // no sign anything was wrong — "sometimes it just doesn't appear."
        try {
          await Promise.all([
            dispatch(refreshCurrentUserThunk()).unwrap(),
            dispatch(fetchMyMenuThunk()).unwrap(),
          ]);
        } catch {
          toast.warning("Permission saved, but couldn't refresh your own sidebar — reload to see it.");
        }
      } catch (message) {
        toast.error(typeof message === "string" ? message : "Failed to assign permission.");
      }
    },
    [dispatch, reset]
  );

  return (
    <div>
      <IBMPlexSans700 as="h1" className="text-xl text-gray-900 mb-6">
        {t("nav.settings")}
      </IBMPlexSans700>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left: preferences */}
        <div className="space-y-6">
          {/* Color Theme */}
          <Card>
            <div className="flex items-center gap-2 mb-5">
              <Palette className="w-5 h-5 text-gray-500" />
              <IBMPlexSans600 as="h3" className="text-gray-900">
                {t("settings.colorTheme")}
              </IBMPlexSans600>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(COLOR_PRESETS).map(([key, preset]) => (
                <ThemeOptionButton
                  key={key}
                  presetKey={key}
                  name={preset.name}
                  color={preset.primary[500]}
                  active={currentTheme === key}
                  onSelect={handleThemeChange}
                />
              ))}
            </div>
          </Card>

          {/* Language */}
          <Card>
            <div className="flex items-center gap-2 mb-5">
              <Globe className="w-5 h-5 text-gray-500" />
              <IBMPlexSans600 as="h3" className="text-gray-900">
                {t("settings.language")}
              </IBMPlexSans600>
            </div>
            <div className="flex gap-3">
              {LANGUAGES.map((lang) => (
                <LanguageOptionButton
                  key={lang.code}
                  code={lang.code}
                  label={lang.label}
                  native={lang.native}
                  active={currentLang === lang.code}
                  onSelect={handleLanguageChange}
                />
              ))}
            </div>
          </Card>
        </div>

        {/* Right: assign menu permission */}
        <Card>
          <div className="flex items-center gap-2 mb-5">
            <ShieldPlus className="w-5 h-5 text-gray-500" />
            <IBMPlexSans600 as="h3" className="text-gray-900">
              {t("settings.assignPermission")}
            </IBMPlexSans600>
          </div>

          <form onSubmit={handleSubmit(onAssignSubmit)} noValidate className="space-y-4">
            <Controller
              name="role"
              control={control}
              rules={{ required: "Role is required" }}
              render={({ field }) => (
                <AsyncSelect<RoleOption>
                  label={t("settings.role")}
                  loadOptions={loadRoleOptions}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={t("settings.selectRole")}
                  error={errors.role?.message}
                  selectRef={field.ref as never}
                />
              )}
            />

            <Controller
              name="menu"
              control={control}
              rules={{ required: "Menu is required" }}
              render={({ field }) => (
                <Select<MenuOption>
                  label={t("settings.menu")}
                  options={menuOptions}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={t("settings.selectMenu")}
                  error={errors.menu?.message}
                  selectRef={field.ref as never}
                />
              )}
            />

            {checkingExisting && (
              <p className="flex items-center gap-1.5 text-xs text-gray-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <IBMPlexSans400>{t("settings.checkingExisting")}</IBMPlexSans400>
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              {PERMISSION_FLAGS.map((flag) => (
                <div
                  key={flag.name}
                  className="px-3 py-2.5 rounded-xl bg-surface-100 shadow-neu-raised-sm hover:shadow-neu-pressed-sm transition-shadow"
                >
                  <Checkbox label={flag.label} {...register(flag.name)} />
                </div>
              ))}
            </div>

            <Button type="submit" loading={assigning} className="w-full">
              <IBMPlexSans600>{t("settings.assign")}</IBMPlexSans600>
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default memo(SettingsPage);

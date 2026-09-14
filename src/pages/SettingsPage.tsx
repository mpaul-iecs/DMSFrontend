import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm, useWatch, Controller } from "react-hook-form";
import { Palette, Globe, ShieldPlus, Loader2 } from "lucide-react";
import { setTheme, setLanguage } from "../store/auth/authSlice";
import { COLOR_PRESETS, applyTheme } from "../utilities/theme";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchAllMenusThunk, assignMenuPermissionThunk } from "../store/menu/menuThunks";
import roleService from "../services/roleService";
import menuService from "../services/menuService";
import toast from "../utilities/toast";
import Button from "../components/ui/Button";
import AsyncSelect from "../components/ui/AsyncSelect";
import Select from "../components/ui/Select";
import Checkbox from "../components/ui/Checkbox";

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

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const currentTheme = useAppSelector((s) => s.auth.themePreset) || "ocean";
  const currentLang = useAppSelector((s) => s.auth.language) || "en";
  const { allMenus, assigning } = useAppSelector((s) => s.menu);
  const [checkingExisting, setCheckingExisting] = useState(false);

  useEffect(() => {
    dispatch(fetchAllMenusThunk());
  }, [dispatch]);

  const handleThemeChange = (key: string) => {
    dispatch(setTheme(key));
    applyTheme(key);
  };

  const handleLanguageChange = (code: string) => {
    dispatch(setLanguage(code));
    i18n.changeLanguage(code);
    sessionStorage.setItem("innereye-lang", code);
  };

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
  const loadRoleOptions = async (inputValue: string): Promise<RoleOption[]> => {
    const roles = await roleService.searchRoles(inputValue);
    return roles.map((r) => ({ value: r.idRole, label: r.name }));
  };

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

  const onAssignSubmit = async (data: AssignPermissionFormValues) => {
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
    } catch (message) {
      toast.error(typeof message === "string" ? message : "Failed to assign permission.");
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">{t("nav.settings")}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left: preferences */}
        <div className="space-y-6">
          {/* Color Theme */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-5">
              <Palette className="w-5 h-5 text-gray-500" />
              <h3 className="font-semibold text-gray-900">{t("settings.colorTheme")}</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(COLOR_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => handleThemeChange(key)}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 transition ${
                    currentTheme === key
                      ? "border-primary-500 bg-primary-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="w-8 h-8 rounded-full shrink-0" style={{ backgroundColor: preset.primary[500] }} />
                  <span className="text-sm font-medium text-gray-700">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-5">
              <Globe className="w-5 h-5 text-gray-500" />
              <h3 className="font-semibold text-gray-900">{t("settings.language")}</h3>
            </div>
            <div className="flex gap-3">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`flex items-center gap-3 px-5 py-3 rounded-lg border-2 transition flex-1 ${
                    currentLang === lang.code
                      ? "border-primary-500 bg-primary-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-800">{lang.native}</p>
                    <p className="text-xs text-gray-400">{lang.label}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: assign menu permission */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <ShieldPlus className="w-5 h-5 text-gray-500" />
            <h3 className="font-semibold text-gray-900">{t("settings.assignPermission")}</h3>
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
                {t("settings.checkingExisting")}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              {PERMISSION_FLAGS.map((flag) => (
                <div
                  key={flag.name}
                  className="px-3 py-2.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <Checkbox label={flag.label} {...register(flag.name)} />
                </div>
              ))}
            </div>

            <Button type="submit" loading={assigning} className="w-full">
              {t("settings.assign")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

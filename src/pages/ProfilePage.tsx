import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { UserCircle2 } from "lucide-react";
import { useAppSelector } from "../store/hooks";
import Card from "../components/ui/Card";

function ProfilePage() {
  const { t } = useTranslation();
  const user = useAppSelector((s) => s.auth.user);

  const fields: Array<{ label: string; value: string }> = useMemo(
    () => [
      { label: t("profile.userName"), value: user?.userName || "—" },
      { label: t("profile.empNo"), value: user?.empNo || "—" },
      { label: t("profile.tenant"), value: user?.tenantId || "—" },
      { label: t("profile.roles"), value: user?.roles?.join(", ") || "—" },
    ],
    [t, user]
  );

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">{t("profile.title")}</h1>

      <Card className="max-w-xl">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-surface-200">
          <div className="w-16 h-16 rounded-full shadow-neu-pressed-sm flex items-center justify-center">
            <UserCircle2 className="w-9 h-9 text-primary-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{user?.userName}</p>
            <p className="text-sm text-gray-400">{user?.roles?.[0] || "User"}</p>
          </div>
        </div>

        <dl className="space-y-4">
          {fields.map((f) => (
            <div key={f.label} className="flex items-center justify-between text-sm">
              <dt className="text-gray-500">{f.label}</dt>
              <dd className="font-medium text-gray-800">{f.value}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}

export default memo(ProfilePage);

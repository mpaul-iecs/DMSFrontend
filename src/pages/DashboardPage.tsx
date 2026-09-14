import { useTranslation } from "react-i18next";
import { LayoutDashboard } from "lucide-react";
import EmptyState from "../components/ui/EmptyState";

export default function DashboardPage() {
  const { t } = useTranslation();
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">{t("dashboard.title")}</h1>
      <div className="bg-white rounded-xl border border-gray-200">
        <EmptyState message={t("common.noData")} icon={LayoutDashboard} />
      </div>
    </div>
  );
}

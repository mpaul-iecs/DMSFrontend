import { memo } from "react";
import { useTranslation } from "react-i18next";
import { LayoutDashboard } from "lucide-react";
import EmptyState from "../components/ui/EmptyState";
import { IBMPlexSans700 } from "../components/ui/Text";

function DashboardPage() {
  const { t } = useTranslation();
  return (
    <div>
      <IBMPlexSans700 as="h1" className="text-xl text-gray-900 mb-6">
        {t("dashboard.title")}
      </IBMPlexSans700>
      <div className="bg-white rounded-xl border border-gray-200">
        <EmptyState message={t("common.noData")} icon={LayoutDashboard} />
      </div>
    </div>
  );
}

export default memo(DashboardPage);

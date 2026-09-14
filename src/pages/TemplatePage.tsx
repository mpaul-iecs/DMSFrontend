import { useTranslation } from "react-i18next";
import EmptyState from "../components/ui/EmptyState";
import { LayoutTemplate } from "lucide-react";

export default function TemplatePage() {
  const { t } = useTranslation();
    return (
      <div>
        <h1 className="text-xl font-bold text-gray-900 mb-6">{t("template.title")}</h1>
        <div className="bg-white rounded-xl border border-gray-200">
          <EmptyState message={t("common.noData")} icon={LayoutTemplate} />
        </div>
      </div>
    );
}

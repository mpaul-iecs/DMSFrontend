import { useTranslation } from "react-i18next";
import EmptyState from "../components/ui/EmptyState";
import { LayoutTemplate } from "lucide-react";
import { IBMPlexSans700 } from "../components/ui/Text";

export default function TemplatePage() {
  const { t } = useTranslation();
    return (
      <div>
        <IBMPlexSans700 as="h1" className="text-xl text-gray-900 mb-6">
          {t("template.title")}
        </IBMPlexSans700>
        <div className="bg-white rounded-xl border border-gray-200">
          <EmptyState message={t("common.noData")} icon={LayoutTemplate} />
        </div>
      </div>
    );
}

import { memo } from "react";
import { useTranslation } from "react-i18next";
import EmptyState from "../components/ui/EmptyState";
import { LayoutTemplate } from "lucide-react";
import Card from "../components/ui/Card";
import { IBMPlexSans700 } from "../components/ui/Text";

function TemplatePage() {
  const { t } = useTranslation();
  return (
    <div>
      <IBMPlexSans700 as="h1" className="text-xl text-gray-900 mb-6">
        {t("template.title")}
      </IBMPlexSans700>
      <Card noPadding>
        <EmptyState message={t("common.noData")} icon={LayoutTemplate} />
      </Card>
    </div>
  );
}

export default memo(TemplatePage);

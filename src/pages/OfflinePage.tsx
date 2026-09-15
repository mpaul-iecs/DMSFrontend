import { memo, useCallback } from "react";
import { WifiOff, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import Button from "../components/ui/Button";

/**
 * Full-screen takeover rendered by App.tsx whenever useOnlineStatus() reports the
 * browser is offline — replaces the whole app rather than living behind a route, since
 * connectivity can drop on any page and nothing behind it can reliably call the API anyway.
 */
function OfflinePage() {
  const { t } = useTranslation();
  const handleRetry = useCallback(() => window.location.reload(), []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-100 p-6">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-5">
          <WifiOff className="w-7 h-7 text-gray-400" />
        </div>
        <h1 className="text-lg font-bold text-gray-900 mb-1">{t("offlinePage.title")}</h1>
        <p className="text-sm text-gray-500 mb-6">{t("offlinePage.message")}</p>

        <Button className="w-full" onClick={handleRetry}>
          <RotateCcw className="w-4 h-4" />
          {t("offlinePage.retry")}
        </Button>
      </div>
    </div>
  );
}

export default memo(OfflinePage);

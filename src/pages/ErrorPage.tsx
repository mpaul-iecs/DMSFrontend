import { isRouteErrorResponse, useNavigate, useRouteError } from "react-router-dom";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { useTranslation } from "react-i18next";
import Button from "../components/ui/Button";

/**
 * Router-level error boundary — set as the root route's `errorElement` in AppRoutes.tsx,
 * so it catches thrown errors from any route's render/loader/action anywhere in the tree,
 * not just a specific page. Not for expected API failures (those show a toast instead);
 * this is the last-resort fallback for something actually breaking.
 */
export default function ErrorPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const error = useRouteError();

  let title = t("errorPage.title");
  let message = t("errorPage.message");

  if (isRouteErrorResponse(error)) {
    title = error.status === 404 ? t("errorPage.notFoundTitle") : `${error.status} ${error.statusText}`;
    message = typeof error.data === "string" ? error.data : message;
  } else if (error instanceof Error) {
    message = error.message || message;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-100 p-6">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-danger-500/10 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="w-7 h-7 text-danger-600" />
        </div>
        <h1 className="text-lg font-bold text-gray-900 mb-1">{title}</h1>
        <p className="text-sm text-gray-500 mb-6">{message}</p>

        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => window.location.reload()}>
            <RotateCcw className="w-4 h-4" />
            {t("errorPage.retry")}
          </Button>
          <Button className="flex-1" onClick={() => navigate("/")}>
            <Home className="w-4 h-4" />
            {t("errorPage.goHome")}
          </Button>
        </div>
      </div>
    </div>
  );
}

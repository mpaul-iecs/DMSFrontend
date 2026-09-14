import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Loader2 } from "lucide-react";
import { applyTheme } from "./utilities/theme";
import { TOAST_CONTAINER_CONFIG } from "./utilities/toast";
import { initAuthThunk } from "./store/auth/authThunks";
import { getAccessToken } from "./services/axiosInstance";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import useOnlineStatus from "./hooks/useOnlineStatus";
import router from "./routes/AppRoutes";
import OfflinePage from "./pages/OfflinePage";

export default function App() {
  const dispatch = useAppDispatch();
  const { i18n } = useTranslation();
  const isOnline = useOnlineStatus();
  const themePreset = useAppSelector((s) => s.auth.themePreset);
  const language = useAppSelector((s) => s.auth.language);
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const initializing = useAppSelector((s) => s.auth.initializing);

  useEffect(() => {
    applyTheme(themePreset || "ocean");
  }, [themePreset]);

  useEffect(() => {
    if (language && language !== i18n.language) {
      i18n.changeLanguage(language);
    }
  }, [language, i18n]);

  // Page reload within the same browser session: the httpOnly refresh cookie is
  // still there, but the in-memory access token is gone — rotate it silently.
  useEffect(() => {
    if (isAuthenticated && !getAccessToken()) {
      dispatch(initAuthThunk());
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOnline) {
    return <OfflinePage />;
  }

  if (initializing && isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-100">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          <p className="text-sm">Restoring session...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <RouterProvider router={router} />
      <ToastContainer {...TOAST_CONTAINER_CONFIG} />
    </>
  );
}

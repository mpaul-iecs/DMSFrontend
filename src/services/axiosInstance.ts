import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import endpoints from "../utilities/endpoint";

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let accessToken: string | null = null;
let tenantId: string | null = null;
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};
export const getAccessToken = () => accessToken;
export const clearAccessToken = () => {
  accessToken = null;
};

// Module-scoped, same as accessToken above — avoids importing the redux store here, which
// would create a cycle (store.ts -> authSlice.ts -> authThunks.ts -> authService.ts ->
// axiosInstance.ts -> store.ts). authThunks.ts calls setTenantId alongside setAccessToken
// whenever it resolves the current user.
export const setTenantId = (id: string | null) => {
  tenantId = id;
};
export const getTenantId = () => tenantId;
export const clearTenantId = () => {
  tenantId = null;
};

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};
const addRefreshSubscriber = (cb: (token: string) => void) => refreshSubscribers.push(cb);

const api = axios.create({
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  if (tenantId) config.headers["X-Tenant-Id"] = tenantId;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    const isAuthEndpoint =
      originalRequest?.url?.includes("/auth/refresh") ||
      originalRequest?.url?.includes("/auth/login");

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          addRefreshSubscriber((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(
          endpoints.auth.refresh,
          {},
          { withCredentials: true },
        );
        const newToken: string | undefined = res.data?.responseData?.accessToken;

        if (newToken) {
          setAccessToken(newToken);
          onRefreshed(newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch {
        clearAccessToken();
        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/login";
        }
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;

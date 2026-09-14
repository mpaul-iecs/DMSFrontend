const API = import.meta.env.VITE_API_BASE_URL || "/api";

export default {
  auth: {
    login: `${API}/Auth/login`,
    refresh: `${API}/Auth/refresh`,
    revoke: `${API}/Auth/revoke`,
    me: `${API}/Auth/me`,
  },
};

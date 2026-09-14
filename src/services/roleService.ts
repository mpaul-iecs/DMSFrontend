import api from "./axiosInstance";
import endpoints from "../utilities/endpoint";
import type { BaseResponse } from "../types/auth";
import type { Role } from "../types/role";

/** All raw HTTP calls for the role domain live here — thunks/components only orchestrate them. */
const roleService = {
  getAll: () => api.get<BaseResponse<Role[]>>(endpoints.roles.base),

  getById: (idRole: number) => api.get<BaseResponse<Role>>(endpoints.roles.byId(idRole)),
};

export default roleService;

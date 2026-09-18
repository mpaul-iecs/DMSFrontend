import api from "./axiosInstance";
import endpoints from "../utilities/endpoint";
import type { BaseResponse } from "../types/auth";
import type { TemplateTypeDto, UpsertTemplateTypeRequestDto } from "../types/template";

const templateTypeService = {
  list: () => api.get<BaseResponse<TemplateTypeDto[]>>(endpoints.templateTypes.base),

  getById: (id: number) => api.get<BaseResponse<TemplateTypeDto>>(endpoints.templateTypes.byId(id)),

  create: (payload: UpsertTemplateTypeRequestDto) =>
    api.post<BaseResponse<TemplateTypeDto>>(endpoints.templateTypes.base, payload),

  update: (id: number, payload: UpsertTemplateTypeRequestDto) =>
    api.put<BaseResponse<TemplateTypeDto>>(endpoints.templateTypes.byId(id), payload),

  /** Soft-delete (backend flips IsActive false) — the type then drops out of the next list fetch. */
  remove: (id: number) => api.delete<BaseResponse<boolean>>(endpoints.templateTypes.byId(id)),
};

export default templateTypeService;

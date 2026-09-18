import api from "./axiosInstance";
import endpoints from "../utilities/endpoint";
import type { BaseResponse } from "../types/auth";
import type { TemplateFieldDto, UpsertFieldRequestDto } from "../types/template";

export interface FieldListParams {
  templateVersionId: number;
}

/** Raw HTTP calls for the standalone Fields management domain (FieldsController) — distinct
 * from templateService.ts's upsertField/deleteField, which are the nested
 * Templates/{id}/fields[/{fieldId}] routes used by the section builder. */
const fieldService = {
  list: (params: FieldListParams) =>
    api.get<BaseResponse<TemplateFieldDto[]>>(endpoints.fields.base, { params }),

  create: (payload: UpsertFieldRequestDto) =>
    api.post<BaseResponse<TemplateFieldDto>>(endpoints.fields.base, payload),

  update: (id: number, payload: UpsertFieldRequestDto) =>
    api.put<BaseResponse<TemplateFieldDto>>(endpoints.fields.byId(id), payload),

  remove: (id: number) => api.delete<BaseResponse<boolean>>(endpoints.fields.byId(id)),
};

export default fieldService;

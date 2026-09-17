import api from "./axiosInstance";
import endpoints from "../utilities/endpoint";
import type { BaseResponse } from "../types/auth";
import type {
  CreateTemplateDraftFormRequestDto,
  CreateTemplateDraftRequestDto,
  RejectTemplateRequestDto,
  ReviewCycleDto,
  TemplateAuditLogEntryDto,
  TemplateDto,
  TemplateFieldDto,
  TemplateListItemDto,
  TemplateSectionDto,
  TemplateStatus,
  UpdateReviewIntervalRequestDto,
  UpsertFieldRequestDto,
  UpsertSectionRequestDto,
} from "../types/template";

export interface TemplateListParams {
  status?: TemplateStatus;
  departmentId?: number;
  templateTypeId?: number;
  page?: number;
  pageSize?: number;
}

/** All raw HTTP calls for the Template Governance domain — thunks only orchestrate these. */
const templateService = {
  list: (params: TemplateListParams) =>
    api.get<BaseResponse<TemplateListItemDto[]>>(endpoints.templates.base, { params }),

  getById: (id: number) => api.get<BaseResponse<TemplateDto>>(endpoints.templates.byId(id)),

  createDraft: (payload: CreateTemplateDraftRequestDto) =>
    api.post<BaseResponse<TemplateDto>>(endpoints.templates.draft, payload),

  createDraftUpload: (payload: CreateTemplateDraftFormRequestDto, file: File) => {
    const form = new FormData();
    form.append("templateTypeId", String(payload.templateTypeId));
    form.append("templateName", payload.templateName);
    form.append("departmentId", String(payload.departmentId));
    form.append("departmentName", payload.departmentName);
    form.append("placeholderFormat", payload.placeholderFormat);
    form.append("reviewInDays", String(payload.reviewInDays));
    form.append("file", file);
    return api.post<BaseResponse<TemplateDto>>(endpoints.templates.draftUpload, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  createNewVersion: (id: number) => api.post<BaseResponse<TemplateDto>>(endpoints.templates.newVersion(id)),

  submit: (id: number) => api.post<BaseResponse<TemplateDto>>(endpoints.templates.submit(id)),

  approve: (id: number) => api.post<BaseResponse<TemplateDto>>(endpoints.templates.approve(id)),

  reject: (id: number, payload: RejectTemplateRequestDto) =>
    api.post<BaseResponse<TemplateDto>>(endpoints.templates.reject(id), payload),

  updateReviewInterval: (id: number, payload: UpdateReviewIntervalRequestDto) =>
    api.put<BaseResponse<TemplateDto>>(endpoints.templates.reviewInterval(id), payload),

  getReviewHistory: (id: number) =>
    api.get<BaseResponse<ReviewCycleDto[]>>(endpoints.templates.reviewHistory(id)),

  /** id in the section body decides create (null) vs update (set) — mirrors the backend's one-endpoint upsert. */
  upsertSection: (templateId: number, payload: UpsertSectionRequestDto) =>
    api.post<BaseResponse<TemplateSectionDto>>(endpoints.templates.sections(templateId), payload),

  deleteSection: (templateId: number, sectionId: number) =>
    api.delete<BaseResponse<boolean>>(endpoints.templates.sectionById(templateId, sectionId)),

  /** id in the field body decides create (null) vs update (set). */
  upsertField: (templateId: number, sectionId: number, payload: UpsertFieldRequestDto) =>
    api.post<BaseResponse<TemplateFieldDto>>(endpoints.templates.fields(templateId, sectionId), payload),

  deleteField: (templateId: number, sectionId: number, fieldId: number) =>
    api.delete<BaseResponse<boolean>>(endpoints.templates.fieldById(templateId, sectionId, fieldId)),

  /** Binary .docx download — bypasses the normal JSON envelope, so this returns the raw
   * AxiosResponse<Blob> rather than a BaseResponse<T> like every other call here. */
  downloadTemplate: (id: number) =>
    api.get(endpoints.templates.download(id), { responseType: "blob" }),

  getAuditLog: (id: number) =>
    api.get<BaseResponse<TemplateAuditLogEntryDto[]>>(endpoints.templates.auditLog(id)),
};

export default templateService;

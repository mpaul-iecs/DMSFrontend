import { createAsyncThunk } from "@reduxjs/toolkit";
import { AxiosError } from "axios";
import templateService, { type TemplateListParams } from "../../services/templateService";
import templateTypeService from "../../services/templateTypeService";
import type { BaseResponse } from "../../types/auth";
import type {
  CreateTemplateDraftFormRequestDto,
  CreateTemplateDraftRequestDto,
  RejectTemplateRequestDto,
  ReviewCycleDto,
  TemplateAuditLogEntryDto,
  TemplateDto,
  TemplateListItemDto,
  TemplateTypeDto,
  UpdateReviewIntervalRequestDto,
  UpsertFieldRequestDto,
  UpsertSectionRequestDto,
  UpsertTemplateTypeRequestDto,
} from "../../types/template";

const extractErrorMessage = (err: unknown, fallback: string) => {
  const axiosErr = err as AxiosError<BaseResponse<unknown>>;
  return axiosErr.response?.data?.message || fallback;
};

export const fetchTemplatesThunk = createAsyncThunk<
  { items: TemplateListItemDto[]; totalCount: number },
  TemplateListParams,
  { rejectValue: string }
>("template/fetchList", async (params, { rejectWithValue }) => {
  try {
    const res = await templateService.list(params);
    const totalHeader = res.headers?.["x-total-count"];
    const totalCount = totalHeader ? Number(totalHeader) : (res.data.responseData ?? []).length;
    return { items: res.data.responseData ?? [], totalCount };
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err, "Failed to load templates"));
  }
});

export const fetchTemplateByIdThunk = createAsyncThunk<TemplateDto, number, { rejectValue: string }>(
  "template/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      const res = await templateService.getById(id);
      if (!res.data.responseData) throw new Error("Template not found");
      return res.data.responseData;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, "Failed to load template"));
    }
  },
);

export const createTemplateDraftThunk = createAsyncThunk<
  TemplateDto,
  CreateTemplateDraftRequestDto,
  { rejectValue: string }
>("template/createDraft", async (payload, { rejectWithValue }) => {
  try {
    const res = await templateService.createDraft(payload);
    if (!res.data.responseData) throw new Error("Draft creation failed");
    return res.data.responseData;
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err, "Failed to create template draft"));
  }
});

export const createTemplateDraftUploadThunk = createAsyncThunk<
  TemplateDto,
  { payload: CreateTemplateDraftFormRequestDto; file: File },
  { rejectValue: string }
>("template/createDraftUpload", async ({ payload, file }, { rejectWithValue }) => {
  try {
    const res = await templateService.createDraftUpload(payload, file);
    if (!res.data.responseData) throw new Error("Draft upload failed");
    return res.data.responseData;
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err, "Failed to upload template document"));
  }
});

export const createNewVersionThunk = createAsyncThunk<TemplateDto, number, { rejectValue: string }>(
  "template/createNewVersion",
  async (id, { rejectWithValue }) => {
    try {
      const res = await templateService.createNewVersion(id);
      if (!res.data.responseData) throw new Error("New version creation failed");
      return res.data.responseData;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, "Failed to create new version"));
    }
  },
);

export const submitTemplateThunk = createAsyncThunk<TemplateDto, number, { rejectValue: string }>(
  "template/submit",
  async (id, { rejectWithValue }) => {
    try {
      const res = await templateService.submit(id);
      if (!res.data.responseData) throw new Error("Submit failed");
      return res.data.responseData;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, "Failed to submit template"));
    }
  },
);

export const approveTemplateThunk = createAsyncThunk<TemplateDto, number, { rejectValue: string }>(
  "template/approve",
  async (id, { rejectWithValue }) => {
    try {
      const res = await templateService.approve(id);
      if (!res.data.responseData) throw new Error("Approve failed");
      return res.data.responseData;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, "Failed to approve template"));
    }
  },
);

export const rejectTemplateThunk = createAsyncThunk<
  TemplateDto,
  { id: number; payload: RejectTemplateRequestDto },
  { rejectValue: string }
>("template/reject", async ({ id, payload }, { rejectWithValue }) => {
  try {
    const res = await templateService.reject(id, payload);
    if (!res.data.responseData) throw new Error("Reject failed");
    return res.data.responseData;
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err, "Failed to reject template"));
  }
});

export const updateReviewIntervalThunk = createAsyncThunk<
  TemplateDto,
  { id: number; payload: UpdateReviewIntervalRequestDto },
  { rejectValue: string }
>("template/updateReviewInterval", async ({ id, payload }, { rejectWithValue }) => {
  try {
    const res = await templateService.updateReviewInterval(id, payload);
    if (!res.data.responseData) throw new Error("Update failed");
    return res.data.responseData;
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err, "Failed to update review interval"));
  }
});

export const fetchReviewHistoryThunk = createAsyncThunk<ReviewCycleDto[], number, { rejectValue: string }>(
  "template/fetchReviewHistory",
  async (id, { rejectWithValue }) => {
    try {
      const res = await templateService.getReviewHistory(id);
      return res.data.responseData ?? [];
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, "Failed to load review history"));
    }
  },
);

export const fetchTemplateVersionsThunk = createAsyncThunk<
  TemplateListItemDto[],
  number,
  { rejectValue: string }
>("template/fetchVersions", async (id, { rejectWithValue }) => {
  try {
    const res = await templateService.getVersions(id);
    return res.data.responseData ?? [];
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err, "Failed to load template versions"));
  }
});

export const upsertSectionThunk = createAsyncThunk<
  TemplateDto,
  { templateId: number; payload: UpsertSectionRequestDto },
  { rejectValue: string }
>("template/upsertSection", async ({ templateId, payload }, { rejectWithValue }) => {
  try {
    await templateService.upsertSection(templateId, payload);
    const res = await templateService.getById(templateId);
    if (!res.data.responseData) throw new Error("Reload failed");
    return res.data.responseData;
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err, "Failed to save section"));
  }
});

export const deleteSectionThunk = createAsyncThunk<
  TemplateDto,
  { templateId: number; sectionId: number },
  { rejectValue: string }
>("template/deleteSection", async ({ templateId, sectionId }, { rejectWithValue }) => {
  try {
    await templateService.deleteSection(templateId, sectionId);
    const res = await templateService.getById(templateId);
    if (!res.data.responseData) throw new Error("Reload failed");
    return res.data.responseData;
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err, "Failed to delete section"));
  }
});

export const upsertFieldThunk = createAsyncThunk<
  TemplateDto,
  { templateId: number; payload: UpsertFieldRequestDto },
  { rejectValue: string }
>("template/upsertField", async ({ templateId, payload }, { rejectWithValue }) => {
  try {
    await templateService.upsertField(templateId, payload);
    const res = await templateService.getById(templateId);
    if (!res.data.responseData) throw new Error("Reload failed");
    return res.data.responseData;
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err, "Failed to save field"));
  }
});

export const deleteFieldThunk = createAsyncThunk<
  TemplateDto,
  { templateId: number; fieldId: number },
  { rejectValue: string }
>("template/deleteField", async ({ templateId, fieldId }, { rejectWithValue }) => {
  try {
    await templateService.deleteField(templateId, fieldId);
    const res = await templateService.getById(templateId);
    if (!res.data.responseData) throw new Error("Reload failed");
    return res.data.responseData;
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err, "Failed to delete field"));
  }
});

export const fetchTemplateAuditLogThunk = createAsyncThunk<
  TemplateAuditLogEntryDto[],
  number,
  { rejectValue: string }
>("template/fetchAuditLog", async (id, { rejectWithValue }) => {
  try {
    const res = await templateService.getAuditLog(id);
    return res.data.responseData ?? [];
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err, "Failed to load audit log"));
  }
});

export const fetchTemplateTypesThunk = createAsyncThunk<TemplateTypeDto[], void, { rejectValue: string }>(
  "template/fetchTypes",
  async (_, { rejectWithValue }) => {
    try {
      const res = await templateTypeService.list();
      return res.data.responseData ?? [];
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, "Failed to load template types"));
    }
  },
);

export const createTemplateTypeThunk = createAsyncThunk<
  TemplateTypeDto,
  UpsertTemplateTypeRequestDto,
  { rejectValue: string }
>("template/createType", async (payload, { rejectWithValue }) => {
  try {
    const res = await templateTypeService.create(payload);
    if (!res.data.responseData) throw new Error("Create failed");
    return res.data.responseData;
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err, "Failed to create template type"));
  }
});

export const updateTemplateTypeThunk = createAsyncThunk<
  TemplateTypeDto,
  { id: number; payload: UpsertTemplateTypeRequestDto },
  { rejectValue: string }
>("template/updateType", async ({ id, payload }, { rejectWithValue }) => {
  try {
    const res = await templateTypeService.update(id, payload);
    if (!res.data.responseData) throw new Error("Update failed");
    return res.data.responseData;
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err, "Failed to update template type"));
  }
});

export const deleteTemplateTypeThunk = createAsyncThunk<number, number, { rejectValue: string }>(
  "template/deleteType",
  async (id, { rejectWithValue }) => {
    try {
      await templateTypeService.remove(id);
      return id;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, "Failed to delete template type"));
    }
  },
);

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { TemplateState } from "../../types/template";
import {
  approveTemplateThunk,
  createNewVersionThunk,
  createTemplateDraftThunk,
  createTemplateDraftUploadThunk,
  createTemplateTypeThunk,
  deleteFieldThunk,
  deleteTemplateTypeThunk,
  deleteSectionThunk,
  fetchTemplateAuditLogThunk,
  fetchReviewHistoryThunk,
  fetchTemplateByIdThunk,
  fetchTemplateTypesThunk,
  fetchTemplatesThunk,
  fetchTemplateVersionsThunk,
  rejectTemplateThunk,
  submitTemplateThunk,
  updateReviewIntervalThunk,
  updateTemplateTypeThunk,
  upsertFieldThunk,
  upsertSectionThunk,
} from "./templateThunks";

const initialState: TemplateState = {
  list: [],
  totalCount: 0,
  listLoading: false,
  listError: null,
  filters: { page: 1, pageSize: 10 },

  selected: null,
  selectedLoading: false,
  selectedError: null,

  reviewHistory: [],
  reviewHistoryLoading: false,

  templateTypes: [],
  templateTypesLoading: false,
  savingTemplateType: false,

  auditLog: [],
  auditLogLoading: false,

  versions: [],
  versionsLoading: false,

  saving: false,
};

const templateSlice = createSlice({
  name: "template",
  initialState,
  reducers: {
    setTemplateFilters(state, action: PayloadAction<Partial<TemplateState["filters"]>>) {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearSelectedTemplate(state) {
      state.selected = null;
      state.selectedError = null;
      state.reviewHistory = [];
      state.auditLog = [];
      state.versions = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTemplatesThunk.pending, (state) => {
        state.listLoading = true;
        state.listError = null;
      })
      .addCase(fetchTemplatesThunk.fulfilled, (state, action) => {
        state.listLoading = false;
        state.list = action.payload.items;
        state.totalCount = action.payload.totalCount;
      })
      .addCase(fetchTemplatesThunk.rejected, (state, action) => {
        state.listLoading = false;
        state.listError = action.payload ?? "Failed to load templates";
      })

      .addCase(fetchTemplateByIdThunk.pending, (state) => {
        state.selectedLoading = true;
        state.selectedError = null;
      })
      .addCase(fetchTemplateByIdThunk.fulfilled, (state, action) => {
        state.selectedLoading = false;
        state.selected = action.payload;
      })
      .addCase(fetchTemplateByIdThunk.rejected, (state, action) => {
        state.selectedLoading = false;
        state.selectedError = action.payload ?? "Failed to load template";
      })

      .addCase(fetchReviewHistoryThunk.pending, (state) => {
        state.reviewHistoryLoading = true;
      })
      .addCase(fetchReviewHistoryThunk.fulfilled, (state, action) => {
        state.reviewHistoryLoading = false;
        state.reviewHistory = action.payload;
      })
      .addCase(fetchReviewHistoryThunk.rejected, (state) => {
        state.reviewHistoryLoading = false;
      })

      .addCase(fetchTemplateAuditLogThunk.pending, (state) => {
        state.auditLogLoading = true;
      })
      .addCase(fetchTemplateAuditLogThunk.fulfilled, (state, action) => {
        state.auditLogLoading = false;
        state.auditLog = action.payload;
      })
      .addCase(fetchTemplateAuditLogThunk.rejected, (state) => {
        state.auditLogLoading = false;
      })

      .addCase(fetchTemplateVersionsThunk.pending, (state) => {
        state.versionsLoading = true;
      })
      .addCase(fetchTemplateVersionsThunk.fulfilled, (state, action) => {
        state.versionsLoading = false;
        state.versions = action.payload;
      })
      .addCase(fetchTemplateVersionsThunk.rejected, (state) => {
        state.versionsLoading = false;
      })

      .addCase(fetchTemplateTypesThunk.pending, (state) => {
        state.templateTypesLoading = true;
      })
      .addCase(fetchTemplateTypesThunk.fulfilled, (state, action) => {
        state.templateTypesLoading = false;
        state.templateTypes = action.payload;
      })
      .addCase(fetchTemplateTypesThunk.rejected, (state) => {
        state.templateTypesLoading = false;
      })

      .addCase(createTemplateTypeThunk.pending, (state) => {
        state.savingTemplateType = true;
      })
      .addCase(createTemplateTypeThunk.fulfilled, (state, action) => {
        state.savingTemplateType = false;
        state.templateTypes = [...state.templateTypes, action.payload];
      })
      .addCase(createTemplateTypeThunk.rejected, (state) => {
        state.savingTemplateType = false;
      })

      .addCase(updateTemplateTypeThunk.pending, (state) => {
        state.savingTemplateType = true;
      })
      .addCase(updateTemplateTypeThunk.fulfilled, (state, action) => {
        state.savingTemplateType = false;
        state.templateTypes = state.templateTypes.map((t) =>
          t.id === action.payload.id ? action.payload : t,
        );
      })
      .addCase(updateTemplateTypeThunk.rejected, (state) => {
        state.savingTemplateType = false;
      })

      .addCase(deleteTemplateTypeThunk.pending, (state) => {
        state.savingTemplateType = true;
      })
      .addCase(deleteTemplateTypeThunk.fulfilled, (state, action) => {
        state.savingTemplateType = false;
        state.templateTypes = state.templateTypes.filter((t) => t.id !== action.payload);
      })
      .addCase(deleteTemplateTypeThunk.rejected, (state) => {
        state.savingTemplateType = false;
      })

      .addMatcher(
        (action) =>
          [
            createTemplateDraftThunk.pending.type,
            createTemplateDraftUploadThunk.pending.type,
            createNewVersionThunk.pending.type,
            submitTemplateThunk.pending.type,
            approveTemplateThunk.pending.type,
            rejectTemplateThunk.pending.type,
            updateReviewIntervalThunk.pending.type,
            upsertSectionThunk.pending.type,
            deleteSectionThunk.pending.type,
            upsertFieldThunk.pending.type,
            deleteFieldThunk.pending.type,
          ].includes(action.type),
        (state) => {
          state.saving = true;
        },
      )
      .addMatcher(
        (action) =>
          [
            createTemplateDraftThunk.fulfilled.type,
            createTemplateDraftUploadThunk.fulfilled.type,
            createNewVersionThunk.fulfilled.type,
            submitTemplateThunk.fulfilled.type,
            approveTemplateThunk.fulfilled.type,
            rejectTemplateThunk.fulfilled.type,
            updateReviewIntervalThunk.fulfilled.type,
            upsertSectionThunk.fulfilled.type,
            deleteSectionThunk.fulfilled.type,
            upsertFieldThunk.fulfilled.type,
            deleteFieldThunk.fulfilled.type,
          ].includes(action.type),
        (state, action) => {
          state.saving = false;
          const payload = (action as PayloadAction<TemplateState["selected"]>).payload;
          if (payload) state.selected = payload;
        },
      )
      .addMatcher(
        (action) =>
          [
            createTemplateDraftThunk.rejected.type,
            createTemplateDraftUploadThunk.rejected.type,
            createNewVersionThunk.rejected.type,
            submitTemplateThunk.rejected.type,
            approveTemplateThunk.rejected.type,
            rejectTemplateThunk.rejected.type,
            updateReviewIntervalThunk.rejected.type,
            upsertSectionThunk.rejected.type,
            deleteSectionThunk.rejected.type,
            upsertFieldThunk.rejected.type,
            deleteFieldThunk.rejected.type,
          ].includes(action.type),
        (state) => {
          state.saving = false;
        },
      );
  },
});

export const { setTemplateFilters, clearSelectedTemplate } = templateSlice.actions;
export default templateSlice.reducer;

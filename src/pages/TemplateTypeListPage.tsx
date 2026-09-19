import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Pencil, Plus, Trash2, X } from "lucide-react";
import Card from "../components/ui/Card";
import Tooltip from "../components/ui/Tooltip";
import DataTable, { type DataTableColumn } from "../components/ui/DataTable";
import Input from "../components/ui/Input";
import Checkbox from "../components/ui/Checkbox";
import Button from "../components/ui/Button";
import Can from "../components/auth/Can";
import { IBMPlexSans400, IBMPlexSans600, IBMPlexSans700 } from "../components/ui/Text";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  createTemplateTypeThunk,
  deleteTemplateTypeThunk,
  fetchTemplateTypesThunk,
  updateTemplateTypeThunk,
} from "../store/template/templateThunks";
import toast from "../utilities/toast";
import type { TemplateTypeDto, UpsertTemplateTypeRequestDto } from "../types/template";

/** menu:10726:* — Template Types (Template Governance's reference-data submodule). */
const TEMPLATE_TYPE_MENU_ID = 10726;

interface TemplateTypeFormState {
  typeName: string;
  typeCode: string;
  formBuilder: boolean;
  docxUpload: boolean;
}

const EMPTY_FORM: TemplateTypeFormState = {
  typeName: "",
  typeCode: "",
  formBuilder: true,
  docxUpload: false,
};

/** `allowedCreationModes` is a [Flags]-style comma-joined string on the wire
 * (e.g. "formBuilder, docxUpload") — see TemplateCreationMode's doc comment in types/template.ts. */
function combineCreationModes(formBuilder: boolean, docxUpload: boolean): string {
  const modes: string[] = [];
  if (formBuilder) modes.push("formBuilder");
  if (docxUpload) modes.push("docxUpload");
  return modes.join(", ");
}

function formStateFromType(type: TemplateTypeDto): TemplateTypeFormState {
  return {
    typeName: type.typeName,
    typeCode: type.typeCode,
    formBuilder: type.allowedCreationModes.includes("formBuilder"),
    docxUpload: type.allowedCreationModes.includes("docxUpload"),
  };
}

function TemplateTypeListPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { templateTypes, templateTypesLoading, savingTemplateType } = useAppSelector((s) => s.template);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<TemplateTypeFormState>(EMPTY_FORM);

  useEffect(() => {
    dispatch(fetchTemplateTypesThunk());
  }, [dispatch]);

  const handleBack = useCallback(() => navigate(-1), [navigate]);

  const handleStartCreate = useCallback(() => {
    setEditingId(null);
    setCreating(true);
    setForm(EMPTY_FORM);
  }, []);

  const handleStartEdit = useCallback((type: TemplateTypeDto) => {
    setCreating(false);
    setEditingId(type.id);
    setForm(formStateFromType(type));
  }, []);

  const handleDelete = useCallback(
    async (type: TemplateTypeDto) => {
      if (!window.confirm(`Delete template type "${type.typeName}"?`)) return;
      const res = await dispatch(deleteTemplateTypeThunk(type.id));
      if (deleteTemplateTypeThunk.fulfilled.match(res)) toast.success("Template type deleted");
      else toast.error(res.payload ?? "Failed to delete template type");
    },
    [dispatch],
  );

  const handleCancel = useCallback(() => {
    setCreating(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }, []);

  const handleTypeNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, typeName: e.target.value })),
    [],
  );
  const handleTypeCodeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, typeCode: e.target.value })),
    [],
  );
  const handleFormBuilderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, formBuilder: e.target.checked })),
    [],
  );
  const handleDocxUploadChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, docxUpload: e.target.checked })),
    [],
  );

  const handleSubmit = useCallback(async () => {
    if (!form.typeName.trim() || !form.typeCode.trim()) {
      toast.error("Type name and type code are required");
      return;
    }
    if (!form.formBuilder && !form.docxUpload) {
      toast.error("At least one creation mode must be allowed");
      return;
    }
    const payload: UpsertTemplateTypeRequestDto = {
      typeName: form.typeName.trim(),
      typeCode: form.typeCode.trim(),
      allowedCreationModes: combineCreationModes(form.formBuilder, form.docxUpload),
    };
    let ok: boolean;
    let errorMessage = "Failed to save template type";
    if (editingId) {
      const res = await dispatch(updateTemplateTypeThunk({ id: editingId, payload }));
      ok = updateTemplateTypeThunk.fulfilled.match(res);
      if (updateTemplateTypeThunk.rejected.match(res) && res.payload) errorMessage = res.payload;
    } else {
      const res = await dispatch(createTemplateTypeThunk(payload));
      ok = createTemplateTypeThunk.fulfilled.match(res);
      if (createTemplateTypeThunk.rejected.match(res) && res.payload) errorMessage = res.payload;
    }
    if (ok) {
      toast.success(editingId ? "Template type updated" : "Template type created");
      setCreating(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    } else {
      toast.error(errorMessage);
    }
  }, [dispatch, editingId, form]);

  const columns = useMemo<DataTableColumn<TemplateTypeDto>[]>(
    () => [
      {
        key: "typeName",
        header: "Type name",
        render: (row) => <IBMPlexSans600 as="span">{row.typeName}</IBMPlexSans600>,
      },
      {
        key: "typeCode",
        header: "Type code",
        render: (row) => <IBMPlexSans400 as="span">{row.typeCode}</IBMPlexSans400>,
      },
      {
        key: "allowedCreationModes",
        header: "Allowed creation modes",
        hideOnMobile: true,
        render: (row) => (
          <div className="flex items-center gap-1.5 flex-wrap">
            {row.allowedCreationModes.includes("formBuilder") && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-surface-200 shadow-neu-pressed-sm">
                <IBMPlexSans400 as="span">Form builder</IBMPlexSans400>
              </span>
            )}
            {row.allowedCreationModes.includes("docxUpload") && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-surface-200 shadow-neu-pressed-sm">
                <IBMPlexSans400 as="span">Docx upload</IBMPlexSans400>
              </span>
            )}
          </div>
        ),
      },
      {
        key: "isActive",
        header: "Active",
        hideOnTablet: true,
        render: (row) => (
          <IBMPlexSans400 as="span" className={row.isActive ? "text-success-600" : "text-gray-400"}>
            {row.isActive ? "Yes" : "No"}
          </IBMPlexSans400>
        ),
      },
      {
        key: "actions",
        header: "",
        render: (row) => <TemplateTypeRowActions type={row} onEdit={handleStartEdit} onDelete={handleDelete} />,
      },
    ],
    [handleStartEdit, handleDelete],
  );

  const showForm = creating || editingId !== null;

  return (
    <div>
      <button
        onClick={handleBack}
        className="inline-flex items-center gap-1.5 mb-4 px-3 py-1.5 rounded-lg hover:shadow-neu-raised-sm transition-shadow text-gray-500"
      >
        <ArrowLeft className="w-4 h-4" />
        <IBMPlexSans600 as="span" className="text-sm">
          Back
        </IBMPlexSans600>
      </button>
      <div className="flex items-center justify-between mb-6">
        <IBMPlexSans700 as="h1" className="text-xl text-gray-900">
          Template types
        </IBMPlexSans700>
        <Can idMenu={TEMPLATE_TYPE_MENU_ID} action="create">
          <button
            onClick={handleStartCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-linear-to-br from-primary-500 to-primary-700 text-white shadow-neu-raised-sm hover:brightness-105 active:shadow-neu-pressed-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <IBMPlexSans600 as="span" className="text-sm">
              New type
            </IBMPlexSans600>
          </button>
        </Can>
      </div>

      {showForm && (
        <Card className="mb-6">
          <IBMPlexSans600 as="h3" className="text-sm text-gray-900 mb-3">
            {editingId ? "Edit template type" : "New template type"}
          </IBMPlexSans600>
          <div className="flex items-end gap-3 flex-wrap">
            <Input label="Type name" value={form.typeName} onChange={handleTypeNameChange} className="max-w-[220px]" />
            <Input label="Type code" value={form.typeCode} onChange={handleTypeCodeChange} className="max-w-[160px]" />
            <div className="flex items-center gap-4 pb-2.5">
              <Checkbox label="Form builder" checked={form.formBuilder} onChange={handleFormBuilderChange} />
              <Checkbox label="Docx upload" checked={form.docxUpload} onChange={handleDocxUploadChange} />
            </div>
            <div className="flex items-center gap-2 pb-0.5">
              <Button size="sm" onClick={handleSubmit} loading={savingTemplateType}>
                {editingId ? "Save" : "Create"}
              </Button>
              <Button size="sm" variant="secondary" onClick={handleCancel}>
                <X className="w-3.5 h-3.5" /> Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card noPadding>
        <DataTable
          columns={columns}
          data={templateTypes}
          loading={templateTypesLoading}
          emptyMessage="No template types found"
          page={1}
          pageSize={templateTypes.length || 1}
          totalCount={templateTypes.length}
        />
      </Card>
    </div>
  );
}

interface TemplateTypeRowActionsProps {
  type: TemplateTypeDto;
  onEdit: (type: TemplateTypeDto) => void;
  onDelete: (type: TemplateTypeDto) => void;
}

const TemplateTypeRowActions = memo(function TemplateTypeRowActions({ type, onEdit, onDelete }: TemplateTypeRowActionsProps) {
  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onEdit(type);
    },
    [onEdit, type],
  );
  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(type);
    },
    [onDelete, type],
  );

  return (
    <div className="flex items-center gap-1">
      <Can idMenu={TEMPLATE_TYPE_MENU_ID} action="edit">
        <Tooltip content="Edit">
          <button
            onClick={handleEdit}
            aria-label="Edit"
            className="p-1.5 rounded-lg hover:shadow-neu-raised-sm transition-shadow text-gray-500"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </Tooltip>
      </Can>
      <Can idMenu={TEMPLATE_TYPE_MENU_ID} action="delete">
        <Tooltip content="Delete">
          <button
            onClick={handleDelete}
            aria-label="Delete"
            className="p-1.5 rounded-lg hover:shadow-neu-raised-sm transition-shadow text-danger-500"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </Tooltip>
      </Can>
    </div>
  );
});

export default memo(TemplateTypeListPage);

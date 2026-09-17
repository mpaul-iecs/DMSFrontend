import { memo, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, Eye, LayoutTemplate, Plus } from "lucide-react";
import Card from "../components/ui/Card";
import DataTable, { type DataTableColumn } from "../components/ui/DataTable";
import Badge, { type BadgeVariant } from "../components/ui/Badge";
import Can from "../components/auth/Can";
import { IBMPlexSans400, IBMPlexSans600, IBMPlexSans700 } from "../components/ui/Text";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchTemplatesThunk } from "../store/template/templateThunks";
import { setTemplateFilters } from "../store/template/templateSlice";
import { STATUS_LABEL } from "../utilities/templateStatus";
import type { TemplateListItemDto, TemplateStatus } from "../types/template";

const STATUS_VARIANT: Record<TemplateStatus, BadgeVariant> = {
  draft: "draft",
  pendingApproval: "pendingApproval",
  approved: "approved",
  rejected: "rejected",
  deprecated: "deprecated",
};

function isOverdue(nextReviewDueOn: string | null): boolean {
  if (!nextReviewDueOn) return false;
  return new Date(nextReviewDueOn).getTime() <= Date.now();
}

function TemplateListPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { list, totalCount, listLoading, filters } = useAppSelector((s) => s.template);

  useEffect(() => {
    dispatch(fetchTemplatesThunk(filters));
  }, [dispatch, filters]);

  const handlePageChange = useCallback(
    (page: number) => dispatch(setTemplateFilters({ page })),
    [dispatch],
  );
  const handlePageSizeChange = useCallback(
    (pageSize: number) => dispatch(setTemplateFilters({ pageSize, page: 1 })),
    [dispatch],
  );
  const handleNewTemplate = useCallback(() => navigate("/templates/new"), [navigate]);
  const handleBack = useCallback(() => navigate(-1), [navigate]);
  const handleRowClick = useCallback(
    (row: TemplateListItemDto) => navigate(`/templates/${row.id}`),
    [navigate],
  );

  const columns = useMemo<DataTableColumn<TemplateListItemDto>[]>(
    () => [
      {
        key: "templateName",
        header: "Template",
        render: (row) => <IBMPlexSans600 as="span">{row.templateName}</IBMPlexSans600>,
      },
      { key: "departmentName", header: "Department", hideOnMobile: true },
      {
        key: "status",
        header: "Status",
        render: (row) => <Badge variant={STATUS_VARIANT[row.status]}>{STATUS_LABEL[row.status]}</Badge>,
      },
      {
        key: "versionLabel",
        header: "Version",
        hideOnTablet: true,
        render: (row) => <IBMPlexSans400 as="span">{row.versionLabel}</IBMPlexSans400>,
      },
      {
        key: "nextReviewDueOn",
        header: "Next review due",
        hideOnTablet: true,
        render: (row) => (
          <div className="flex items-center gap-2">
            <IBMPlexSans400 as="span">
              {row.nextReviewDueOn ? new Date(row.nextReviewDueOn).toLocaleDateString() : "—"}
            </IBMPlexSans400>
            {isOverdue(row.nextReviewDueOn) && <Badge variant="overdue">Overdue</Badge>}
          </div>
        ),
      },
      {
        key: "actions",
        header: "",
        render: (row) => <TemplateRowActions row={row} />,
      },
    ],
    [],
  );

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
          Template governance
        </IBMPlexSans700>
        <Can idMenu={724} action="create">
          <button
            onClick={handleNewTemplate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-linear-to-br from-primary-500 to-primary-700 text-white shadow-neu-raised-sm hover:brightness-105 active:shadow-neu-pressed-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <IBMPlexSans600 as="span" className="text-sm">
              New template
            </IBMPlexSans600>
          </button>
        </Can>
      </div>

      <Card noPadding>
        <DataTable
          columns={columns}
          data={list}
          loading={listLoading}
          emptyMessage="No templates found"
          page={filters.page}
          pageSize={filters.pageSize}
          totalCount={totalCount}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          onRowClick={handleRowClick}
        />
      </Card>
      {list.length === 0 && !listLoading && totalCount === 0 && (
        <span className="hidden">
          <LayoutTemplate />
        </span>
      )}
    </div>
  );
}

interface TemplateRowActionsProps {
  row: TemplateListItemDto;
}

/** View (in-page nav) + "open in new tab" — a genuine window.open, never same-tab, per the
 * explicit requirement that editing a template in a new tab must be a real separate browser
 * tab/window, not an in-page route push or modal. Deliberately omits "noopener,noreferrer":
 * that severs the opener relationship, and sessionStorage (this app's auth-persistence
 * mechanism, see CLAUDE.md's "Auth flow" section) only copies into a new same-origin tab when
 * an opener relationship exists — with noopener the new tab boots with empty sessionStorage
 * and appears logged out. Safe to omit here: same-origin, internal, non-user-controlled URL. */
const TemplateRowActions = memo(function TemplateRowActions({ row }: TemplateRowActionsProps) {
  const navigate = useNavigate();

  const handleView = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      navigate(`/templates/${row.id}`);
    },
    [navigate, row.id],
  );

  const handleOpenNewTab = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      window.open(`/templates/${row.id}`, "_blank");
    },
    [row.id],
  );

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={handleView}
        title="View"
        className="p-1.5 rounded-lg hover:shadow-neu-raised-sm transition-shadow text-gray-500"
      >
        <Eye className="w-4 h-4" />
      </button>
      <button
        onClick={handleOpenNewTab}
        title="Open in new tab"
        className="p-1.5 rounded-lg hover:shadow-neu-raised-sm transition-shadow text-gray-500"
      >
        <ExternalLink className="w-4 h-4" />
      </button>
    </div>
  );
});

export default memo(TemplateListPage);

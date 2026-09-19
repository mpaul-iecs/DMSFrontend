import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  FileEdit,
  Loader2,
} from "lucide-react";
import Card from "../components/ui/Card";
import Tooltip from "../components/ui/Tooltip";
import Badge, { type BadgeVariant } from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Can from "../components/auth/Can";
import TemplateStatusStepper from "../components/template/TemplateStatusStepper";
import TemplateVersionAccordion from "../components/template/TemplateVersionAccordion";
import TemplateDetailSkeleton from "../components/template/TemplateDetailSkeleton";
import TemplateDocumentPreviewCard from "../components/template/TemplateDocumentPreviewCard";
import {
  IBMPlexSans400,
  IBMPlexSans600,
  IBMPlexSans700,
} from "../components/ui/Text";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  approveTemplateThunk,
  createNewVersionThunk,
  fetchReviewHistoryThunk,
  fetchTemplateAuditLogThunk,
  fetchTemplateByIdThunk,
  fetchTemplateVersionsThunk,
  rejectTemplateThunk,
  submitTemplateThunk,
  updateReviewIntervalThunk,
} from "../store/template/templateThunks";
import { clearSelectedTemplate } from "../store/template/templateSlice";
import templateService from "../services/templateService";
import toast from "../utilities/toast";
import { STATUS_LABEL } from "../utilities/templateStatus";
import { toEditorSections } from "../utilities/templateSections";
import type { TemplateStatus } from "../types/template";

const STATUS_VARIANT: Record<TemplateStatus, BadgeVariant> = {
  draft: "draft",
  pendingApproval: "pendingApproval",
  approved: "approved",
  rejected: "rejected",
  deprecated: "deprecated",
};

function TemplateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const templateId = Number(id);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    selected,
    selectedLoading,
    reviewHistory,
    auditLog,
    auditLogLoading,
    versions,
    saving,
  } = useAppSelector((s) => s.template);
  const [rejectRemarks, setRejectRemarks] = useState("");
  const [showRejectBox, setShowRejectBox] = useState(false);
  // Only holds what the user has typed (tagged with the template it was typed for); the shown
  // value falls back to the loaded template's own interval. Derived rather than copied into
  // state from an effect (react-hooks/set-state-in-effect), and a draft typed on one version
  // never leaks onto another when the route param changes.
  const [reviewInDaysDraft, setReviewInDaysDraft] = useState<{ forId: number; value: string } | null>(null);
  const reviewInDays =
    reviewInDaysDraft?.forId === templateId
      ? reviewInDaysDraft.value
      : selected
        ? String(selected.reviewInDays)
        : "";
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!Number.isNaN(templateId)) {
      dispatch(fetchTemplateByIdThunk(templateId));
      dispatch(fetchReviewHistoryThunk(templateId));
      dispatch(fetchTemplateAuditLogThunk(templateId));
      dispatch(fetchTemplateVersionsThunk(templateId));
    }
    return () => {
      dispatch(clearSelectedTemplate());
    };
  }, [dispatch, templateId]);

  // Read-only, paginated, multi-page preview — the same engine as the full editor (see
  // editor/DocumentPreview.tsx). Replaces the old hand-composed HTML preview, which didn't
  // paginate or honor pages/section titles.
  const previewSections = useMemo(() => toEditorSections(selected?.sections ?? []), [selected]);

  const handleEdit = useCallback(
    () => navigate(`/templates/${templateId}/edit`),
    [navigate, templateId],
  );
  const handleBack = useCallback(() => {
    // location.key === "default" means this is the first entry in the app's in-app history
    // (a direct URL load/refresh, or a genuinely new tab) — navigate(-1) there would leave the
    // app entirely (back to whatever page was open before this tab existed) instead of landing
    // somewhere useful, so fall back to the list. Otherwise a real in-app back (e.g. arriving here
    // from "View this version" on another version's page) goes to wherever that actually was.
    if (location.key === "default") navigate("/templates");
    else navigate(-1);
  }, [navigate, location.key]);

  const handleDownload = useCallback(async () => {
    if (!selected) return;
    setDownloading(true);
    try {
      const res = await templateService.downloadTemplate(templateId);
      const disposition = res.headers?.["content-disposition"];
      const dispositionStr =
        typeof disposition === "string" ? disposition : undefined;
      const match = dispositionStr?.match(
        /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i,
      );
      const filename = match?.[1]
        ? decodeURIComponent(match[1])
        : `${selected.templateName}-${selected.versionLabel}.docx`;
      const contentType = res.headers?.["content-type"];
      const blob = new Blob([res.data as BlobPart], {
        type:
          typeof contentType === "string"
            ? contentType
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download template document");
    } finally {
      setDownloading(false);
    }
  }, [selected, templateId]);

  const handleSubmit = useCallback(async () => {
    const res = await dispatch(submitTemplateThunk(templateId));
    if (submitTemplateThunk.fulfilled.match(res))
      toast.success("Template submitted for approval");
    else toast.error(res.payload ?? "Failed to submit template");
  }, [dispatch, templateId]);

  const handleApprove = useCallback(async () => {
    const res = await dispatch(approveTemplateThunk(templateId));
    if (approveTemplateThunk.fulfilled.match(res))
      toast.success("Template approved");
    else toast.error(res.payload ?? "Failed to approve template");
  }, [dispatch, templateId]);

  const handleShowReject = useCallback(() => setShowRejectBox(true), []);
  const handleRejectRemarksChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setRejectRemarks(e.target.value),
    [],
  );
  const handleReject = useCallback(async () => {
    if (!rejectRemarks.trim()) {
      toast.error("Remarks are required to reject a template");
      return;
    }
    const res = await dispatch(
      rejectTemplateThunk({
        id: templateId,
        payload: { remarks: rejectRemarks },
      }),
    );
    if (rejectTemplateThunk.fulfilled.match(res)) {
      toast.success("Template rejected");
      setShowRejectBox(false);
      setRejectRemarks("");
    } else toast.error(res.payload ?? "Failed to reject template");
  }, [dispatch, rejectRemarks, templateId]);

  const handleNewVersion = useCallback(async () => {
    const res = await dispatch(createNewVersionThunk(templateId));
    if (createNewVersionThunk.fulfilled.match(res)) {
      toast.success("New version created");
      navigate(`/templates/${res.payload.id}`);
    } else toast.error(res.payload ?? "Failed to create new version");
  }, [dispatch, navigate, templateId]);

  const handleReviewIntervalChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setReviewInDaysDraft({ forId: templateId, value: e.target.value }),
    [templateId],
  );
  const handleSaveReviewInterval = useCallback(async () => {
    const days = Number(reviewInDays);
    if (!Number.isInteger(days) || days <= 0) {
      toast.error("Review interval must be a positive whole number of days");
      return;
    }
    const res = await dispatch(
      updateReviewIntervalThunk({
        id: templateId,
        payload: { reviewInDays: days },
      }),
    );
    if (updateReviewIntervalThunk.fulfilled.match(res)) {
      setReviewInDaysDraft(null);
      toast.success("Review interval updated");
    } else toast.error(res.payload ?? "Failed to update review interval");
  }, [dispatch, reviewInDays, templateId]);

  if (selectedLoading || !selected) {
    return <TemplateDetailSkeleton />;
  }

  const showSubmitAction = selected.status === "draft";
  const showReviewActions = selected.status === "pendingApproval";
  const showNewVersionAction =
    selected.status === "approved" && selected.isLatestVersion;
  const showReviewIntervalEditor = selected.status === "approved";

  return (
    <div className="space-y-6">
      <button
        onClick={handleBack}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:shadow-neu-raised-sm transition-shadow text-gray-500"
      >
        <ArrowLeft className="w-4 h-4" />
        <IBMPlexSans600 as="span" className="text-sm">
          Back
        </IBMPlexSans600>
      </button>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <IBMPlexSans700 as="h1" className="text-xl text-gray-900">
            {selected.templateName}
          </IBMPlexSans700>
          <IBMPlexSans400 as="p" className="text-sm text-gray-500 mt-1">
            {selected.departmentName} · {selected.versionLabel}
          </IBMPlexSans400>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_VARIANT[selected.status]}>
            {STATUS_LABEL[selected.status]}
          </Badge>
          <Tooltip content="Download document" placement="bottom">
            <button
              onClick={handleDownload}
              aria-label="Download document"
              disabled={downloading}
              className="p-2 rounded-lg hover:shadow-neu-raised-sm transition-shadow text-gray-500 disabled:opacity-40"
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
            </button>
          </Tooltip>
          {/* Form-builder edit is available in every status (header/footer/body sections are
              editable there), so it is deliberately not gated on status === "draft". */}
          <Can idMenu={724} action="edit">
            <Button variant="secondary" size="sm" onClick={handleEdit}>
              <FileEdit className="w-4 h-4" /> Edit
            </Button>
          </Can>
        </div>
      </div>

      <Card>
        <TemplateStatusStepper status={selected.status} />
      </Card>

      {/* Left (wide): versions, then review history + activity log side by side. Right (narrower):
          the compact document preview and its actions. On small screens the preview comes first. */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 min-w-0 w-full space-y-4 order-2 lg:order-1">
          {versions.length > 1 && (
            <Card>
              <IBMPlexSans600 as="h2" className="text-sm text-gray-700 mb-3">
                Versions
              </IBMPlexSans600>
              <TemplateVersionAccordion
                versions={versions}
                currentTemplateId={templateId}
              />
            </Card>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
            <Card>
              <IBMPlexSans600 as="h2" className="text-sm text-gray-700 mb-3">
                Review history
              </IBMPlexSans600>
              {reviewHistory.length === 0 ? (
                <IBMPlexSans400 as="p" className="text-sm text-gray-400">
                  No review cycles yet
                </IBMPlexSans400>
              ) : (
                <ol className="space-y-0">
                  {reviewHistory.map((cycle, idx) => (
                    <li key={cycle.id} className="relative flex gap-3 pb-4">
                      {idx < reviewHistory.length - 1 && (
                        <span className="absolute left-[4.5px] top-4 bottom-0 w-px bg-gray-300" />
                      )}
                      <span
                        className={`relative z-10 w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                          cycle.outcome === "approved"
                            ? "bg-success-500"
                            : cycle.outcome === "rejected"
                              ? "bg-danger-500"
                              : "bg-gray-300"
                        }`}
                      />
                      <div>
                        <IBMPlexSans600 as="p" className="text-sm text-gray-800">
                          Cycle #{cycle.cycleNumber} · {cycle.triggerReason}
                        </IBMPlexSans600>
                        <IBMPlexSans400 as="p" className="text-xs text-gray-500">
                          Due {new Date(cycle.dueOn).toLocaleDateString()}
                          {cycle.reviewedOn &&
                            ` · reviewed ${new Date(cycle.reviewedOn).toLocaleDateString()}`}
                        </IBMPlexSans400>
                        {cycle.remarks && (
                          <IBMPlexSans400
                            as="p"
                            className="text-xs text-gray-500 mt-0.5"
                          >
                            {cycle.remarks}
                          </IBMPlexSans400>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Card>

            <Card>
              <IBMPlexSans600 as="h2" className="text-sm text-gray-700 mb-3">
                Activity log
              </IBMPlexSans600>
              {auditLogLoading ? (
                <div className="flex items-center justify-center py-6 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : auditLog.length === 0 ? (
                <IBMPlexSans400 as="p" className="text-sm text-gray-400">
                  No activity recorded yet
                </IBMPlexSans400>
              ) : (
                <ol className="space-y-0">
                  {auditLog.map((entry, idx) => (
                    <li key={entry.id} className="relative flex gap-3 pb-4">
                      {idx < auditLog.length - 1 && (
                        <span className="absolute left-[4.5px] top-4 bottom-0 w-px bg-gray-300" />
                      )}
                      <span className="relative z-10 w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 bg-primary-500" />
                      <div>
                        <IBMPlexSans600 as="p" className="text-sm text-gray-800">
                          {entry.action}
                          {entry.performedByUserId != null &&
                            ` by User #${entry.performedByUserId}`}
                        </IBMPlexSans600>
                        <IBMPlexSans400 as="p" className="text-xs text-gray-500">
                          {new Date(entry.performedAt).toLocaleString()}
                        </IBMPlexSans400>
                        {entry.newValues && (
                          <IBMPlexSans400
                            as="p"
                            className="text-xs text-gray-500 mt-0.5"
                          >
                            {entry.newValues}
                          </IBMPlexSans400>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>
        </div>

        <div className="w-full lg:w-100 shrink-0 space-y-4 order-1 lg:order-2">
          <TemplateDocumentPreviewCard
            title="Document preview"
            subtitle="read-only"
            sections={previewSections}
          />

          <div className="flex flex-wrap items-center gap-2">
            <Can idMenu={724} action="edit">
              {showSubmitAction && (
                <Button onClick={handleSubmit} loading={saving} size="sm">
                  Submit for approval
                </Button>
              )}
            </Can>
            <Can idMenu={724} action="edit">
              {showReviewActions && (
                <Button
                  onClick={handleApprove}
                  loading={saving}
                  size="sm"
                  variant="success"
                >
                  Approve
                </Button>
              )}
            </Can>
            <Can idMenu={724} action="edit">
              {showReviewActions && (
                <Button onClick={handleShowReject} size="sm" variant="danger">
                  Reject
                </Button>
              )}
            </Can>
            <Can idMenu={724} action="create">
              {showNewVersionAction && (
                <Button
                  onClick={handleNewVersion}
                  loading={saving}
                  size="sm"
                  variant="secondary"
                >
                  Create new version
                </Button>
              )}
            </Can>
          </div>

          {showRejectBox && (
            <Card>
              <Input
                label="Rejection remarks"
                value={rejectRemarks}
                onChange={handleRejectRemarksChange}
                placeholder="Explain why this template is being rejected"
              />
              <div className="mt-3">
                <Button
                  onClick={handleReject}
                  loading={saving}
                  size="sm"
                  variant="danger"
                >
                  Confirm reject
                </Button>
              </div>
            </Card>
          )}

          {showReviewIntervalEditor && (
            <Can idMenu={724} action="edit">
              <Card>
                <IBMPlexSans600 as="h2" className="text-sm text-gray-700 mb-3">
                  Review interval
                </IBMPlexSans600>
                <div className="flex items-end gap-3">
                  <Input
                    label="Days between reviews"
                    type="number"
                    min={1}
                    value={reviewInDays}
                    onChange={handleReviewIntervalChange}
                    className="max-w-45 no-spinner"
                  />
                  <Button
                    onClick={handleSaveReviewInterval}
                    loading={saving}
                    size="sm"
                  >
                    Save
                  </Button>
                </div>
              </Card>
            </Can>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(TemplateDetailPage);

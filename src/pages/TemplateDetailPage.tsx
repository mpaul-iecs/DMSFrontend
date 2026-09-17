import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, ExternalLink, FileEdit, Loader2 } from "lucide-react";
import Card from "../components/ui/Card";
import Badge, { type BadgeVariant } from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Can from "../components/auth/Can";
import TemplateStatusStepper from "../components/template/TemplateStatusStepper";
import { IBMPlexSans400, IBMPlexSans600, IBMPlexSans700 } from "../components/ui/Text";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  approveTemplateThunk,
  createNewVersionThunk,
  fetchReviewHistoryThunk,
  fetchTemplateAuditLogThunk,
  fetchTemplateByIdThunk,
  rejectTemplateThunk,
  submitTemplateThunk,
  updateReviewIntervalThunk,
} from "../store/template/templateThunks";
import { clearSelectedTemplate } from "../store/template/templateSlice";
import templateService from "../services/templateService";
import toast from "../utilities/toast";
import { STATUS_LABEL } from "../utilities/templateStatus";
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
  const { selected, selectedLoading, reviewHistory, auditLog, auditLogLoading, saving } = useAppSelector(
    (s) => s.template,
  );
  const [rejectRemarks, setRejectRemarks] = useState("");
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [reviewInDays, setReviewInDays] = useState<string>("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!Number.isNaN(templateId)) {
      dispatch(fetchTemplateByIdThunk(templateId));
      dispatch(fetchReviewHistoryThunk(templateId));
      dispatch(fetchTemplateAuditLogThunk(templateId));
    }
    return () => {
      dispatch(clearSelectedTemplate());
    };
  }, [dispatch, templateId]);

  useEffect(() => {
    if (selected) setReviewInDays(String(selected.reviewInDays));
  }, [selected]);

  // Composed read-only preview — no rendition endpoint exists on the backend, so the
  // header/body/footer HTML is bucketed client-side from TemplateDto.sections[] by
  // sectionKind, in sectionOrder for the body. See CLAUDE.md's "Template governance" note.
  const { headerHtml, bodyHtml, footerHtml } = useMemo(() => {
    const sections = selected?.sections ?? [];
    const header = sections.find((s) => s.sectionKind === "header")?.defaultContentHtml ?? "";
    const footer = sections.find((s) => s.sectionKind === "footer")?.defaultContentHtml ?? "";
    const body = sections
      .filter((s) => s.sectionKind === "section")
      .sort((a, b) => a.sectionOrder - b.sectionOrder)
      .map((s) => s.defaultContentHtml)
      .join("\n");
    return { headerHtml: header, bodyHtml: body, footerHtml: footer };
  }, [selected]);

  const handleOpenNewTab = useCallback(() => {
    // Deliberately no "noopener,noreferrer" — see the matching comment in TemplateListPage.tsx's
    // TemplateRowActions.handleOpenNewTab for why severing the opener relationship breaks
    // sessionStorage-based auth in the new tab.
    window.open(`/templates/${templateId}`, "_blank");
  }, [templateId]);

  const handleEdit = useCallback(() => navigate(`/templates/${templateId}/edit`), [navigate, templateId]);
  const handleBack = useCallback(() => navigate(-1), [navigate]);

  const handleDownload = useCallback(async () => {
    if (!selected) return;
    setDownloading(true);
    try {
      const res = await templateService.downloadTemplate(templateId);
      const disposition = res.headers?.["content-disposition"];
      const dispositionStr = typeof disposition === "string" ? disposition : undefined;
      const match = dispositionStr?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
      const filename = match?.[1] ? decodeURIComponent(match[1]) : `${selected.templateName}-${selected.versionLabel}.docx`;
      const contentType = res.headers?.["content-type"];
      const blob = new Blob([res.data as BlobPart], {
        type: typeof contentType === "string" ? contentType : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
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
    if (submitTemplateThunk.fulfilled.match(res)) toast.success("Template submitted for approval");
    else toast.error(res.payload ?? "Failed to submit template");
  }, [dispatch, templateId]);

  const handleApprove = useCallback(async () => {
    const res = await dispatch(approveTemplateThunk(templateId));
    if (approveTemplateThunk.fulfilled.match(res)) toast.success("Template approved");
    else toast.error(res.payload ?? "Failed to approve template");
  }, [dispatch, templateId]);

  const handleShowReject = useCallback(() => setShowRejectBox(true), []);
  const handleRejectRemarksChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setRejectRemarks(e.target.value),
    [],
  );
  const handleReject = useCallback(async () => {
    if (!rejectRemarks.trim()) {
      toast.error("Remarks are required to reject a template");
      return;
    }
    const res = await dispatch(rejectTemplateThunk({ id: templateId, payload: { remarks: rejectRemarks } }));
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
    (e: React.ChangeEvent<HTMLInputElement>) => setReviewInDays(e.target.value),
    [],
  );
  const handleSaveReviewInterval = useCallback(async () => {
    const days = Number(reviewInDays);
    if (!Number.isInteger(days) || days <= 0) {
      toast.error("Review interval must be a positive whole number of days");
      return;
    }
    const res = await dispatch(updateReviewIntervalThunk({ id: templateId, payload: { reviewInDays: days } }));
    if (updateReviewIntervalThunk.fulfilled.match(res)) toast.success("Review interval updated");
    else toast.error(res.payload ?? "Failed to update review interval");
  }, [dispatch, reviewInDays, templateId]);

  if (selectedLoading || !selected) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const showSubmitAction = selected.status === "draft";
  const showReviewActions = selected.status === "pendingApproval";
  const showNewVersionAction = selected.status === "approved" && selected.isLatestVersion;
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
            {selected.departmentName} · v{selected.versionLabel}
          </IBMPlexSans400>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_VARIANT[selected.status]}>{STATUS_LABEL[selected.status]}</Badge>
          <button
            onClick={handleDownload}
            title="Download document"
            disabled={downloading}
            className="p-2 rounded-lg hover:shadow-neu-raised-sm transition-shadow text-gray-500 disabled:opacity-40"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          </button>
          <button
            onClick={handleOpenNewTab}
            title="Open in new tab"
            className="p-2 rounded-lg hover:shadow-neu-raised-sm transition-shadow text-gray-500"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
          {selected.status === "draft" && (
            <Can idMenu={724} action="edit">
              <Button variant="secondary" size="sm" onClick={handleEdit}>
                <FileEdit className="w-4 h-4" /> Edit
              </Button>
            </Can>
          )}
        </div>
      </div>

      <Card>
        <TemplateStatusStepper status={selected.status} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <IBMPlexSans600 as="h2" className="text-sm text-gray-700 mb-3">
              Document preview (read-only)
            </IBMPlexSans600>
            <div className="bg-surface-200/60 rounded-xl p-6">
              {/* Width scales responsively (w-full up to the A4 max-width); height is its own
                  fixed baseline (min-h-250, matching an A4 page at this width) and grows only
                  if content genuinely exceeds it — deliberately NOT tied to width via
                  aspect-ratio, since that made the box taller/shorter as the column resized. */}
              <div className="mx-auto w-full max-w-198.5 min-h-250 rounded-sm shadow-neu-raised bg-white px-16 py-14 space-y-4">
                {headerHtml && (
                  <div className="border-b border-gray-200 pb-3 text-sm" dangerouslySetInnerHTML={{ __html: headerHtml }} />
                )}
                <div className="text-sm min-h-50" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
                {footerHtml && (
                  <div className="border-t border-gray-200 pt-3 text-sm" dangerouslySetInnerHTML={{ __html: footerHtml }} />
                )}
              </div>
            </div>
          </Card>

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
                <Button onClick={handleApprove} loading={saving} size="sm" variant="success">
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
                <Button onClick={handleNewVersion} loading={saving} size="sm" variant="secondary">
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
                <Button onClick={handleReject} loading={saving} size="sm" variant="danger">
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
                    className="max-w-[180px]"
                  />
                  <Button onClick={handleSaveReviewInterval} loading={saving} size="sm">
                    Save
                  </Button>
                </div>
              </Card>
            </Can>
          )}
        </div>

        <div className="space-y-4">
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
                        {cycle.reviewedOn && ` · reviewed ${new Date(cycle.reviewedOn).toLocaleDateString()}`}
                      </IBMPlexSans400>
                      {cycle.remarks && (
                        <IBMPlexSans400 as="p" className="text-xs text-gray-500 mt-0.5">
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
                        {entry.performedByUserId != null && ` by User #${entry.performedByUserId}`}
                      </IBMPlexSans600>
                      <IBMPlexSans400 as="p" className="text-xs text-gray-500">
                        {new Date(entry.performedAt).toLocaleString()}
                      </IBMPlexSans400>
                      {entry.newValues && (
                        <IBMPlexSans400 as="p" className="text-xs text-gray-500 mt-0.5">
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
    </div>
  );
}

export default memo(TemplateDetailPage);

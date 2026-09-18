import { memo, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Accordion, { type AccordionItem } from "../ui/Accordion";
import Badge, { type BadgeVariant } from "../ui/Badge";
import { IBMPlexSans400, IBMPlexSans600 } from "../ui/Text";
import { STATUS_LABEL } from "../../utilities/templateStatus";
import type { TemplateListItemDto, TemplateStatus } from "../../types/template";

const STATUS_VARIANT: Record<TemplateStatus, BadgeVariant> = {
  draft: "draft",
  pendingApproval: "pendingApproval",
  approved: "approved",
  rejected: "rejected",
  deprecated: "deprecated",
};

interface TemplateVersionAccordionProps {
  /** Already ordered latest-first by the backend (GET /templates/{id}/versions walks the real
   * ParentTemplateId lineage, not a TemplateName match — see CLAUDE.md's "Template governance"
   * note on why name-matching silently merged unrelated templates that happened to share a name
   * from before uniqueness was enforced). */
  versions: TemplateListItemDto[];
  currentTemplateId: number;
}

/** Version history for one template family, built on the generic ui/Accordion — the latest
 * version (first in the already-sorted list) starts expanded, every other version starts
 * collapsed. Expanding a version that isn't the one currently open on this page navigates to
 * its own detail page rather than rendering a second inline preview. */
function TemplateVersionAccordion({ versions, currentTemplateId }: TemplateVersionAccordionProps) {
  const navigate = useNavigate();

  const handleView = useCallback(
    (id: number) => {
      if (id !== currentTemplateId) navigate(`/templates/${id}`);
    },
    [currentTemplateId, navigate],
  );

  const items = useMemo<AccordionItem[]>(
    () =>
      versions.map((version) => ({
        id: version.id,
        header: (
          <div className="flex items-center justify-between gap-2 w-full">
            <span className="flex items-center gap-2 min-w-0">
              {version.versionLabel}
              {version.id === currentTemplateId && (
                <IBMPlexSans400 as="span" className="text-xs text-primary-600 font-normal">
                  (viewing)
                </IBMPlexSans400>
              )}
            </span>
            <Badge variant={STATUS_VARIANT[version.status]}>{STATUS_LABEL[version.status]}</Badge>
          </div>
        ),
        content: (
          <>
            <IBMPlexSans400 as="p" className="text-xs text-gray-500">
              Updated {new Date(version.updatedAt).toLocaleString()}
            </IBMPlexSans400>
            {version.nextReviewDueOn && (
              <IBMPlexSans400 as="p" className="text-xs text-gray-500">
                Next review due {new Date(version.nextReviewDueOn).toLocaleDateString()}
              </IBMPlexSans400>
            )}
            {version.id !== currentTemplateId && (
              <VersionViewButton id={version.id} onView={handleView} />
            )}
          </>
        ),
      })),
    [versions, currentTemplateId, handleView],
  );

  if (versions.length === 0) return null;

  return <Accordion items={items} defaultExpandedId={versions[0]?.id ?? null} />;
}

interface VersionViewButtonProps {
  id: number;
  onView: (id: number) => void;
}

const VersionViewButton = memo(function VersionViewButton({ id, onView }: VersionViewButtonProps) {
  const handleClick = useCallback(() => onView(id), [id, onView]);
  return (
    <button type="button" onClick={handleClick} className="mt-1 text-xs text-primary-600 hover:underline">
      <IBMPlexSans600 as="span">View this version</IBMPlexSans600>
    </button>
  );
});

export default memo(TemplateVersionAccordion);

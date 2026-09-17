import { memo, useMemo } from "react";
import { Check, X, Clock, FileEdit, Archive } from "lucide-react";
import type { TemplateStatus } from "../../types/template";
import { IBMPlexSans600 } from "../ui/Text";

interface StepMeta {
  key: TemplateStatus;
  label: string;
  icon: typeof Check;
}

const HAPPY_PATH: StepMeta[] = [
  { key: "draft", label: "Draft", icon: FileEdit },
  { key: "pendingApproval", label: "Pending approval", icon: Clock },
  { key: "approved", label: "Approved", icon: Check },
];

/** Circle color per step state, keyed by whether the step is done/current/rejected/upcoming. */
const CIRCLE_CLASS = {
  done: "bg-linear-to-br from-success-500 to-success-600 text-white shadow-neu-raised-sm",
  current: "bg-linear-to-br from-primary-500 to-primary-700 text-white shadow-neu-raised-sm",
  rejected: "bg-linear-to-br from-danger-500 to-danger-600 text-white shadow-neu-raised-sm",
  deprecated: "bg-linear-to-br from-gray-400 to-gray-500 text-white shadow-neu-raised-sm",
  upcoming: "bg-surface-100 text-gray-400 shadow-neu-pressed-sm",
};

interface TemplateStatusStepperProps {
  status: TemplateStatus;
  className?: string;
}

/**
 * Color-coded workflow stepper for a template's lifecycle — reused on both the template
 * detail page and (compactly) anywhere a status needs a visual, not just a Badge pill.
 * draft -> pendingApproval -> approved is the happy path; rejected/deprecated are terminal
 * side-states rendered as a single highlighted final circle instead of forcing them onto
 * the 3-step line.
 */
function TemplateStatusStepper({ status, className = "" }: TemplateStatusStepperProps) {
  const currentIndex = useMemo(() => HAPPY_PATH.findIndex((s) => s.key === status), [status]);
  const isSideState = status === "rejected" || status === "deprecated";

  const steps = useMemo(() => {
    if (isSideState) {
      return [
        { key: "draft" as TemplateStatus, label: "Draft", icon: FileEdit, state: "done" as const },
        { key: "pendingApproval" as TemplateStatus, label: "Pending approval", icon: Clock, state: "done" as const },
        {
          key: status,
          label: status === "rejected" ? "Rejected" : "Deprecated",
          icon: status === "rejected" ? X : Archive,
          state: status === "rejected" ? ("rejected" as const) : ("deprecated" as const),
        },
      ];
    }
    return HAPPY_PATH.map((s, idx) => ({
      ...s,
      state: idx < currentIndex ? ("done" as const) : idx === currentIndex ? ("current" as const) : ("upcoming" as const),
    }));
  }, [currentIndex, isSideState, status]);

  return (
    <div className={`flex items-start ${className}`}>
      {steps.map((step, idx) => {
        const Icon = step.icon;
        return (
          <div key={step.key} className="flex items-start flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <span className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center ${CIRCLE_CLASS[step.state]}`}>
                <Icon className="w-4 h-4" />
              </span>
              <IBMPlexSans600 as="span" className="text-[11px] text-gray-600 text-center whitespace-nowrap">
                {step.label}
              </IBMPlexSans600>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`h-0.5 flex-1 mt-4.5 -mx-1 rounded-full ${
                  step.state === "done" ? "bg-success-500" : "bg-gray-300"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default memo(TemplateStatusStepper);

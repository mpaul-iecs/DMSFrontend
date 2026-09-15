import { memo } from "react";
import { Inbox, type LucideIcon } from "lucide-react";
import { IBMPlexSans400 } from "./Text";

interface EmptyStateProps {
  message?: string;
  icon?: LucideIcon;
}

function EmptyState({ message = "No data found", icon: Icon = Inbox }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
      <Icon className="w-12 h-12 stroke-1" />
      <p className="text-sm">
        <IBMPlexSans400>{message}</IBMPlexSans400>
      </p>
    </div>
  );
}

export default memo(EmptyState);

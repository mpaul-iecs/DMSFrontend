import { Loader2 } from "lucide-react";

interface LoaderProps {
  text?: string;
}

export default function Loader({ text = "Loading..." }:LoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      <p className="text-sm">{text}</p>
    </div>
  );
}
"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export function ErrorRetry({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="card flex items-center justify-between gap-3 border-amber-300 bg-amber-50">
      <p className="flex items-center gap-2 text-sm text-amber-900">
        <AlertTriangle size={16} aria-hidden /> {message}
      </p>
      <button
        onClick={onRetry}
        className="flex shrink-0 items-center gap-1 rounded-lg border border-amber-400 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
      >
        <RefreshCw size={12} aria-hidden /> Retry
      </button>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Portal error:", error);
  }, [error]);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-slate-100 gap-4 p-6 text-center">
      <AlertCircle className="text-red-500" size={36} />
      <div>
        <h1 className="text-lg font-semibold text-slate-800">Something went wrong</h1>
        <p className="text-sm text-slate-600 mt-1 max-w-sm">
          The page hit an unexpected error. Refresh usually fixes this — you do not need to restart
          the dev server for a normal browser refresh.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-1.5 rounded-md bg-[#1a3c6e] px-4 py-2 text-sm font-medium text-white hover:bg-[#15325c]"
        >
          <RotateCcw size={16} />
          Try again
        </button>
        <a
          href="/login"
          className="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Go to login
        </a>
      </div>
    </div>
  );
}

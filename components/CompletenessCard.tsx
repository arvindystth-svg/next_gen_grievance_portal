"use client";

import { AlertCircle, CheckCircle2, ChevronRight } from "lucide-react";
import { CompletenessReport } from "@/lib/complaintCompleteness";

interface CompletenessCardProps {
  report: CompletenessReport;
  onFixField?: (fieldId: string) => void;
}

function scoreColor(score: number): string {
  if (score >= 100) return "text-green-600";
  if (score >= 70) return "text-amber-600";
  return "text-red-600";
}

function barColor(score: number): string {
  if (score >= 100) return "bg-green-500";
  if (score >= 70) return "bg-amber-500";
  return "bg-red-500";
}

export default function CompletenessCard({ report, onFixField }: CompletenessCardProps) {
  const { score, missing, completed } = report;

  return (
    <div
      className={`rounded-2xl border overflow-hidden ${
        score >= 100
          ? "bg-green-50 border-green-200"
          : score >= 70
          ? "bg-amber-50 border-amber-200"
          : "bg-red-50 border-red-200"
      }`}
    >
      <div className="px-5 py-4 border-b border-inherit">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Complaint Completeness
            </p>
            <p className="text-sm text-slate-700 mt-0.5">
              {score >= 100
                ? "Your complaint has all key details — ready to submit."
                : "Add the missing details below to reach 100% completeness."}
            </p>
          </div>
          <div className="text-center flex-shrink-0">
            <div className={`text-3xl font-black ${scoreColor(score)}`}>{score}%</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Complete</div>
          </div>
        </div>
        <div className="h-2.5 bg-white/70 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor(score)}`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {missing.length > 0 && (
        <div className="px-5 py-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <AlertCircle size={13} className="text-amber-600" />
            Missing details ({missing.length})
          </p>
          <ul className="space-y-2">
            {missing.map((field) => (
              <li
                key={field.id}
                className="bg-white/80 border border-white rounded-xl px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{field.label}</p>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{field.fillHint}</p>
                  </div>
                  {onFixField && ["description", "location", "ward", "landmark", "timeline"].includes(field.id) && (
                    <button
                      type="button"
                      onClick={() => onFixField(field.id)}
                      className="flex-shrink-0 text-xs font-semibold text-[#1a3c6e] hover:underline flex items-center gap-0.5"
                    >
                      Fix
                      <ChevronRight size={12} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {completed.length > 0 && (
        <div className="px-5 pb-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-green-600" />
            Provided ({completed.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {completed.map((field) => (
              <span
                key={field.id}
                className="text-[10px] font-medium bg-green-100 text-green-800 px-2 py-1 rounded-full"
              >
                ✓ {field.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

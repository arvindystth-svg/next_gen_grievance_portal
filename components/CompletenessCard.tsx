"use client";

import { AlertCircle, CheckCircle2, ChevronRight, Sparkles } from "lucide-react";
import {
  CompletenessReport,
  SupplementalDetailId,
  SupplementalDetails,
  DETAIL_INPUT_CONFIG,
  validateSupplementalDetail,
} from "@/lib/complaintCompleteness";
import WardAreaSelector from "@/components/WardAreaSelector";

interface CompletenessCardProps {
  report: CompletenessReport;
  supplementalDetails: SupplementalDetails;
  autoFilledDetails?: Partial<Record<SupplementalDetailId, boolean>>;
  selectedArea?: { ward: string; zone: string; locality: string } | null;
  onDetailChange: (id: SupplementalDetailId, value: string) => void;
  onDetailBlur?: (id: SupplementalDetailId, value: string) => void;
  onWardAreaChange?: (area: { ward: string; zone: string; locality: string }) => void;
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

function isInteractiveFieldId(id: string): id is SupplementalDetailId {
  return id in DETAIL_INPUT_CONFIG;
}

export default function CompletenessCard({
  report,
  supplementalDetails,
  autoFilledDetails = {},
  selectedArea,
  onDetailChange,
  onDetailBlur,
  onWardAreaChange,
  onFixField,
}: CompletenessCardProps) {
  const { score, missing, completed, fields } = report;

  const interactiveToShow = fields.filter(
    (f): f is CompletenessReport["fields"][number] & { id: SupplementalDetailId } =>
      isInteractiveFieldId(f.id) &&
      (!f.completed ||
        Boolean(supplementalDetails[f.id]?.trim()) ||
        Boolean(autoFilledDetails[f.id]))
  );

  const nonInteractiveMissing = missing.filter((f) => !isInteractiveFieldId(f.id));

  const providedDisplay = completed.filter((f) => {
    if (isInteractiveFieldId(f.id) && (supplementalDetails[f.id]?.trim() || autoFilledDetails[f.id])) {
      return false;
    }
    return true;
  });

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
                ? "All key details captured — continue to summary."
                : "Fill missing details below. Values auto-filled from your complaint can be changed."}
            </p>
          </div>
          <div className="text-center flex-shrink-0">
            <div className={`text-3xl font-black transition-all duration-300 ${scoreColor(score)}`}>
              {score}%
            </div>
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

      {interactiveToShow.length > 0 && (
        <div className="px-5 py-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <AlertCircle size={13} className="text-amber-600" />
            Missing details
          </p>
          <ul className="space-y-3">
            {interactiveToShow.map((field) => {
              const detailId = field.id;
              const config = DETAIL_INPUT_CONFIG[detailId];
              const value = supplementalDetails[detailId] || "";
              const validationStatus = validateSupplementalDetail(detailId, value);
              const isAutoFilled = Boolean(autoFilledDetails[detailId]);

              return (
                <li
                  key={field.id}
                  className={`bg-white/80 border rounded-xl px-4 py-3 ${
                    field.completed ? "border-green-200" : "border-white"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p className="text-sm font-semibold text-slate-800">{field.label}</p>
                    {isAutoFilled && (
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <Sparkles size={9} />
                        Auto-filled
                      </span>
                    )}
                    {field.completed && !isAutoFilled && (
                      <span className="text-[10px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">
                        Added
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mb-2">{field.fillHint}</p>

                  {isAutoFilled && (
                    <p className="text-[11px] text-blue-600 mb-2">
                      Auto-filled based on your complaint — change below if incorrect.
                    </p>
                  )}

                  <div onMouseDown={(e) => e.stopPropagation()}>
                    {detailId === "ward" && onWardAreaChange ? (
                      <WardAreaSelector
                        value={selectedArea ?? null}
                        onChange={(area) => onWardAreaChange(area)}
                      />
                    ) : config.multiline ? (
                      <textarea
                        value={value}
                        onChange={(e) => onDetailChange(detailId, e.target.value)}
                        onBlur={(e) => onDetailBlur?.(detailId, e.target.value)}
                        placeholder={config.placeholder}
                        rows={detailId === "landmark" ? 3 : 2}
                        autoComplete="off"
                        name={`supplemental-${detailId}`}
                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 resize-none text-slate-800 ${
                          validationStatus === "valid"
                            ? "border-green-300 focus:border-green-500 focus:ring-green-100"
                            : validationStatus === "pending"
                            ? "border-amber-300 focus:border-amber-500 focus:ring-amber-100"
                            : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                        }`}
                      />
                    ) : (
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => onDetailChange(detailId, e.target.value)}
                        onBlur={(e) => onDetailBlur?.(detailId, e.target.value)}
                        placeholder={config.placeholder}
                        autoComplete="off"
                        name={`supplemental-${detailId}`}
                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 text-slate-800 ${
                          validationStatus === "valid"
                            ? "border-green-300 focus:border-green-500 focus:ring-green-100"
                            : validationStatus === "pending"
                            ? "border-amber-300 focus:border-amber-500 focus:ring-amber-100"
                            : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                        }`}
                      />
                    )}
                    {detailId !== "ward" && validationStatus === "valid" && (
                      <p className="text-[11px] text-green-600 mt-1.5 flex items-center gap-1">
                        <CheckCircle2 size={11} />
                        Accepted — completeness updated
                      </p>
                    )}
                    {detailId !== "ward" && validationStatus === "pending" && value.trim() && (
                      <p className="text-[11px] text-amber-600 mt-1.5">
                        Keep typing — e.g. {config.placeholder}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {nonInteractiveMissing.length > 0 && (
        <div className="px-5 py-4 space-y-2 border-t border-inherit">
          {nonInteractiveMissing.map((field) => (
            <div key={field.id} className="bg-white/80 border border-white rounded-xl px-4 py-3">
              <p className="text-sm font-semibold text-slate-800">{field.label}</p>
              <p className="text-xs text-slate-600 mt-1">{field.fillHint}</p>
              {onFixField && (
                <button
                  type="button"
                  onClick={() => onFixField(field.id)}
                  className="mt-2 text-xs font-semibold text-[#1a3c6e] hover:underline flex items-center gap-0.5"
                >
                  Go to routing section
                  <ChevronRight size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {providedDisplay.length > 0 && (
        <div
          className={`px-5 pb-4 ${
            interactiveToShow.length > 0 || nonInteractiveMissing.length > 0 ? "pt-1" : "pt-4"
          }`}
        >
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-green-600" />
            Provided ({providedDisplay.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {providedDisplay.map((field) => (
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

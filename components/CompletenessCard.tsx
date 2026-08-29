"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, ChevronRight, ClipboardList, Sparkles } from "lucide-react";
import {
  CompletenessReport,
  SupplementalDetailId,
  SupplementalDetails,
  DETAIL_INPUT_CONFIG,
  validateSupplementalDetail,
} from "@/lib/complaintCompleteness";
import WardAreaSelector from "@/components/WardAreaSelector";
import { useLanguage } from "@/lib/LanguageContext";
import { CollapsibleSectionHeader } from "@/components/CollapsibleSectionHeader";

interface CompletenessCardProps {
  report: CompletenessReport;
  supplementalDetails: SupplementalDetails;
  autoFilledDetails?: Partial<Record<SupplementalDetailId, boolean>>;
  selectedArea?: { ward: string; zone: string; locality: string } | null;
  onDetailChange: (id: SupplementalDetailId, value: string) => void;
  onDetailBlur?: (id: SupplementalDetailId, value: string) => void;
  onWardAreaChange?: (area: { ward: string; zone: string; locality: string } | null) => void;
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
  const { t } = useLanguage();
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

  const [expanded, setExpanded] = useState(score < 100);
  const missingLabels = missing.map((f) => f.label);
  const collapsedSummary =
    score >= 100
      ? t("completeness.allCaptured")
      : missingLabels.length > 0
      ? t("completeness.needs", { items: `${missingLabels.slice(0, 3).join(", ")}${missingLabels.length > 3 ? "…" : ""}` })
      : t("completeness.someNeeded");

  return (
    <div
      id="completeness-section"
      className={`rounded-xl overflow-hidden transition-shadow ${
        expanded
          ? score >= 100
            ? "border-2 border-green-300 bg-green-50 shadow-md"
            : score >= 70
            ? "border-2 border-amber-300 bg-amber-50 shadow-md"
            : "border-2 border-red-300 bg-red-50 shadow-md"
          : score >= 100
          ? "border-2 border-dashed border-green-300 bg-green-50/80 shadow-sm hover:border-green-400"
          : score >= 70
          ? "border-2 border-dashed border-amber-300 bg-amber-50/80 shadow-sm hover:border-amber-400"
          : "border-2 border-dashed border-red-300 bg-red-50/80 shadow-sm hover:border-red-400"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full px-4 py-3.5 text-left hover:bg-white/50 transition-colors"
      >
        <CollapsibleSectionHeader
          expanded={expanded}
          icon={<ClipboardList size={18} className="text-blue-600" />}
          title={t("completeness.title")}
          trailing={
            <div className="text-right">
              <div className={`text-xl font-black leading-none ${scoreColor(score)}`}>{score}%</div>
              <div className="text-[10px] text-slate-600 font-semibold uppercase tracking-wide">
                {t("completeness.complete")}
              </div>
            </div>
          }
          subtitle={
            !expanded ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700 line-clamp-2">{collapsedSummary}</p>
                <div className="h-2 bg-white/80 rounded-full overflow-hidden border border-white">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor(score)}`}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            ) : undefined
          }
        />
      </button>

      {expanded && (
        <>
      <div className="px-5 py-3 border-t-2 border-inherit bg-white/60">
        <p className="text-sm font-medium text-slate-800">
          {score >= 100 ? t("completeness.allDone") : t("completeness.fillHint")}
        </p>
        <div className="h-2.5 bg-white/70 rounded-full overflow-hidden mt-3">
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
            {t("completeness.missing")}
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
                        {t("completeness.autofilled")}
                      </span>
                    )}
                    {field.completed && !isAutoFilled && (
                      <span className="text-[10px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">
                        {t("completeness.added")}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mb-2">{field.fillHint}</p>

                  {isAutoFilled && (
                    <p className="text-[11px] text-blue-600 mb-2">
                      {t("completeness.autofilledHint")}
                    </p>
                  )}

                  <div onMouseDown={(e) => e.stopPropagation()}>
                    {detailId === "ward" && onWardAreaChange ? (
                      <WardAreaSelector
                        compact
                        hideLabel
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
                        {t("completeness.accepted")}
                      </p>
                    )}
                    {detailId !== "ward" && validationStatus === "pending" && value.trim() && (
                      <p className="text-[11px] text-amber-600 mt-1.5">
                        {t("completeness.keepTyping", { example: config.placeholder })}
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
                  {t("completeness.goRouting")}
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
            {t("completeness.provided", { n: providedDisplay.length })}
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
        </>
      )}
    </div>
  );
}

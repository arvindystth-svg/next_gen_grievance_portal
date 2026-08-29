"use client";

import { Clock, FileText, Play, Trash2, MapPin, Building2, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { ComplaintDraft, DraftStep, formatDraftSavedAt } from "@/lib/complaintDraft";
import { TranslationKey } from "@/lib/i18n";

interface DraftPanelProps {
  draft: ComplaintDraft | null;
  onResume: () => void;
  onDiscard: () => void;
}

function stepTranslationKey(step: DraftStep): TranslationKey {
  const map: Record<DraftStep, TranslationKey> = {
    1: "step.describe",
    2: "step.analyze",
    3: "step.review",
    4: "step.summary",
    5: "step.submit",
  };
  return map[step];
}

const STEP_ORDER: DraftStep[] = [1, 2, 3, 4, 5];

export default function DraftPanel({ draft, onResume, onDiscard }: DraftPanelProps) {
  const { t } = useLanguage();

  if (!draft) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
        <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText size={24} className="text-slate-400" />
        </div>
        <p className="text-slate-500 text-sm leading-relaxed">{t("draft.empty")}</p>
      </div>
    );
  }

  const completedThrough = draft.maxStepReached ?? draft.step;
  const resumeStep: DraftStep =
    draft.step === 2 && draft.analysisResult ? 3 : Math.min(completedThrough, 4) as DraftStep;

  return (
    <div className="bg-white border border-amber-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="bg-amber-50 border-b border-amber-100 px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
            <FileText size={18} className="text-amber-700" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-amber-900 text-sm">{t("draft.savedTitle")}</h3>
            <p className="text-xs text-amber-800 mt-0.5 flex items-center gap-1">
              <Clock size={11} />
              {t("draft.savedAt", { date: formatDraftSavedAt(draft.savedAt) })}
            </p>
            <p className="text-xs text-amber-700 mt-1">
              {t("draft.step", { step: t(stepTranslationKey(resumeStep)) })}
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 py-4 border-b border-amber-100 bg-white">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
              {t("draft.progress")}
            </p>
        <div className="flex items-center justify-between gap-1">
          {STEP_ORDER.slice(0, 4).map((stepNum) => {
            const done = completedThrough >= stepNum;
            return (
              <div key={stepNum} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    done ? "bg-green-500 text-white" : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {done ? <CheckCircle2 size={12} /> : stepNum}
                </div>
                <span className={`text-[9px] text-center leading-tight ${done ? "text-green-700 font-medium" : "text-slate-400"}`}>
                  {t(stepTranslationKey(stepNum))}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            {t("draft.complaintStep1")}
          </p>
          <p className="text-sm text-slate-800 leading-relaxed line-clamp-4 bg-white rounded-lg p-3 border-2 border-slate-200">
            {draft.grievanceText.trim() || t("draft.noPreview")}
          </p>
        </div>

        {draft.editedSummary.trim() && completedThrough >= 3 && (
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              {t("draft.aiSummary")}
            </p>
            <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">{draft.editedSummary}</p>
          </div>
        )}

        {(draft.selectedArea || draft.selectedLocalDepartments.length > 0) && (
          <div className="flex flex-wrap gap-3 text-xs text-slate-600">
            {draft.selectedArea && (
              <span className="flex items-center gap-1">
                <MapPin size={12} className="text-blue-500" />
                {draft.selectedArea.locality} · {draft.selectedArea.ward}
              </span>
            )}
            {draft.selectedLocalDepartments.length > 0 && (
              <span className="flex items-center gap-1">
                <Building2 size={12} className="text-blue-500" />
                {draft.selectedLocalDepartments.join(" · ")}
              </span>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onResume}
            className="flex-1 bg-[#1a3c6e] hover:bg-[#2563eb] text-white text-sm font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            <Play size={16} />
            {t("draft.resume")}
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="px-3 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
          >
            <Trash2 size={16} />
            {t("draft.discard")}
          </button>
        </div>
      </div>
    </div>
  );
}

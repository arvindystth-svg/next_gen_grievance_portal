"use client";

import { ReactNode, useState } from "react";
import { FileText, Building2, MapPin, Pencil } from "lucide-react";
import WardAreaSelector from "@/components/WardAreaSelector";
import { useLanguage } from "@/lib/LanguageContext";

interface ComplaintSummaryReviewProps {
  grievanceText: string;
  editedSummary: string;
  supplementalSummary: string;
  localDepartments: string[];
  cpgramsCategories: string[];
  selectedArea: { ward: string; zone: string; locality: string } | null;
  areaAutoFilled: boolean;
  onAreaChange: (area: { ward: string; zone: string; locality: string } | null) => void;
  onEditReview: () => void;
}

function InfoBlock({
  label,
  icon,
  children,
  action,
}: {
  label: string;
  icon: React.ReactNode;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
          {icon}
          {label}
        </p>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export default function ComplaintSummaryReview({
  grievanceText,
  editedSummary,
  supplementalSummary,
  localDepartments,
  cpgramsCategories,
  selectedArea,
  areaAutoFilled,
  onAreaChange,
  onEditReview,
}: ComplaintSummaryReviewProps) {
  const [editingArea, setEditingArea] = useState(false);
  const { t } = useLanguage();

  const areaDisplay = selectedArea
    ? `${selectedArea.locality} · ${selectedArea.ward} (${selectedArea.zone})`
    : t("summary.areaMissing");

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-200 overflow-hidden">
        <div className="bg-[#1a3c6e] text-white px-4 py-3">
          <h3 className="font-bold text-base">{t("summary.title")}</h3>
          <p className="text-sm text-blue-100 mt-0.5">{t("summary.subtitle")}</p>
        </div>

        <div className="p-4 space-y-4 bg-slate-50/50">
          <InfoBlock
            label={t("summary.yourComplaint")}
            icon={<FileText size={16} className="text-blue-600" />}
            action={
              <button
                type="button"
                onClick={onEditReview}
                className="text-xs font-bold text-[#1a3c6e] bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg hover:bg-blue-100 flex items-center gap-1"
              >
                <Pencil size={12} />
                {t("summary.edit")}
              </button>
            }
          >
            <p className="text-sm text-slate-800 leading-relaxed bg-white rounded-lg px-3 py-3 border border-slate-200">
              {grievanceText}
            </p>
            <p className="text-sm font-bold text-slate-700 mt-4 mb-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              {t("summary.aiSummary")}
            </p>
            <p className="text-sm text-slate-800 leading-relaxed bg-blue-50 rounded-lg px-3 py-3 border border-blue-200">
              {editedSummary}
              {supplementalSummary}
            </p>
          </InfoBlock>

          <InfoBlock
            label={t("summary.departments")}
            icon={<Building2 size={16} className="text-blue-600" />}
          >
            <div className="space-y-3">
              <div>
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                  {t("summary.local")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {localDepartments.map((dept) => (
                    <span
                      key={dept}
                      className="text-sm font-semibold bg-blue-100 text-blue-800 px-3 py-1 rounded-full border border-blue-200"
                    >
                      {dept}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                  {t("summary.central")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {cpgramsCategories.map((cat) => (
                    <span
                      key={cat}
                      className="text-sm font-semibold bg-purple-100 text-purple-800 px-3 py-1 rounded-full border border-purple-200"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </InfoBlock>

          <InfoBlock
            label={t("summary.affectedArea")}
            icon={<MapPin size={16} className="text-blue-600" />}
            action={
              <button
                type="button"
                onClick={() => setEditingArea((v) => !v)}
                className="text-xs font-bold text-[#1a3c6e] bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg hover:bg-blue-100 flex items-center gap-1"
              >
                <Pencil size={12} />
                {editingArea ? t("summary.done") : t("summary.editArea")}
              </button>
            }
          >
            {areaAutoFilled && !editingArea && (
              <p className="text-sm font-medium text-blue-800 bg-blue-50 border-l-4 border-l-blue-500 rounded-r-lg px-3 py-2 mb-3">
                {t("summary.areaAutofill")}
              </p>
            )}

            {editingArea ? (
              <WardAreaSelector value={selectedArea} onChange={(area) => onAreaChange(area)} />
            ) : (
              <p
                className={`text-sm font-medium rounded-lg px-3 py-3 border ${
                  selectedArea
                    ? "text-slate-800 bg-white border-slate-200"
                    : "text-amber-900 bg-amber-50 border-amber-300 border-l-4 border-l-amber-500"
                }`}
              >
                {areaDisplay}
              </p>
            )}
          </InfoBlock>
        </div>
      </div>
    </div>
  );
}

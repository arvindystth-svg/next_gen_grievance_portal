"use client";

import { useState } from "react";
import { ChevronDown, Tag, Building2, Landmark } from "lucide-react";
import DepartmentSelector from "@/components/DepartmentSelector";
import { useLanguage } from "@/lib/LanguageContext";

interface RoutingPanelProps {
  localDepartments: string[];
  cpgramsCategories: string[];
  localOptions: string[];
  cpgramsOptions: string[];
  onLocalChange: (selected: string[]) => void;
  onCpgramsChange: (selected: string[]) => void;
  routingUpdated?: boolean;
}

export default function RoutingPanel({
  localDepartments,
  cpgramsCategories,
  localOptions,
  cpgramsOptions,
  onLocalChange,
  onCpgramsChange,
  routingUpdated,
}: RoutingPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useLanguage();

  return (
    <div id="routing-section" className="rounded-xl border border-slate-200 bg-slate-50/80 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-3 py-2.5 flex items-start gap-2 text-left hover:bg-slate-100/80 transition-colors"
      >
        <Tag size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              {t("routing.title")}
            </p>
            <ChevronDown
              size={14}
              className={`text-slate-400 flex-shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </div>
          {!expanded && (
            <div className="mt-1.5 space-y-1">
              <p className="text-[11px] text-slate-500 flex items-start gap-1.5">
                <Building2 size={11} className="mt-0.5 flex-shrink-0 text-blue-500" />
                <span className="line-clamp-2">
                  {localDepartments.length
                    ? localDepartments.join(" · ")
                    : t("routing.noLocal")}
                </span>
              </p>
              <p className="text-[11px] text-slate-500 flex items-start gap-1.5">
                <Landmark size={11} className="mt-0.5 flex-shrink-0 text-purple-500" />
                <span className="line-clamp-1">
                  {cpgramsCategories.length
                    ? cpgramsCategories.join(" · ")
                    : t("routing.noCentral")}
                </span>
              </p>
            </div>
          )}
          {routingUpdated && !expanded && (
            <p className="text-[10px] text-green-600 mt-1">{t("routing.updatedFromSummary")}</p>
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-slate-200 bg-white">
          <DepartmentSelector
            compact
            label={t("routing.local")}
            selected={localDepartments}
            options={localOptions}
            onChange={onLocalChange}
            chipClassName="bg-blue-100 text-blue-700 border-blue-200"
            placeholder={t("routing.searchDepts")}
          />
          <DepartmentSelector
            compact
            label={t("routing.central")}
            selected={cpgramsCategories}
            options={cpgramsOptions}
            onChange={onCpgramsChange}
            chipClassName="bg-purple-100 text-purple-700 border-purple-200"
            placeholder={t("routing.searchMinistries")}
          />
        </div>
      )}
    </div>
  );
}

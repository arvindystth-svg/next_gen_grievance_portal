"use client";

import { useState } from "react";
import { Tag, Building2, Landmark } from "lucide-react";
import DepartmentSelector from "@/components/DepartmentSelector";
import { useLanguage } from "@/lib/LanguageContext";
import { CollapsibleSectionHeader } from "@/components/CollapsibleSectionHeader";

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
    <div
      id="routing-section"
      className={`rounded-xl overflow-hidden transition-shadow ${
        expanded
          ? "border-2 border-[#1a3c6e]/30 bg-white shadow-md"
          : "border-2 border-dashed border-blue-300 bg-blue-50/60 shadow-sm hover:border-blue-400 hover:bg-blue-50"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full px-4 py-3.5 text-left transition-colors hover:bg-blue-50/80"
      >
        <CollapsibleSectionHeader
          expanded={expanded}
          icon={<Tag size={18} className="text-blue-600" />}
          title={t("routing.title")}
          subtitle={
            !expanded ? (
              <div className="space-y-1.5">
                <p className="text-sm text-slate-700 flex items-start gap-2">
                  <Building2 size={14} className="mt-0.5 flex-shrink-0 text-blue-600" />
                  <span className="line-clamp-2 font-medium">
                    {localDepartments.length
                      ? localDepartments.join(" · ")
                      : t("routing.noLocal")}
                  </span>
                </p>
                <p className="text-sm text-slate-600 flex items-start gap-2">
                  <Landmark size={14} className="mt-0.5 flex-shrink-0 text-purple-600" />
                  <span className="line-clamp-1">
                    {cpgramsCategories.length
                      ? cpgramsCategories.join(" · ")
                      : t("routing.noCentral")}
                  </span>
                </p>
                {routingUpdated && (
                  <p className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg px-2 py-1 inline-block">
                    {t("routing.updatedFromSummary")}
                  </p>
                )}
              </div>
            ) : undefined
          }
        />
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t-2 border-blue-100 bg-white">
          <DepartmentSelector
            compact
            label={t("routing.local")}
            selected={localDepartments}
            options={localOptions}
            onChange={onLocalChange}
            chipClassName="bg-blue-100 text-blue-800 border-blue-200"
            placeholder={t("routing.searchDepts")}
          />
          <DepartmentSelector
            compact
            label={t("routing.central")}
            selected={cpgramsCategories}
            options={cpgramsOptions}
            onChange={onCpgramsChange}
            chipClassName="bg-purple-100 text-purple-800 border-purple-200"
            placeholder={t("routing.searchMinistries")}
          />
        </div>
      )}
    </div>
  );
}

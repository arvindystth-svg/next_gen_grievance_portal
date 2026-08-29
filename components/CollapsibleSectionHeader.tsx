"use client";

import { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

interface CollapsibleSectionHeaderProps {
  expanded: boolean;
  icon: ReactNode;
  title: string;
  subtitle?: ReactNode;
  trailing?: ReactNode;
}

export function CollapsibleSectionHeader({
  expanded,
  icon,
  title,
  subtitle,
  trailing,
}: CollapsibleSectionHeaderProps) {
  const { t } = useLanguage();

  return (
    <div className="flex items-start gap-3 w-full">
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800">{title}</p>
            {subtitle && <div className="mt-1.5">{subtitle}</div>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {trailing}
            <span className="hidden sm:inline text-[11px] font-semibold text-[#1a3c6e] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full whitespace-nowrap">
              {expanded ? t("common.tapToCollapse") : t("common.tapToExpand")}
            </span>
            <div
              className={`w-8 h-8 rounded-full bg-white border-2 flex items-center justify-center shadow-sm transition-colors ${
                expanded ? "border-[#1a3c6e] bg-blue-50" : "border-blue-200"
              }`}
              aria-hidden
            >
              <ChevronDown
                size={18}
                className={`text-[#1a3c6e] transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
              />
            </div>
          </div>
        </div>
        <p className="sm:hidden text-[11px] font-semibold text-blue-600 mt-1.5">
          {expanded ? t("common.tapToCollapse") : t("common.tapToExpand")}
        </p>
      </div>
    </div>
  );
}

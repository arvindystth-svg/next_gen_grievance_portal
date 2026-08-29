"use client";

import { useState } from "react";
import { FileText, Building2, MapPin, Pencil } from "lucide-react";
import WardAreaSelector from "@/components/WardAreaSelector";

interface ComplaintSummaryReviewProps {
  grievanceText: string;
  editedSummary: string;
  supplementalSummary: string;
  localDepartments: string[];
  cpgramsCategories: string[];
  selectedArea: { ward: string; zone: string; locality: string } | null;
  areaAutoFilled: boolean;
  onAreaChange: (area: { ward: string; zone: string; locality: string }) => void;
  onEditReview: () => void;
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

  const areaDisplay = selectedArea
    ? `${selectedArea.locality} · ${selectedArea.ward} (${selectedArea.zone})`
    : "Not specified — please add affected area before submitting";

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
          <h3 className="font-bold text-slate-800 text-sm">Review before submission</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Confirm your complaint, routing, and affected area are correct.
          </p>
        </div>

        <div className="p-4 space-y-4">
          <section>
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={12} className="text-blue-500" />
                Your complaint
              </p>
              <button
                type="button"
                onClick={onEditReview}
                className="text-[11px] font-semibold text-[#1a3c6e] hover:underline flex items-center gap-0.5"
              >
                <Pencil size={11} />
                Edit
              </button>
            </div>
            <p className="text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-100">
              {grievanceText}
            </p>
            <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">AI summary</p>
            <p className="text-sm text-slate-700 bg-blue-50/50 rounded-lg px-3 py-2.5 border border-blue-100">
              {editedSummary}
              {supplementalSummary}
            </p>
          </section>

          <section className="pt-2 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <Building2 size={12} className="text-blue-500" />
              Departments
            </p>
            <div className="space-y-2">
              <div>
                <p className="text-[10px] text-slate-400 uppercase mb-1">Local</p>
                <div className="flex flex-wrap gap-1.5">
                  {localDepartments.map((dept) => (
                    <span
                      key={dept}
                      className="text-[11px] font-semibold bg-blue-100 text-blue-700 px-2 py-1 rounded-full"
                    >
                      {dept}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase mb-1">Central (CPGRAMS)</p>
                <div className="flex flex-wrap gap-1.5">
                  {cpgramsCategories.map((cat) => (
                    <span
                      key={cat}
                      className="text-[11px] font-semibold bg-purple-100 text-purple-700 px-2 py-1 rounded-full"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin size={12} className="text-blue-500" />
                Affected area
              </p>
              <button
                type="button"
                onClick={() => setEditingArea((v) => !v)}
                className="text-[11px] font-semibold text-[#1a3c6e] hover:underline flex items-center gap-0.5"
              >
                <Pencil size={11} />
                {editingArea ? "Done" : "Edit area"}
              </button>
            </div>

            {areaAutoFilled && !editingArea && (
              <p className="text-[11px] text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1.5 mb-2">
                Auto-filled based on your complaint — tap Edit area if this is incorrect.
              </p>
            )}

            {editingArea ? (
              <WardAreaSelector
                value={selectedArea}
                onChange={(area) => onAreaChange(area)}
              />
            ) : (
              <p
                className={`text-sm rounded-lg px-3 py-2.5 border ${
                  selectedArea
                    ? "text-slate-700 bg-slate-50 border-slate-100"
                    : "text-amber-700 bg-amber-50 border-amber-200"
                }`}
              >
                {areaDisplay}
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

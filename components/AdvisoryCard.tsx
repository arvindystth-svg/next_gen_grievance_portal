"use client";

import { useState } from "react";
import { Lightbulb, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";

interface AdvisoryCardProps {
  observation: string;
  whyItMatters: string;
  tips?: string[];
}

const DEFAULT_TIPS = [
  "Add a nearby landmark (temple, school, ATM, metro station)",
  "Mention your consumer ID or connection number for utility issues",
  "Include the approximate date when the issue started",
  "Note if the issue affects multiple households or just yours",
];

export default function AdvisoryCard({
  observation,
  whyItMatters,
  tips = DEFAULT_TIPS,
}: AdvisoryCardProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-amber-50 border-2 border-amber-300 rounded-xl overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-amber-100/60 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-400 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
            <Lightbulb size={16} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-amber-950 text-sm">
              Speed Up Resolution — Optional Details
            </p>
            <p className="text-sm text-amber-800 mt-0.5 font-medium">{observation}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
            {expanded ? "Tap to collapse" : "Tap to expand"}
          </span>
          <div className="w-8 h-8 rounded-full bg-white border-2 border-amber-300 flex items-center justify-center">
            {expanded ? (
              <ChevronUp size={18} className="text-amber-700" />
            ) : (
              <ChevronDown size={18} className="text-amber-700" />
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          <div className="bg-amber-100/70 rounded-lg p-3 mb-3">
            <p className="text-sm text-amber-800">
              <span className="font-semibold">Why this helps:</span> {whyItMatters}
            </p>
          </div>
          <div className="space-y-2">
            {tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">{tip}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-amber-600 mt-3 italic">
            * This is informational only. Your complaint will be accepted even without these details.
          </p>
        </div>
      )}
    </div>
  );
}

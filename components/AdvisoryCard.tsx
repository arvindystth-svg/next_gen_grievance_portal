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
    <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-amber-100/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-amber-400 rounded-full flex items-center justify-center flex-shrink-0">
            <Lightbulb size={14} className="text-white" />
          </div>
          <div>
            <p className="font-semibold text-amber-900 text-sm">
              💡 Speed Up Resolution — Optional Details
            </p>
            <p className="text-xs text-amber-700">{observation}</p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-amber-600 flex-shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-amber-600 flex-shrink-0" />
        )}
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

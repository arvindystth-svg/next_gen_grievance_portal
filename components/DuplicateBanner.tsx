"use client";

import { useState } from "react";
import { AlertTriangle, ThumbsUp, ExternalLink, X, Clock, Users } from "lucide-react";
import { SeedGrievance } from "@/lib/seedData";

interface DuplicateBannerProps {
  match: SeedGrievance;
  onUpvote: (grievanceId: string) => void;
  onDismiss: () => void;
}

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (mins > 0) return `${mins} minute${mins > 1 ? "s" : ""} ago`;
  return "just now";
}

export default function DuplicateBanner({
  match,
  onUpvote,
  onDismiss,
}: DuplicateBannerProps) {
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [localCount, setLocalCount] = useState(match.upvotes);
  const [isUpvoting, setIsUpvoting] = useState(false);

  const handleUpvote = async () => {
    if (hasUpvoted) return;
    setIsUpvoting(true);
    await new Promise((r) => setTimeout(r, 600));
    setLocalCount((c) => c + 1);
    setHasUpvoted(true);
    setIsUpvoting(false);
    onUpvote(match.id);
  };

  const urgencyColors: Record<string, string> = {
    HIGH: "bg-red-100 text-red-700 border-red-200",
    MEDIUM: "bg-amber-100 text-amber-700 border-amber-200",
    LOW: "bg-green-100 text-green-700 border-green-200",
  };

  return (
    <div className="bg-orange-50 border-2 border-orange-300 rounded-xl overflow-hidden shadow-sm">
      {/* Banner header */}
      <div className="bg-orange-500 text-white px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} />
          <span className="font-bold text-sm">Similar Issue Already Reported</span>
        </div>
        <button
          onClick={onDismiss}
          className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${urgencyColors[match.urgency]}`}>
                {match.urgency}
              </span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                {match.category}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock size={10} />
                {timeAgo(match.reportedAt)}
              </span>
            </div>

            <p className="text-sm font-semibold text-slate-800 mb-1">{match.title}</p>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              📍 {match.ward} · {match.zone}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Grievance ID: <span className="font-mono font-bold">{match.id}</span> · {match.department}
            </p>
          </div>
        </div>

        {/* Impact counter + upvote */}
        <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-1.5">
              <Users size={14} className="text-blue-500" />
              <span className="text-sm font-bold text-slate-700">{localCount}</span>
              <span className="text-xs text-slate-500">citizens affected</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open(`#grievance-${match.id}`, "_blank")}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
            >
              <ExternalLink size={11} />
              View original
            </button>
            <button
              onClick={handleUpvote}
              disabled={hasUpvoted || isUpvoting}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                hasUpvoted
                  ? "bg-green-100 text-green-700 border border-green-200 cursor-default"
                  : "bg-orange-500 hover:bg-orange-600 text-white shadow-sm"
              }`}
            >
              {isUpvoting ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <ThumbsUp size={14} className={hasUpvoted ? "fill-green-600" : ""} />
              )}
              {hasUpvoted
                ? "✓ Impact Registered!"
                : "👍 I'm Affected Too (+1 Impact Upvote)"}
            </button>
          </div>
        </div>

        {hasUpvoted && (
          <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700">
            ✅ Your impact has been added. The field crew priority has been escalated. Thank you for reporting!
          </div>
        )}
      </div>
    </div>
  );
}

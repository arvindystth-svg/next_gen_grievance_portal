"use client";

import { useState } from "react";
import {
  Clock,
  Star,
  ChevronDown,
  ChevronUp,
  MapPin,
  Building2,
  MessageSquare,
  CheckCircle2,
} from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import {
  ComplaintRecord,
  ComplaintStatus,
  STATUS_STYLES,
  formatComplaintDate,
  updateComplaintFeedback,
} from "@/lib/complaintHistory";
import { TranslationKey } from "@/lib/i18n";

interface ComplaintHistoryProps {
  complaints: ComplaintRecord[];
  ownerId: string;
  onUpdate: (complaints: ComplaintRecord[]) => void;
}

function StarRating({
  rating,
  onRate,
  readonly = false,
}: {
  rating?: number;
  onRate?: (n: number) => void;
  readonly?: boolean;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readonly}
          onClick={() => onRate?.(n)}
          className={`${readonly ? "cursor-default" : "cursor-pointer hover:scale-110"} transition-transform`}
          aria-label={`Rate ${n} stars`}
        >
          <Star
            size={16}
            className={
              rating && n <= rating
                ? "text-amber-400 fill-amber-400"
                : "text-slate-300"
            }
          />
        </button>
      ))}
    </div>
  );
}

function ComplaintCard({
  complaint,
  onFeedback,
  statusLabel,
}: {
  complaint: ComplaintRecord;
  onFeedback: (id: string, rating: number) => void;
  statusLabel: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const style = STATUS_STYLES[complaint.status];

  const canRate =
    (complaint.status === "Resolved" || complaint.status === "Closed") &&
    !complaint.feedbackRating;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-xs font-bold text-[#1a3c6e]">
                {complaint.id}
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${style.bg} ${style.text} ${style.border}`}
              >
                {statusLabel}
              </span>
            </div>
            <p className="text-sm text-slate-800 line-clamp-2 leading-snug">
              {complaint.aiSummary}
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {formatComplaintDate(complaint.raisedAt)}
              </span>
              {complaint.feedbackRating && (
                <span className="flex items-center gap-1 text-amber-600">
                  <Star size={11} className="fill-amber-400 text-amber-400" />
                  {complaint.feedbackRating}/5
                </span>
              )}
            </div>
          </div>
          {expanded ? (
            <ChevronUp size={16} className="text-slate-400 flex-shrink-0 mt-1" />
          ) : (
            <ChevronDown size={16} className="text-slate-400 flex-shrink-0 mt-1" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 space-y-3 pt-3">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              AI Summary
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">{complaint.aiSummary}</p>
          </div>

          {complaint.rawText && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Original Complaint
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">{complaint.rawText}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {complaint.ward && (
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <MapPin size={12} className="text-blue-500" />
                {complaint.ward}
              </div>
            )}
            <div className="flex items-start gap-1.5 text-xs text-slate-600">
              <Building2 size={12} className="text-blue-500 mt-0.5 flex-shrink-0" />
              <span>{complaint.localDepartments.join(" · ")}</span>
            </div>
          </div>

          {complaint.resolution ? (
            <div className="bg-green-50 border border-green-100 rounded-lg p-3">
              <p className="text-[10px] font-semibold text-green-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <CheckCircle2 size={11} />
                Resolution
              </p>
              <p className="text-sm text-green-800 leading-relaxed">{complaint.resolution}</p>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
              <p className="text-xs text-slate-500">
                Resolution pending — field crew will update once work is completed.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between flex-wrap gap-3 pt-1 border-t border-slate-100">
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <MessageSquare size={11} />
                Your Feedback
              </p>
              {complaint.feedbackRating ? (
                <div className="flex items-center gap-2">
                  <StarRating rating={complaint.feedbackRating} readonly />
                  <span className="text-xs text-slate-500">Thank you for your rating!</span>
                </div>
              ) : canRate ? (
                <div>
                  <p className="text-xs text-slate-500 mb-1.5">Rate the resolution quality:</p>
                  <StarRating onRate={(n) => onFeedback(complaint.id, n)} />
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  Feedback available once your complaint is resolved.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ComplaintHistory({ complaints, ownerId, onUpdate }: ComplaintHistoryProps) {
  const { t } = useLanguage();

  const handleFeedback = (id: string, rating: number) => {
    const updated = updateComplaintFeedback(id, rating, ownerId);
    onUpdate(updated);
  };

  const statusLabel = (status: ComplaintStatus) =>
    t(`status.${status}` as TranslationKey);

  if (complaints.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
        <p className="text-slate-500 text-sm">{t("history.empty")}</p>
      </div>
    );
  }

  const statusCounts = complaints.reduce(
    (acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    },
    {} as Record<ComplaintStatus, number>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-[#1a3c6e]">{complaints.length}</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">{t("history.total")}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-amber-600">
            {(statusCounts["In Progress"] || 0) +
              (statusCounts["Assigned to Field Crew"] || 0) +
              (statusCounts["Under Review"] || 0) +
              (statusCounts["Submitted"] || 0)}
          </div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">{t("history.active")}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-green-600">
            {(statusCounts["Resolved"] || 0) + (statusCounts["Closed"] || 0)}
          </div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">{t("history.resolved")}</div>
        </div>
      </div>

      <div className="space-y-3">
        {complaints.map((c) => (
          <ComplaintCard
            key={c.id}
            complaint={c}
            onFeedback={handleFeedback}
            statusLabel={statusLabel(c.status)}
          />
        ))}
      </div>
    </div>
  );
}

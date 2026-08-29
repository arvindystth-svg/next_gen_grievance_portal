export type ComplaintStatus =
  | "Submitted"
  | "Under Review"
  | "Assigned to Field Crew"
  | "In Progress"
  | "Resolved"
  | "Closed";

export interface ComplaintRecord {
  id: string;
  raisedAt: string;
  rawText: string;
  aiSummary: string;
  status: ComplaintStatus;
  resolution?: string;
  feedbackRating?: number; // 1–5 stars
  localDepartments: string[];
  urgency: "HIGH" | "MEDIUM" | "LOW";
  ward?: string;
  locality?: string;
}

const STORAGE_KEY = "cpgrams_complaint_history_v1";

/** Pre-seeded history for citizen Ramesh Kumar */
export const SEED_COMPLAINT_HISTORY: ComplaintRecord[] = [
  {
    id: "GRV-BLR-482910-AK3F",
    raisedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    rawText:
      "Water supply has been irregular for 3 days in Koramangala 4th Block near the bus stand. Low pressure in mornings.",
    aiSummary:
      "Irregular water supply with low morning pressure has been reported in Koramangala 4th Block near the bus stand for three consecutive days. BWSSB is required to inspect the distribution line and restore normal supply.",
    status: "Resolved",
    resolution:
      "BWSSB valve repaired at junction box on 10th Main. Normal water pressure restored on 18 Aug 2026. Area engineer confirmed closure.",
    feedbackRating: 4,
    localDepartments: ["BWSSB Water Supply"],
    urgency: "MEDIUM",
    ward: "Ward 151 - Koramangala",
    locality: "Koramangala",
  },
  {
    id: "GRV-BLR-391204-MN7P",
    raisedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    rawText:
      "Deep potholes outside Columbia Asia Hospital Bellandur. Very dangerous for ambulances and two-wheelers.",
    aiSummary:
      "A cluster of deep potholes outside Columbia Asia Hospital on Bellandur main road poses a serious safety risk to ambulances and two-wheelers. BBMP Roads & Infrastructure must undertake emergency patching of the affected stretch.",
    status: "In Progress",
    resolution:
      "Road maintenance crew deployed on 26 Aug 2026. Temporary cold-mix patching completed on the hospital approach lane. Permanent asphalt resurfacing scheduled within 7 days.",
    localDepartments: ["BBMP Roads & Infrastructure"],
    urgency: "HIGH",
    ward: "Ward 150 - Bellandur",
    locality: "Bellandur",
  },
  {
    id: "GRV-BLR-558732-QR2W",
    raisedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    rawText:
      "Street lights not working on 80 Feet Road Indiranagar near metro station. Area is completely dark at night.",
    aiSummary:
      "Multiple non-functional street lights on 80 Feet Road, Indiranagar near the metro station have left the stretch in complete darkness at night. BBMP Electrical and BESCOM are required to inspect and restore lighting on priority.",
    status: "Assigned to Field Crew",
    localDepartments: ["BBMP Electrical", "BESCOM"],
    urgency: "HIGH",
    ward: "Ward 80 - Hoysala Nagar",
    locality: "Indiranagar",
  },
];

function mergeHistory(stored: ComplaintRecord[]): ComplaintRecord[] {
  const byId = new Map<string, ComplaintRecord>();
  for (const seed of SEED_COMPLAINT_HISTORY) {
    byId.set(seed.id, seed);
  }
  for (const item of stored) {
    byId.set(item.id, item);
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.raisedAt).getTime() - new Date(a.raisedAt).getTime()
  );
}

export function getComplaintHistory(): ComplaintRecord[] {
  if (typeof window === "undefined") return SEED_COMPLAINT_HISTORY;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_COMPLAINT_HISTORY;
    const stored = JSON.parse(raw) as ComplaintRecord[];
    return mergeHistory(stored);
  } catch {
    return SEED_COMPLAINT_HISTORY;
  }
}

export function saveComplaintToHistory(record: ComplaintRecord): ComplaintRecord[] {
  const existing = getComplaintHistory().filter((c) => c.id !== record.id);
  const updated = [record, ...existing].sort(
    (a, b) => new Date(b.raisedAt).getTime() - new Date(a.raisedAt).getTime()
  );
  if (typeof window !== "undefined") {
    // Persist only user-filed complaints (not seeds) to avoid duplicating seeds
    const userOnly = updated.filter(
      (c) => !SEED_COMPLAINT_HISTORY.some((s) => s.id === c.id)
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userOnly));
  }
  return updated;
}

export function updateComplaintFeedback(id: string, rating: number): ComplaintRecord[] {
  const all = getComplaintHistory();
  const updated = all.map((c) =>
    c.id === id ? { ...c, feedbackRating: rating } : c
  );
  if (typeof window !== "undefined") {
    const userOnly = updated.filter(
      (c) => !SEED_COMPLAINT_HISTORY.some((s) => s.id === c.id)
    );
    // Also update seeds in session state only — seeds keep their default ratings
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userOnly));
  }
  return updated;
}

export function formatComplaintDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export const STATUS_STYLES: Record<
  ComplaintStatus,
  { bg: string; text: string; border: string }
> = {
  Submitted: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  "Under Review": { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" },
  "Assigned to Field Crew": {
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
  },
  "In Progress": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  Resolved: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  Closed: { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-300" },
};

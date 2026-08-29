export type ComplaintStatus =
  | "Submitted"
  | "Under Review"
  | "Assigned to Field Crew"
  | "In Progress"
  | "Resolved"
  | "Closed";

export interface ComplaintRecord {
  id: string;
  ownerId: string;
  raisedAt: string;
  rawText: string;
  aiSummary: string;
  status: ComplaintStatus;
  resolution?: string;
  feedbackRating?: number;
  localDepartments: string[];
  urgency: "HIGH" | "MEDIUM" | "LOW";
  ward?: string;
  locality?: string;
}

const STORAGE_PREFIX = "cpgrams_complaint_history_v1";

/** One seeded complaint per demo citizen (keyed by mobile). */
const SEED_BY_OWNER: Record<string, ComplaintRecord[]> = {
  "9876543210": [
    {
      id: "GRV-BLR-482910-AK3F",
      ownerId: "9876543210",
      raisedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      rawText:
        "Water supply has been irregular for 3 days in Koramangala 4th Block near the bus stand. Low pressure in mornings.",
      aiSummary:
        "Irregular water supply with low morning pressure has been reported in Koramangala 4th Block near the bus stand for three consecutive days. BWSSB is required to inspect the distribution line and restore normal supply.",
      status: "Resolved",
      resolution:
        "BWSSB valve repaired at junction box on 10th Main. Normal water pressure restored on 18 Aug 2026.",
      feedbackRating: 4,
      localDepartments: ["BWSSB Water Supply"],
      urgency: "MEDIUM",
      ward: "Ward 151 - Koramangala",
      locality: "Koramangala",
    },
  ],
  "9876543211": [
    {
      id: "GRV-BLR-558732-QR2W",
      ownerId: "9876543211",
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
  ],
  "9876543212": [
    {
      id: "GRV-BLR-391204-MN7P",
      ownerId: "9876543212",
      raisedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      rawText:
        "Deep potholes outside Columbia Asia Hospital Bellandur. Very dangerous for ambulances and two-wheelers.",
      aiSummary:
        "A cluster of deep potholes outside Columbia Asia Hospital on Bellandur main road poses a serious safety risk to ambulances and two-wheelers. BBMP Roads & Infrastructure must undertake emergency patching of the affected stretch.",
      status: "In Progress",
      resolution:
        "Road maintenance crew deployed on 26 Aug 2026. Temporary cold-mix patching completed on the hospital approach lane.",
      localDepartments: ["BBMP Roads & Infrastructure"],
      urgency: "HIGH",
      ward: "Ward 150 - Bellandur",
      locality: "Bellandur",
    },
  ],
  "9876543213": [
    {
      id: "GRV-BLR-672104-JY1K",
      ownerId: "9876543213",
      raisedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      rawText:
        "Garbage has not been collected for a week on 4th Block Jayanagar near the market. Strong smell and stray dogs.",
      aiSummary:
        "Uncollected solid waste for seven days on 4th Block Jayanagar near the market is causing foul odour and a stray-dog nuisance. BBMP Solid Waste Management must resume daily collection and clear the backlog.",
      status: "Under Review",
      localDepartments: ["BBMP Solid Waste Management"],
      urgency: "MEDIUM",
      ward: "Ward 168 - Jayanagar",
      locality: "Jayanagar",
    },
  ],
  "9876543214": [
    {
      id: "GRV-BLR-803215-SH9M",
      ownerId: "9876543214",
      raisedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      rawText:
        "Storm-water drain clogged on Commercial Street Shivajinagar. Waterlogging after every rain.",
      aiSummary:
        "A clogged storm-water drain on Commercial Street, Shivajinagar is causing waterlogging after rainfall. BBMP Storm Water Drains must desilt the channel and restore proper flow before the next monsoon spell.",
      status: "Submitted",
      localDepartments: ["BBMP Storm Water Drains"],
      urgency: "HIGH",
      ward: "Ward 93 - Shivajinagar",
      locality: "Shivajinagar",
    },
  ],
};

export function historyStorageKey(ownerId: string): string {
  return `${STORAGE_PREFIX}_${ownerId}`;
}

function seedIdsForOwner(ownerId: string): Set<string> {
  return new Set((SEED_BY_OWNER[ownerId] ?? []).map((c) => c.id));
}

function mergeHistory(ownerId: string, stored: ComplaintRecord[]): ComplaintRecord[] {
  const seeds = SEED_BY_OWNER[ownerId] ?? [];
  const byId = new Map<string, ComplaintRecord>();
  for (const seed of seeds) {
    byId.set(seed.id, seed);
  }
  for (const item of stored) {
    if (item.ownerId === ownerId) {
      byId.set(item.id, item);
    }
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.raisedAt).getTime() - new Date(a.raisedAt).getTime()
  );
}

export function getComplaintHistory(ownerId: string): ComplaintRecord[] {
  const seeds = SEED_BY_OWNER[ownerId] ?? [];
  if (!ownerId) return [];
  if (typeof window === "undefined") return seeds;
  try {
    const raw = localStorage.getItem(historyStorageKey(ownerId));
    if (!raw) return seeds;
    const stored = JSON.parse(raw) as ComplaintRecord[];
    return mergeHistory(ownerId, stored);
  } catch {
    return seeds;
  }
}

export function saveComplaintToHistory(
  record: ComplaintRecord,
  ownerId: string
): ComplaintRecord[] {
  if (!ownerId) return [];
  const withOwner = { ...record, ownerId };
  const existing = getComplaintHistory(ownerId).filter((c) => c.id !== withOwner.id);
  const updated = [withOwner, ...existing].sort(
    (a, b) => new Date(b.raisedAt).getTime() - new Date(a.raisedAt).getTime()
  );
  if (typeof window !== "undefined") {
    const seedIds = seedIdsForOwner(ownerId);
    const userOnly = updated.filter((c) => !seedIds.has(c.id));
    localStorage.setItem(historyStorageKey(ownerId), JSON.stringify(userOnly));
  }
  return updated;
}

export function updateComplaintFeedback(
  id: string,
  rating: number,
  ownerId: string
): ComplaintRecord[] {
  if (!ownerId) return [];
  const all = getComplaintHistory(ownerId);
  const updated = all.map((c) => (c.id === id ? { ...c, feedbackRating: rating } : c));
  if (typeof window !== "undefined") {
    const seedIds = seedIdsForOwner(ownerId);
    const userOnly = updated.filter((c) => !seedIds.has(c.id));
    localStorage.setItem(historyStorageKey(ownerId), JSON.stringify(userOnly));
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

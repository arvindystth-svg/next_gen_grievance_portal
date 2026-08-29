import { SupplementalDetailId, SupplementalDetails } from "@/lib/complaintCompleteness";
import { GrievanceCategory } from "@/lib/seedData";

const STORAGE_KEY = "cpgrams_complaint_draft_v1";
const DRAFT_VERSION = 1;

export type DraftStep = 1 | 2 | 3 | 4 | 5;

export interface DraftLocation {
  lat: number;
  lng: number;
  ward?: string;
  zone?: string;
  locality?: string;
  source: "gps" | "exif" | "nlp" | "manual";
}

export interface DraftAnalysisResult {
  summary: string;
  cpgrams_category: string;
  cpgrams_categories: string[];
  local_department: string;
  local_departments: string[];
  urgency: "HIGH" | "MEDIUM" | "LOW";
  location: {
    locality: string;
    ward: string;
    zone: string;
    latitude: number;
    longitude: number;
  };
  missing_details_advisory: {
    is_missing: boolean;
    observation: string;
    why_it_matters: string;
  };
  confidence: number;
  keywords: string[];
  model?: string;
}

export interface ComplaintDraft {
  version: typeof DRAFT_VERSION;
  savedAt: string;
  activeView: "file" | "draft" | "history";
  step: DraftStep;
  language: string;
  grievanceText: string;
  location: DraftLocation | null;
  selectedCategory?: GrievanceCategory;
  analysisResult: DraftAnalysisResult | null;
  editedSummary: string;
  duplicateDismissed: boolean;
  selectedLocalDepartments: string[];
  selectedCpgramsCategories: string[];
  maxStepReached: DraftStep;
  selectedArea: { ward: string; zone: string; locality: string } | null;
  supplementalDetails: SupplementalDetails;
  autoFilledDetails: Partial<Record<SupplementalDetailId, boolean>>;
  analysisSnapshot: { grievanceText: string; language: string } | null;
  areaManuallySet: boolean;
  geocodeFailed: boolean;
  lastAutoRoutedSummary: string | null;
}

export function isDraftMeaningful(draft: ComplaintDraft): boolean {
  return (
    draft.grievanceText.trim().length > 0 ||
    draft.step > 1 ||
    Boolean(draft.analysisResult) ||
    draft.editedSummary.trim().length > 0
  );
}

export function loadComplaintDraft(): ComplaintDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as ComplaintDraft;
    if (draft.version !== DRAFT_VERSION) return null;
    if (draft.step === 5) return null;
    if (!isDraftMeaningful(draft)) return null;
    return draft;
  } catch {
    return null;
  }
}

export function saveComplaintDraft(draft: ComplaintDraft): void {
  if (typeof window === "undefined") return;
  if (!isDraftMeaningful(draft) || draft.step === 5) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...draft, version: DRAFT_VERSION, savedAt: new Date().toISOString() })
  );
}

export function clearComplaintDraft(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function formatDraftSavedAt(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

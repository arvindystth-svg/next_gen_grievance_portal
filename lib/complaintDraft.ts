import { SupplementalDetailId, SupplementalDetails } from "@/lib/complaintCompleteness";
import { GrievanceCategory } from "@/lib/seedData";

const STORAGE_PREFIX = "cpgrams_complaint_draft_v1";
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
  ownerId: string;
  activeView: "file" | "draft" | "history";
  /** Current visible step in the workflow */
  step: DraftStep;
  /** Furthest step the citizen has completed */
  maxStepReached: DraftStep;
  language: string;
  grievanceText: string;
  location: DraftLocation | null;
  selectedCategory?: GrievanceCategory;
  analysisResult: DraftAnalysisResult | null;
  editedSummary: string;
  duplicateDismissed: boolean;
  selectedLocalDepartments: string[];
  selectedCpgramsCategories: string[];
  selectedArea: { ward: string; zone: string; locality: string } | null;
  supplementalDetails: SupplementalDetails;
  autoFilledDetails: Partial<Record<SupplementalDetailId, boolean>>;
  analysisSnapshot: { grievanceText: string; language: string } | null;
  areaManuallySet: boolean;
  geocodeFailed: boolean;
  lastAutoRoutedSummary: string | null;
}

export function draftStorageKey(ownerId: string): string {
  return `${STORAGE_PREFIX}_${ownerId}`;
}

export function isDraftMeaningful(draft: ComplaintDraft): boolean {
  return (
    draft.grievanceText.trim().length > 0 ||
    draft.maxStepReached > 1 ||
    draft.step > 1 ||
    Boolean(draft.analysisResult) ||
    draft.editedSummary.trim().length > 0
  );
}

export function resumeStepFromDraft(draft: ComplaintDraft): DraftStep {
  const target = Math.max(draft.step, draft.maxStepReached) as DraftStep;
  if (target === 2) return draft.analysisResult ? 3 : 1;
  if (target >= 5) return 4;
  return target;
}

export function loadComplaintDraft(ownerId: string): ComplaintDraft | null {
  if (typeof window === "undefined" || !ownerId) return null;
  try {
    const raw = localStorage.getItem(draftStorageKey(ownerId));
    if (!raw) return null;
    const draft = JSON.parse(raw) as ComplaintDraft;
    if (draft.version !== DRAFT_VERSION) return null;
    if (draft.step === 5 || draft.maxStepReached === 5) return null;
    if (!isDraftMeaningful(draft)) return null;
    return {
      ...draft,
      grievanceText: draft.grievanceText ?? "",
      maxStepReached: draft.maxStepReached ?? draft.step ?? 1,
    };
  } catch {
    return null;
  }
}

export function saveComplaintDraft(draft: ComplaintDraft, ownerId: string): boolean {
  if (typeof window === "undefined" || !ownerId) return false;
  if (!isDraftMeaningful(draft) || draft.step === 5 || draft.maxStepReached === 5) {
    return false;
  }
  localStorage.setItem(
    draftStorageKey(ownerId),
    JSON.stringify({
      ...draft,
      ownerId,
      version: DRAFT_VERSION,
      savedAt: new Date().toISOString(),
      grievanceText: draft.grievanceText ?? "",
      maxStepReached: draft.maxStepReached ?? draft.step,
    })
  );
  return true;
}

export function clearComplaintDraft(ownerId: string): void {
  if (typeof window === "undefined" || !ownerId) return;
  localStorage.removeItem(draftStorageKey(ownerId));
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

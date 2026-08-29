"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Header from "@/components/Header";
import VoiceTextRecorder from "@/components/VoiceTextRecorder";
import DuplicateBanner from "@/components/DuplicateBanner";
import ComplaintHistory from "@/components/ComplaintHistory";
import CompletenessCard from "@/components/CompletenessCard";
import AnalysisLoading from "@/components/AnalysisLoading";
import RoutingPanel from "@/components/RoutingPanel";
import ComplaintSummaryReview from "@/components/ComplaintSummaryReview";
import { assessComplaintCompleteness, SupplementalDetailId, SupplementalDetails, formatSupplementalForSummary, buildScoringSupplemental, extractAutoFillSupplemental } from "@/lib/complaintCompleteness";
import { extractAreaFromText } from "@/lib/bengaluruAreas";
import {
  LOCAL_DEPARTMENTS,
  CPGRAMS_MINISTRIES,
  cpgramsForLocalDepartments,
} from "@/lib/departments";
import {
  getComplaintHistory,
  saveComplaintToHistory,
  ComplaintRecord,
} from "@/lib/complaintHistory";
import {
  loadComplaintDraft,
  saveComplaintDraft,
  clearComplaintDraft,
  formatDraftSavedAt,
  ComplaintDraft,
} from "@/lib/complaintDraft";
import {
  SEED_GRIEVANCES,
  SeedGrievance,
  GrievanceCategory,
} from "@/lib/seedData";
import {
  Sparkles,
  Send,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Download,
  History,
  PlusCircle,
  FileText,
  X,
} from "lucide-react";
import { rerouteFromSummary } from "@/lib/summaryRouting";

interface LocationData {
  lat: number;
  lng: number;
  ward?: string;
  zone?: string;
  locality?: string;
  source: "gps" | "exif" | "nlp" | "manual";
}

interface AnalysisResult {
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

type Step = 1 | 2 | 3 | 4 | 5;
type ActiveView = "file" | "history";

interface AnalysisSnapshot {
  grievanceText: string;
  language: string;
}

function findDuplicate(
  text: string,
  location: LocationData | null,
  category?: GrievanceCategory
): SeedGrievance | null {
  if (!text || !location) return null;
  const lower = text.toLowerCase();
  for (const g of SEED_GRIEVANCES) {
    const dist = Math.sqrt(
      Math.pow(location.lat - g.lat, 2) + Math.pow(location.lng - g.lng, 2)
    );
    const sameArea = dist < 0.03;
    const titleWords = g.title.toLowerCase().split(" ").filter((w) => w.length > 4);
    const textMatch = titleWords.filter((w) => lower.includes(w)).length >= 2;
    const catMatch = !category || category === g.category;
    if (sameArea && (textMatch || catMatch)) return g;
  }
  return null;
}

function canNavigateTo(
  target: Step,
  current: Step,
  maxReached: Step,
  isAnalyzing: boolean,
  isSubmitted: boolean
): boolean {
  if (isSubmitted || current === 5) return false;
  if (target === current || isAnalyzing || target === 2) return false;
  return target <= maxReached;
}

function StepIndicator({
  current,
  maxReached,
  isAnalyzing,
  isSubmitted,
  onStepClick,
}: {
  current: Step;
  maxReached: Step;
  isAnalyzing: boolean;
  isSubmitted: boolean;
  onStepClick: (step: Step) => void;
}) {
  const steps = [
    { num: 1 as Step, label: "Describe" },
    { num: 2 as Step, label: "Analyze" },
    { num: 3 as Step, label: "Review" },
    { num: 4 as Step, label: "Summary" },
    { num: 5 as Step, label: "Submit" },
  ];
  return (
    <div className="flex items-center justify-center gap-0">
      {steps.map((step, i) => {
        const navigable = canNavigateTo(step.num, current, maxReached, isAnalyzing, isSubmitted);
        return (
          <div key={step.num} className="flex items-center">
            <div className="flex flex-col items-center">
              <button
                type="button"
                disabled={!navigable}
                onClick={() => navigable && onStepClick(step.num)}
                title={
                  navigable
                    ? `Go back to ${step.label}`
                    : isAnalyzing
                    ? "Please wait for analysis to finish"
                    : undefined
                }
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step.num < current
                    ? "bg-green-500 text-white"
                    : step.num === current
                    ? "bg-[#1a3c6e] text-white shadow-md scale-105"
                    : step.num <= maxReached
                    ? "bg-blue-100 text-blue-700"
                    : "bg-slate-200 text-slate-400"
                } ${navigable ? "cursor-pointer hover:scale-105 hover:shadow-md" : "cursor-default"}`}
              >
                {step.num < current ? <CheckCircle2 size={11} /> : step.num}
              </button>
              <span
                className={`text-[9px] mt-0.5 font-medium text-center leading-tight max-w-[48px] ${
                  step.num === current
                    ? "text-[#1a3c6e]"
                    : navigable
                    ? "text-blue-600"
                    : "text-slate-400"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-5 sm:w-8 h-0.5 mb-3 mx-0.5 transition-colors ${
                  step.num < current ? "bg-green-400" : "bg-slate-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function StepBackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#1a3c6e] font-medium transition-colors"
    >
      <ChevronLeft size={16} />
      {label}
    </button>
  );
}

export default function Home() {
  const [activeView, setActiveView] = useState<ActiveView>("file");
  const [step, setStep] = useState<Step>(1);
  const [language, setLanguage] = useState("en");
  const [grievanceText, setGrievanceText] = useState("");
  const [location, setLocation] = useState<LocationData | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<GrievanceCategory | undefined>();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [editedSummary, setEditedSummary] = useState("");
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<SeedGrievance | null>(null);
  const [duplicateDismissed, setDuplicateDismissed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [offlineQueueCount] = useState(0);
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  const [selectedLocalDepartments, setSelectedLocalDepartments] = useState<string[]>([]);
  const [selectedCpgramsCategories, setSelectedCpgramsCategories] = useState<string[]>([]);
  const [maxStepReached, setMaxStepReached] = useState<Step>(1);
  const [routingUpdated, setRoutingUpdated] = useState(false);
  const lastAutoRoutedSummary = useRef<string | null>(null);
  const areaManuallySet = useRef(false);
  const contentScrollRef = useRef<HTMLElement>(null);
  const [selectedArea, setSelectedArea] = useState<{
    ward: string;
    zone: string;
    locality: string;
  } | null>(null);
  const [supplementalDetails, setSupplementalDetails] = useState<SupplementalDetails>({});
  const [autoFilledDetails, setAutoFilledDetails] = useState<
    Partial<Record<SupplementalDetailId, boolean>>
  >({});
  const [analysisSnapshot, setAnalysisSnapshot] = useState<AnalysisSnapshot | null>(null);
  const [formSessionKey, setFormSessionKey] = useState(0);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeFailed, setGeocodeFailed] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const draftReadyRef = useRef(false);
  const draftStateRef = useRef<ComplaintDraft | null>(null);

  useEffect(() => {
    setComplaints(getComplaintHistory());
    const draft = loadComplaintDraft();
    if (draft) {
      setActiveView(draft.activeView);
      setLanguage(draft.language);
      setGrievanceText(draft.grievanceText);
      setLocation(draft.location);
      setSelectedCategory(draft.selectedCategory);
      setAnalysisResult(draft.analysisResult);
      setEditedSummary(draft.editedSummary);
      setDuplicateDismissed(draft.duplicateDismissed);
      setSelectedLocalDepartments(draft.selectedLocalDepartments);
      setSelectedCpgramsCategories(draft.selectedCpgramsCategories);
      setMaxStepReached(draft.maxStepReached);
      setSelectedArea(draft.selectedArea);
      setSupplementalDetails(draft.supplementalDetails);
      setAutoFilledDetails(draft.autoFilledDetails);
      setAnalysisSnapshot(draft.analysisSnapshot);
      setGeocodeFailed(draft.geocodeFailed);
      areaManuallySet.current = draft.areaManuallySet;
      lastAutoRoutedSummary.current = draft.lastAutoRoutedSummary;
      setStep(draft.step === 2 ? (draft.analysisResult ? 3 : 1) : draft.step);
      setDraftSavedAt(draft.savedAt);
      setDraftRestored(true);
    }
    draftReadyRef.current = true;
  }, []);

  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    setIsOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  // Check for duplicates whenever text or location changes
  useEffect(() => {
    if (grievanceText.length > 20 && location) {
      const dup = findDuplicate(grievanceText, location, selectedCategory);
      setDuplicate(dup);
      setDuplicateDismissed(false);
    }
  }, [grievanceText, location, selectedCategory]);

  const scrollContentToTop = (behavior: ScrollBehavior = "smooth") => {
    contentScrollRef.current?.scrollTo({ top: 0, behavior });
  };

  // Scroll content to top when workflow step or view changes
  useEffect(() => {
    scrollContentToTop();
  }, [step, activeView]);

  // Re-route departments & keywords when citizen edits the AI summary on step 3
  useEffect(() => {
    if (step !== 3 || !editedSummary.trim()) return;

    const timer = setTimeout(() => {
      if (lastAutoRoutedSummary.current === editedSummary) return;

      const result = rerouteFromSummary(editedSummary);
      lastAutoRoutedSummary.current = editedSummary;

      setSelectedLocalDepartments(result.localDepartments);
      setSelectedCpgramsCategories(result.cpgramsCategories);
      if (!areaManuallySet.current) {
        void geocodeComplaintLocation(`${grievanceText}\n${editedSummary}`);
      }
      setAnalysisResult((prev) =>
        prev
          ? {
              ...prev,
              keywords: result.keywords,
              local_department: result.localDepartments[0],
              local_departments: result.localDepartments,
              cpgrams_category: result.cpgramsCategories[0],
              cpgrams_categories: result.cpgramsCategories,
            }
          : null
      );
      setRoutingUpdated(true);
      window.setTimeout(() => setRoutingUpdated(false), 2500);
    }, 500);

    return () => clearTimeout(timer);
  }, [editedSummary, step]);

  const buildDraftSnapshot = (): ComplaintDraft => ({
    version: 1,
    savedAt: new Date().toISOString(),
    activeView,
    step: isAnalyzing ? 2 : step,
    language,
    grievanceText,
    location,
    selectedCategory,
    analysisResult,
    editedSummary,
    duplicateDismissed,
    selectedLocalDepartments,
    selectedCpgramsCategories,
    maxStepReached,
    selectedArea,
    supplementalDetails,
    autoFilledDetails,
    analysisSnapshot,
    areaManuallySet: areaManuallySet.current,
    geocodeFailed,
    lastAutoRoutedSummary: lastAutoRoutedSummary.current,
  });

  draftStateRef.current = buildDraftSnapshot();

  useEffect(() => {
    if (!draftReadyRef.current) return;
    if (step === 5 && submittedId) {
      clearComplaintDraft();
      return;
    }

    const timer = window.setTimeout(() => {
      const draft = buildDraftSnapshot();
      saveComplaintDraft(draft);
      setDraftSavedAt(draft.savedAt);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [
    activeView,
    step,
    language,
    grievanceText,
    location,
    selectedCategory,
    analysisResult,
    editedSummary,
    duplicateDismissed,
    selectedLocalDepartments,
    selectedCpgramsCategories,
    maxStepReached,
    selectedArea,
    supplementalDetails,
    autoFilledDetails,
    analysisSnapshot,
    geocodeFailed,
    isAnalyzing,
    submittedId,
  ]);

  useEffect(() => {
    const flushDraft = () => {
      if (!draftReadyRef.current || !draftStateRef.current) return;
      if (draftStateRef.current.step === 5) {
        clearComplaintDraft();
        return;
      }
      saveComplaintDraft(draftStateRef.current);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") flushDraft();
    };

    window.addEventListener("pagehide", flushDraft);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", flushDraft);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const goToStep = (target: Step) => {
    if (submittedId && step === 5) return;
    if (!canNavigateTo(target, step, maxStepReached, isAnalyzing, Boolean(submittedId && step === 5))) return;
    setIsAnalyzing(false);
    setStep(target);
  };

  const scoringSupplemental = useMemo(
    () => buildScoringSupplemental(supplementalDetails),
    [supplementalDetails]
  );

  const completenessReport = useMemo(() => {
    if (!analysisResult) return null;
    return assessComplaintCompleteness({
      grievanceText,
      editedSummary,
      location,
      selectedArea,
      selectedLocalDepartments,
      supplemental: scoringSupplemental,
      aiMissing: analysisResult.missing_details_advisory.is_missing,
      aiObservation: analysisResult.missing_details_advisory.observation,
      wardAutoFillFailed: geocodeFailed && !areaManuallySet.current,
    });
  }, [
    grievanceText,
    editedSummary,
    location,
    selectedArea,
    selectedLocalDepartments,
    scoringSupplemental,
    analysisResult,
    geocodeFailed,
  ]);

  const handleDetailChange = (id: SupplementalDetailId, value: string) => {
    setSupplementalDetails((prev) => ({ ...prev, [id]: value }));
    setAutoFilledDetails((prev) => ({ ...prev, [id]: false }));
  };

  const handleDetailBlur = async (id: SupplementalDetailId, value: string) => {
    if (id === "ward" && value.trim().length >= 3) {
      const resolved = await geocodeComplaintLocation(value);
      if (!resolved) {
        const extracted = extractAreaFromText(value);
        if (extracted) applySelectedArea(extracted, true);
      } else {
        areaManuallySet.current = true;
      }
    }
  };

  const canSkipReanalysis = (): boolean =>
    Boolean(
      analysisResult &&
        analysisSnapshot &&
        analysisSnapshot.grievanceText === grievanceText.trim() &&
        analysisSnapshot.language === language
    );

  const handleContinueFromDescribe = () => {
    if (!grievanceText.trim() || grievanceText.trim().length < 10) {
      setAnalysisError("Please describe your grievance in at least 10 characters.");
      return;
    }
    if (canSkipReanalysis()) {
      setAnalysisError(null);
      applyAutoFillFromComplaint(grievanceText, editedSummary);
      setStep(3);
      return;
    }
    handleAnalyze();
  };

  const geocodeComplaintLocation = async (
    text: string,
    aiLocation?: { locality?: string; ward?: string }
  ): Promise<boolean> => {
    if (!text.trim() || areaManuallySet.current) return false;

    setIsGeocoding(true);
    try {
      const res = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          aiLocality: aiLocation?.locality,
          aiWard: aiLocation?.ward,
        }),
      });
      const data = await res.json();

      if (data.resolved && !areaManuallySet.current) {
        applySelectedArea(
          {
            ward: data.ward,
            zone: data.zone,
            locality: data.locality,
          },
          false,
          true
        );
        setLocation({
          lat: data.lat,
          lng: data.lng,
          ward: data.ward,
          zone: data.zone,
          locality: data.locality,
          source: "nlp",
        });
        setGeocodeFailed(false);
        return true;
      }

      setGeocodeFailed(true);
      return false;
    } catch {
      setGeocodeFailed(true);
      return false;
    } finally {
      setIsGeocoding(false);
    }
  };

  const applySelectedArea = (
    area: { ward: string; zone: string; locality: string } | null,
    manual = false,
    autoFilled = false
  ) => {
    if (!area) {
      if (manual) areaManuallySet.current = false;
      setSelectedArea(null);
      setGeocodeFailed(true);
      setSupplementalDetails((prev) => {
        const next = { ...prev };
        delete next.ward;
        return next;
      });
      setAutoFilledDetails((prev) => ({ ...prev, ward: false }));
      return;
    }

    if (manual) areaManuallySet.current = true;
    setSelectedArea(area);
    setGeocodeFailed(false);
    setSupplementalDetails((prev) => ({
      ...prev,
      ward: `${area.locality} · ${area.ward}`,
    }));
    if (autoFilled) {
      setAutoFilledDetails((prev) => ({ ...prev, ward: true }));
    } else if (manual) {
      setAutoFilledDetails((prev) => ({ ...prev, ward: false }));
    }
    setAnalysisResult((prev) =>
      prev
        ? {
            ...prev,
            location: {
              ...prev.location,
              ward: area.ward,
              zone: area.zone,
              locality: area.locality,
            },
          }
        : null
    );
  };

  const applyAutoFillFromComplaint = (text: string, summary: string) => {
    const { details, autoFilled } = extractAutoFillSupplemental(text, summary);
    setSupplementalDetails((prev) => {
      const next = { ...prev };
      const newlyAutoFilled: Partial<Record<SupplementalDetailId, boolean>> = {};
      (Object.keys(details) as SupplementalDetailId[]).forEach((id) => {
        if (!prev[id]?.trim() && details[id]?.trim()) {
          next[id] = details[id];
          if (autoFilled[id]) newlyAutoFilled[id] = true;
        }
      });
      if (Object.keys(newlyAutoFilled).length > 0) {
        setAutoFilledDetails((af) => ({ ...af, ...newlyAutoFilled }));
      }
      return next;
    });
  };

  const applyDepartmentSelection = (depts: string[]) => {
    const cpgrams = cpgramsForLocalDepartments(
      depts.length > 0 ? depts : ["BBMP General Services"]
    );
    setSelectedLocalDepartments(depts);
    setSelectedCpgramsCategories(cpgrams);
    setAnalysisResult((prev) =>
      prev
        ? {
            ...prev,
            local_department: depts[0] || prev.local_department,
            local_departments: depts,
            cpgrams_category: cpgrams[0] || prev.cpgrams_category,
            cpgrams_categories: cpgrams,
          }
        : null
    );
    lastAutoRoutedSummary.current = editedSummary;
  };

  const handleFixCompletenessField = (fieldId: string) => {
    if (fieldId === "description") {
      goToStep(1);
      return;
    }
    if (fieldId === "departments") {
      document.getElementById("routing-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (fieldId === "ward" || fieldId === "landmark") {
      document.getElementById("completeness-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleAnalyze = async () => {
    if (!grievanceText.trim() || grievanceText.trim().length < 10) {
      setAnalysisError("Please describe your grievance in at least 10 characters.");
      return;
    }
    if (canSkipReanalysis()) {
      setAnalysisError(null);
      applyAutoFillFromComplaint(grievanceText, editedSummary);
      setStep(3);
      return;
    }
    setIsAnalyzing(true);
    setAnalysisError(null);
    setStep(2);
    setMaxStepReached((m) => (m < 2 ? 2 : m));

    try {
      const res = await fetch("/api/analyze-grievance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: grievanceText,
          lat: location?.lat,
          lng: location?.lng,
          ward: location?.ward,
          zone: location?.zone,
          language,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Analysis failed");
      }
      const data: AnalysisResult = await res.json();
      setAnalysisResult(data);
      setEditedSummary(data.summary);
      const localDepts = data.local_departments?.length
        ? data.local_departments
        : [data.local_department];
      const cpgramsCats = data.cpgrams_categories?.length
        ? data.cpgrams_categories
        : [data.cpgrams_category];
      setSelectedLocalDepartments(localDepts);
      setSelectedCpgramsCategories(cpgramsCats);
      lastAutoRoutedSummary.current = data.summary;
      areaManuallySet.current = false;
      setGeocodeFailed(false);
      const geoResolved = await geocodeComplaintLocation(`${grievanceText}\n${data.summary}`, {
        locality: data.location.locality,
        ward: data.location.ward,
      });

      if (!geoResolved && data.location.latitude && data.location.longitude) {
        const sugLoc = {
          lat: data.location.latitude,
          lng: data.location.longitude,
          ward: data.location.ward,
          zone: data.location.zone,
          locality: data.location.locality,
        };
        setLocation({ ...sugLoc, source: "nlp" });
      }

      setStep(3);
      setMaxStepReached((m) => (m < 3 ? 3 : m));
      applyAutoFillFromComplaint(grievanceText, data.summary);
      setAnalysisSnapshot({ grievanceText: grievanceText.trim(), language });
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : "Unknown error occurred");
      setStep(1);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting || submittedId) return;
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1500));
    const id = `GRV-BLR-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    if (analysisResult) {
      const record: ComplaintRecord = {
        id,
        raisedAt: new Date().toISOString(),
        rawText: grievanceText,
        aiSummary: editedSummary + formatSupplementalForSummary(scoringSupplemental),
        status: "Submitted",
        localDepartments: selectedLocalDepartments.length
          ? selectedLocalDepartments
          : analysisResult.local_departments?.length
          ? analysisResult.local_departments
          : [analysisResult.local_department],
        urgency: analysisResult.urgency,
        ward: selectedArea?.ward || location?.ward || analysisResult.location.ward,
        locality: selectedArea?.locality || location?.locality || analysisResult.location.locality,
      };
      setComplaints(saveComplaintToHistory(record));
    }

    setSubmittedId(id);
    setStep(5);
    setMaxStepReached(5);
    clearComplaintDraft();
    setDraftRestored(false);
    setDraftSavedAt(null);
    setIsSubmitting(false);
  };

  const handleReset = () => {
    clearComplaintDraft();
    setDraftRestored(false);
    setDraftSavedAt(null);
    setActiveView("file");
    setStep(1);
    setGrievanceText("");
    setLocation(null);
    setSelectedCategory(undefined);
    setAnalysisResult(null);
    setEditedSummary("");
    setAnalysisError(null);
    setDuplicate(null);
    setDuplicateDismissed(false);
    setSubmittedId(null);
    setSelectedLocalDepartments([]);
    setSelectedCpgramsCategories([]);
    setSelectedArea(null);
    setSupplementalDetails({});
    setAutoFilledDetails({});
    areaManuallySet.current = false;
    setAnalysisSnapshot(null);
    setMaxStepReached(1);
    lastAutoRoutedSummary.current = null;
    setFormSessionKey((k) => k + 1);
    setGeocodeFailed(false);
    setIsGeocoding(false);
    scrollContentToTop();
  };

  const handleLocalDepartmentsChange = (depts: string[]) => {
    applyDepartmentSelection(depts);
  };

  const handleContinueToSummary = () => {
    setStep(4);
    setMaxStepReached((m) => (m < 4 ? 4 : m));
    scrollContentToTop();
  };

  return (
    <div className="h-dvh flex flex-col bg-slate-100 overflow-hidden">
      <div className="flex-shrink-0 z-50 bg-slate-100 border-b border-slate-200/80 shadow-sm">
        <Header
          embedded
          selectedLanguage={language}
          onLanguageChange={setLanguage}
          isOnline={isOnline}
          offlineQueueCount={offlineQueueCount}
          onMyComplaintsClick={() => {
            if (step === 5 && submittedId) handleReset();
            setActiveView("history");
          }}
          complaintCount={complaints.length}
        />

        <div className="max-w-2xl mx-auto px-4 pt-2 pb-2">
          <div className="text-center mb-2">
            <h2 className="text-lg font-bold text-[#1a3c6e] leading-tight">
              {activeView === "history" ? "My Complaint History" : "File a Civic Grievance"}
            </h2>
            {activeView === "history" && (
              <p className="text-slate-500 text-xs mt-0.5">
                Track status, resolutions, and rate closed complaints
              </p>
            )}
          </div>

          <div className="flex gap-1.5 mb-2 p-0.5 bg-slate-200/60 rounded-lg">
            <button
              type="button"
              onClick={() => {
                if (step === 5) handleReset();
                setActiveView("file");
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeView === "file"
                  ? "bg-white text-[#1a3c6e] shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <PlusCircle size={14} />
              File Complaint
            </button>
            <button
              type="button"
              onClick={() => setActiveView("history")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeView === "history"
                  ? "bg-white text-[#1a3c6e] shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <History size={14} />
              My Complaints
              {complaints.length > 0 && (
                <span className="bg-[#1a3c6e] text-white text-[9px] font-bold px-1 py-0 rounded-full min-w-[14px] text-center">
                  {complaints.length}
                </span>
              )}
            </button>
          </div>

          {activeView === "file" && step !== 5 && (
            <div className="pb-0.5">
              <StepIndicator
                current={step}
                maxReached={maxStepReached}
                isAnalyzing={isAnalyzing}
                isSubmitted={false}
                onStepClick={goToStep}
              />
            </div>
          )}
        </div>
      </div>

      <main ref={contentScrollRef} className="flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-2xl mx-auto px-4 pb-12 pt-3">

        {/* ── HISTORY VIEW ─────────────────────────────────────────── */}
        {activeView === "history" && (
          <ComplaintHistory complaints={complaints} onUpdate={setComplaints} />
        )}

        {/* ── FILE COMPLAINT VIEW ──────────────────────────────────── */}
        {activeView === "file" && (
        <>
        {draftRestored && step !== 5 && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
            <FileText size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900">Draft restored</p>
              <p className="text-xs text-amber-800 mt-0.5">
                Your in-progress complaint was saved automatically
                {draftSavedAt ? ` on ${formatDraftSavedAt(draftSavedAt)}` : ""}. Continue where you left off.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDraftRestored(false)}
              className="text-amber-600 hover:text-amber-800 p-1"
              aria-label="Dismiss draft notice"
            >
              <X size={16} />
            </button>
          </div>
        )}
        {(step === 1 && !isAnalyzing) && (
          <div className="space-y-4">
            {maxStepReached >= 3 && (
              <StepBackButton
                label="Back to Review"
                onClick={() => goToStep(3)}
              />
            )}
            {maxStepReached >= 3 && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
                {canSkipReanalysis()
                  ? "No changes to your description — you can continue straight to review without re-running AI analysis."
                  : "You returned to edit your complaint. Update your description to refresh the AI summary."}
              </div>
            )}
            {/* Complaint description */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-5 py-4">
                <h3 className="font-semibold text-slate-800 text-sm">
                  Describe Your Grievance
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Type or tap the microphone to speak. Include issue details and any landmarks you know.
                </p>
              </div>
              <div className="p-5">
                <VoiceTextRecorder
                  key={formSessionKey}
                  text={grievanceText}
                  onTextChange={setGrievanceText}
                  language={language}
                />
                {analysisError && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-red-700 text-sm">
                    <AlertCircle size={16} className="flex-shrink-0" />
                    {analysisError}
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleContinueFromDescribe}
              disabled={isAnalyzing || !grievanceText.trim() || grievanceText.trim().length < 10}
              className="w-full bg-[#1a3c6e] hover:bg-[#2563eb] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Sparkles size={18} />
              {canSkipReanalysis() ? "Continue to Review" : "Continue to AI Analysis"}
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {activeView === "file" && step === 2 && isAnalyzing && <AnalysisLoading />}

        {/* ── STEP 3: Review & Edit ─────────────────────────────────── */}
        {activeView === "file" && step === 3 && analysisResult && (
          <div className="space-y-4">
            <StepBackButton
              label="Back to Describe"
              onClick={() => goToStep(1)}
            />

            {/* AI Summary first */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Sparkles size={16} className="text-blue-500" />
                  AI Summary
                </h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    analysisResult.confidence >= 85
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {analysisResult.confidence}% confident
                </span>
              </div>

              <textarea
                value={editedSummary}
                onChange={(e) => setEditedSummary(e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 text-sm border border-blue-200 bg-blue-50/50 rounded-lg focus:border-blue-500 focus:outline-none resize-none text-slate-800 focus:bg-white transition-colors"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Edit to refine — routing and location detection update automatically.
              </p>
              {routingUpdated && (
                <p className="text-[10px] text-green-600 mt-1 flex items-center gap-1">
                  <CheckCircle2 size={10} />
                  Routing updated
                </p>
              )}
              {isGeocoding && (
                <p className="text-[10px] text-blue-600 mt-1 flex items-center gap-1">
                  <Loader2 size={10} className="animate-spin" />
                  Detecting ward from your complaint…
                </p>
              )}

              <div className="mt-3">
                <RoutingPanel
                  localDepartments={selectedLocalDepartments}
                  cpgramsCategories={selectedCpgramsCategories}
                  localOptions={LOCAL_DEPARTMENTS}
                  cpgramsOptions={CPGRAMS_MINISTRIES}
                  onLocalChange={handleLocalDepartmentsChange}
                  onCpgramsChange={setSelectedCpgramsCategories}
                  routingUpdated={routingUpdated}
                />
              </div>
            </div>

            {completenessReport && (
                <CompletenessCard
                  report={completenessReport}
                  supplementalDetails={supplementalDetails}
                  autoFilledDetails={autoFilledDetails}
                  selectedArea={selectedArea}
                  onDetailChange={handleDetailChange}
                  onDetailBlur={handleDetailBlur}
                  onWardAreaChange={(area) => applySelectedArea(area, true)}
                  onFixField={handleFixCompletenessField}
                />
            )}

            {/* Duplicate banner */}
            {duplicate && !duplicateDismissed && (
              <DuplicateBanner
                match={duplicate}
                onUpvote={(id) => console.log("Upvoted:", id)}
                onDismiss={() => setDuplicateDismissed(true)}
              />
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => goToStep(1)}
                className="flex items-center gap-2 px-5 py-3 border-2 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-medium transition-colors"
              >
                <ChevronLeft size={16} />
                Back
              </button>
              <button
                onClick={handleContinueToSummary}
                disabled={selectedLocalDepartments.length === 0}
                className="flex-1 bg-[#1a3c6e] hover:bg-[#2563eb] disabled:bg-slate-300 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                Continue to Summary
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Summary ───────────────────────────────────────── */}
        {activeView === "file" && step === 4 && analysisResult && (
          <div className="space-y-4">
            <StepBackButton label="Back to Review" onClick={() => goToStep(3)} />

            <ComplaintSummaryReview
              grievanceText={grievanceText}
              editedSummary={editedSummary}
              supplementalSummary={formatSupplementalForSummary(scoringSupplemental)}
              localDepartments={
                selectedLocalDepartments.length
                  ? selectedLocalDepartments
                  : analysisResult.local_departments?.length
                  ? analysisResult.local_departments
                  : [analysisResult.local_department]
              }
              cpgramsCategories={
                selectedCpgramsCategories.length
                  ? selectedCpgramsCategories
                  : analysisResult.cpgrams_categories?.length
                  ? analysisResult.cpgrams_categories
                  : [analysisResult.cpgrams_category]
              }
              selectedArea={selectedArea}
              areaAutoFilled={Boolean(autoFilledDetails.ward)}
              onAreaChange={(area) => applySelectedArea(area, true)}
              onEditReview={() => goToStep(3)}
            />

            <div className="flex gap-3">
              <button
                onClick={() => goToStep(3)}
                className="flex items-center gap-2 px-5 py-3 border-2 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-medium transition-colors"
              >
                <ChevronLeft size={16} />
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || selectedLocalDepartments.length === 0 || !selectedArea}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Submit Official Complaint
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 5: Submitted ─────────────────────────────────────── */}
        {activeView === "file" && step === 5 && submittedId && (
          <div className="space-y-5">
            {/* Success */}
            <div className="bg-white rounded-2xl shadow-sm border border-green-200 p-8 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                <CheckCircle2 size={40} className="text-green-600" />
              </div>
              <h3 className="font-bold text-xl text-green-800 mb-2">
                Complaint Submitted Successfully!
              </h3>
              <p className="text-slate-500 text-sm mb-6">
                Your grievance has been officially filed and routed to the appropriate department.
                Use <span className="font-medium text-slate-700">My Complaints</span> to track it, or file a new grievance from the home screen.
              </p>

              {/* Reference ID */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                <p className="text-xs text-green-600 font-medium uppercase tracking-wider mb-1">
                  Reference Number
                </p>
                <p className="font-mono font-black text-2xl text-green-800 tracking-widest">
                  {submittedId}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Save this for tracking your complaint status
                </p>
              </div>

              {/* Next steps */}
              {analysisResult && (
                <div className="text-left space-y-2 mb-6">
                  <p className="font-semibold text-slate-700 text-sm">What happens next:</p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-3 bg-slate-50 rounded-lg px-3 py-2">
                      <span className="text-base">📩</span>
                      <span className="text-sm text-slate-600">
                        SMS confirmation sent to +91 98765 43210
                      </span>
                    </div>
                    <div className="flex items-start gap-3 bg-slate-50 rounded-lg px-3 py-2">
                      <span className="text-base">🏛️</span>
                      <div className="text-sm text-slate-600">
                        <span className="font-medium">Routed to local departments:</span>
                        <ul className="mt-1 space-y-0.5">
                          {(selectedLocalDepartments.length
                            ? selectedLocalDepartments
                            : analysisResult.local_departments?.length
                            ? analysisResult.local_departments
                            : [analysisResult.local_department]
                          ).map((dept) => (
                            <li key={dept} className="flex items-center gap-1.5">
                              <ChevronRight size={10} className="text-blue-400 flex-shrink-0" />
                              {dept}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 bg-slate-50 rounded-lg px-3 py-2">
                      <span className="text-base">📋</span>
                      <div className="text-sm text-slate-600">
                        <span className="font-medium">CPGRAMS ministries notified:</span>
                        <ul className="mt-1 space-y-0.5">
                          {(selectedCpgramsCategories.length
                            ? selectedCpgramsCategories
                            : analysisResult.cpgrams_categories?.length
                            ? analysisResult.cpgrams_categories
                            : [analysisResult.cpgrams_category]
                          ).map((cat) => (
                            <li key={cat} className="flex items-center gap-1.5">
                              <ChevronRight size={10} className="text-purple-400 flex-shrink-0" />
                              {cat}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 bg-slate-50 rounded-lg px-3 py-2">
                      <span className="text-base">⏱️</span>
                      <span className="text-sm text-slate-600">
                        Response expected within 48–72 hours. You will receive SMS updates on progress.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const depts = (selectedLocalDepartments.length
                      ? selectedLocalDepartments
                      : analysisResult?.local_departments?.length
                      ? analysisResult.local_departments
                      : [analysisResult?.local_department]
                    ).filter(Boolean).join(", ");
                    const cats = (selectedCpgramsCategories.length
                      ? selectedCpgramsCategories
                      : analysisResult?.cpgrams_categories?.length
                      ? analysisResult.cpgrams_categories
                      : [analysisResult?.cpgrams_category]
                    ).filter(Boolean).join(", ");
                    const text = `CPGRAMS Complaint: ${submittedId}\n${editedSummary}\nDepartments: ${depts}\nCPGRAMS: ${cats}`;
                    const blob = new Blob([text], { type: "text/plain" });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = `${submittedId}.txt`;
                    a.click();
                  }}
                  className="flex items-center gap-2 px-4 py-3 border-2 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-medium text-sm transition-colors"
                >
                  <Download size={14} />
                  Download Receipt
                </button>
                <button
                  onClick={() => {
                    handleReset();
                    setActiveView("history");
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-[#1a3c6e] font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <History size={16} />
                  View in My Complaints
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 bg-[#1a3c6e] hover:bg-[#2563eb] text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw size={16} />
                  File Another Complaint
                </button>
              </div>
            </div>
          </div>
        )}
        </>
        )}
        </div>

        {/* Footer */}
        <footer className="bg-[#1a3c6e] text-white py-6 mt-4">
          <div className="max-w-5xl mx-auto px-4 text-center">
            <p className="text-blue-200 text-xs mb-1">
              AI CPGRAMS Local · BBMP Grievance Portal · Bengaluru, Karnataka
            </p>
            <p className="text-blue-300/60 text-xs">
              Powered by Next.js · Grievance data is end-to-end encrypted and handled as per IT Act 2000 &amp; Digital Personal Data Protection Act 2023
            </p>
            <p className="text-blue-300/60 text-xs mt-1">
              Civic Helpline: <span className="text-orange-300">1533</span> · BBMP: <span className="text-orange-300">080-22660000</span> · BWSSB: <span className="text-orange-300">1916</span>
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}

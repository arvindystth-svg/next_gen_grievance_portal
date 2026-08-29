"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import Header from "@/components/Header";
import VoiceTextRecorder from "@/components/VoiceTextRecorder";
import DuplicateBanner from "@/components/DuplicateBanner";
import ComplaintHistory from "@/components/ComplaintHistory";
import CompletenessCard from "@/components/CompletenessCard";
import DepartmentSelector from "@/components/DepartmentSelector";
import WardAreaSelector from "@/components/WardAreaSelector";
import { assessComplaintCompleteness, SupplementalDetailId, SupplementalDetails, formatSupplementalForSummary } from "@/lib/complaintCompleteness";
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
  FileText,
  Tag,
  MapPin,
  History,
  PlusCircle,
} from "lucide-react";
import { rerouteFromSummary } from "@/lib/summaryRouting";

// Dynamically import Leaflet-based LocationPicker (no SSR)
const LocationPicker = dynamic(() => import("@/components/LocationPicker"), {
  ssr: false,
  loading: () => (
    <div className="h-64 bg-slate-100 rounded-xl flex items-center justify-center animate-pulse">
      <span className="text-slate-400 text-sm">Loading map…</span>
    </div>
  ),
});

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

type Step = 1 | 2 | 3 | 4;
type ActiveView = "file" | "history";

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
  isAnalyzing: boolean
): boolean {
  if (target === current || isAnalyzing || target === 2) return false;
  return target <= maxReached;
}

function StepIndicator({
  current,
  maxReached,
  isAnalyzing,
  onStepClick,
}: {
  current: Step;
  maxReached: Step;
  isAnalyzing: boolean;
  onStepClick: (step: Step) => void;
}) {
  const steps = [
    { num: 1 as Step, label: "Describe" },
    { num: 2 as Step, label: "AI Analysis" },
    { num: 3 as Step, label: "Review" },
    { num: 4 as Step, label: "Submit" },
  ];
  return (
    <div className="flex items-center justify-center gap-0 mb-6">
      {steps.map((step, i) => {
        const navigable = canNavigateTo(step.num, current, maxReached, isAnalyzing);
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
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step.num < current
                    ? "bg-green-500 text-white"
                    : step.num === current
                    ? "bg-[#1a3c6e] text-white shadow-lg scale-110"
                    : step.num <= maxReached
                    ? "bg-blue-100 text-blue-700"
                    : "bg-slate-200 text-slate-400"
                } ${navigable ? "cursor-pointer hover:scale-105 hover:shadow-md" : "cursor-default"}`}
              >
                {step.num < current ? <CheckCircle2 size={14} /> : step.num}
              </button>
              <span
                className={`text-[10px] mt-1 font-medium text-center leading-tight max-w-[60px] ${
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
                className={`w-12 sm:w-20 h-0.5 mb-4 mx-1 transition-colors ${
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
  const [suggestedLocation, setSuggestedLocation] = useState<{
    lat: number;
    lng: number;
    ward?: string;
    zone?: string;
    locality?: string;
  } | null>(null);
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  const [selectedLocalDepartments, setSelectedLocalDepartments] = useState<string[]>([]);
  const [selectedCpgramsCategories, setSelectedCpgramsCategories] = useState<string[]>([]);
  const [maxStepReached, setMaxStepReached] = useState<Step>(1);
  const [routingUpdated, setRoutingUpdated] = useState(false);
  const lastAutoRoutedSummary = useRef<string | null>(null);
  const locationSectionRef = useRef<HTMLDivElement>(null);
  const areaSectionRef = useRef<HTMLDivElement>(null);
  const areaManuallySet = useRef(false);
  const [selectedArea, setSelectedArea] = useState<{
    ward: string;
    zone: string;
    locality: string;
  } | null>(null);
  const [enabledDetails, setEnabledDetails] = useState<Partial<Record<SupplementalDetailId, boolean>>>({});
  const [supplementalDetails, setSupplementalDetails] = useState<SupplementalDetails>({});

  useEffect(() => {
    setComplaints(getComplaintHistory());
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

  // Scroll to top when workflow step or view changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
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
        const extracted = extractAreaFromText(`${grievanceText}\n${editedSummary}`);
        if (extracted) applySelectedArea(extracted);
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

  const goToStep = (target: Step) => {
    if (!canNavigateTo(target, step, maxStepReached, isAnalyzing)) return;
    if (step === 4) setSubmittedId(null);
    setIsAnalyzing(false);
    setStep(target);
  };

  const effectiveSupplemental = useMemo(() => {
    const result: SupplementalDetails = {};
    (Object.keys(supplementalDetails) as SupplementalDetailId[]).forEach((key) => {
      if (enabledDetails[key] && supplementalDetails[key]?.trim()) {
        result[key] = supplementalDetails[key];
      }
    });
    return result;
  }, [enabledDetails, supplementalDetails]);

  const completenessReport = useMemo(() => {
    if (!analysisResult) return null;
    return assessComplaintCompleteness({
      grievanceText,
      editedSummary,
      location,
      selectedArea,
      selectedLocalDepartments,
      supplemental: effectiveSupplemental,
      aiMissing: analysisResult.missing_details_advisory.is_missing,
      aiObservation: analysisResult.missing_details_advisory.observation,
    });
  }, [
    grievanceText,
    editedSummary,
    location,
    selectedArea,
    selectedLocalDepartments,
    effectiveSupplemental,
    analysisResult,
  ]);

  const handleToggleDetail = (id: SupplementalDetailId, enabled: boolean) => {
    setEnabledDetails((prev) => ({ ...prev, [id]: enabled }));
    if (!enabled) {
      setSupplementalDetails((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleDetailChange = (id: SupplementalDetailId, value: string) => {
    setSupplementalDetails((prev) => ({ ...prev, [id]: value }));
    if (id === "ward" && value.trim().length >= 3) {
      const extracted = extractAreaFromText(value);
      if (extracted) applySelectedArea(extracted);
    }
  };

  const applySelectedArea = (area: { ward: string; zone: string; locality: string }, manual = false) => {
    if (manual) areaManuallySet.current = true;
    setSelectedArea(area);
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
      areaSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleReviewLocationChange = (loc: LocationData) => {
    setLocation(loc);
    const wardInfo = loc.ward
      ? { ward: loc.ward, zone: loc.zone || "To be confirmed", locality: loc.locality || loc.ward }
      : null;
    if (wardInfo) applySelectedArea(wardInfo);
    setAnalysisResult((prev) =>
      prev
        ? {
            ...prev,
            location: {
              ...prev.location,
              latitude: loc.lat,
              longitude: loc.lng,
              ward: loc.ward || prev.location.ward,
              zone: loc.zone || prev.location.zone,
              locality: loc.locality || prev.location.locality,
            },
          }
        : null
    );
  };

  const applyDepartmentSelection = (localDepts: string[]) => {
    const cpgrams = cpgramsForLocalDepartments(
      localDepts.length > 0 ? localDepts : ["BBMP General Services"]
    );
    setSelectedLocalDepartments(localDepts);
    setSelectedCpgramsCategories(cpgrams);
    setAnalysisResult((prev) =>
      prev
        ? {
            ...prev,
            local_department: localDepts[0] || prev.local_department,
            local_departments: localDepts,
            cpgrams_category: cpgrams[0] || prev.cpgrams_category,
            cpgrams_categories: cpgrams,
          }
        : null
    );
    lastAutoRoutedSummary.current = editedSummary;
  };

  const handleAnalyze = async () => {
    if (!grievanceText.trim() || grievanceText.trim().length < 10) {
      setAnalysisError("Please describe your grievance in at least 10 characters.");
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
      const extracted =
        extractAreaFromText(`${grievanceText}\n${data.summary}`) ||
        (data.location.ward
          ? {
              ward: data.location.ward,
              zone: data.location.zone,
              locality: data.location.locality,
            }
          : null);
      if (extracted) applySelectedArea(extracted);

      // If AI extracted coordinates, suggest optional pin
      if (data.location.latitude && data.location.longitude && !location) {
        const sugLoc = {
          lat: data.location.latitude,
          lng: data.location.longitude,
          ward: data.location.ward,
          zone: data.location.zone,
          locality: data.location.locality,
        };
        setSuggestedLocation(sugLoc);
        setLocation({ ...sugLoc, source: "nlp" });
      }

      setStep(3);
      setMaxStepReached((m) => (m < 3 ? 3 : m));
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : "Unknown error occurred");
      setStep(1);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1500));
    const id = `GRV-BLR-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    if (analysisResult) {
      const record: ComplaintRecord = {
        id,
        raisedAt: new Date().toISOString(),
        rawText: grievanceText,
        aiSummary: editedSummary + formatSupplementalForSummary(effectiveSupplemental),
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
    setStep(4);
    setMaxStepReached(4);
    setIsSubmitting(false);
  };

  const handleReset = () => {
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
    setSuggestedLocation(null);
    setSelectedLocalDepartments([]);
    setSelectedCpgramsCategories([]);
    setSelectedArea(null);
    setEnabledDetails({});
    setSupplementalDetails({});
    areaManuallySet.current = false;
    setMaxStepReached(1);
    lastAutoRoutedSummary.current = null;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLocalDepartmentsChange = (depts: string[]) => {
    applyDepartmentSelection(depts);
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <Header
        selectedLanguage={language}
        onLanguageChange={setLanguage}
        isOnline={isOnline}
        offlineQueueCount={offlineQueueCount}
        onMyComplaintsClick={() => setActiveView("history")}
        complaintCount={complaints.length}
      />

      <main className="max-w-2xl mx-auto px-4 py-6 pb-12">
        {/* Hero */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-[#1a3c6e]">
            {activeView === "history" ? "My Complaint History" : "File a Civic Grievance"}
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            {activeView === "history"
              ? "Track status, resolutions, and rate closed complaints"
              : "AI-powered routing to BBMP, BWSSB & BESCOM · Bengaluru Municipal Services"}
          </p>
        </div>

        {activeView === "file" && (
          <StepIndicator
            current={step}
            maxReached={maxStepReached}
            isAnalyzing={isAnalyzing}
            onStepClick={goToStep}
          />
        )}

        {/* View tabs */}
        <div className="flex gap-2 mb-5 p-1 bg-slate-200/60 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveView("file")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeView === "file"
                ? "bg-white text-[#1a3c6e] shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <PlusCircle size={16} />
            File Complaint
          </button>
          <button
            type="button"
            onClick={() => setActiveView("history")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeView === "history"
                ? "bg-white text-[#1a3c6e] shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <History size={16} />
            My Complaints
            {complaints.length > 0 && (
              <span className="bg-[#1a3c6e] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {complaints.length}
              </span>
            )}
          </button>
        </div>

        {/* ── HISTORY VIEW ─────────────────────────────────────────── */}
        {activeView === "history" && (
          <ComplaintHistory complaints={complaints} onUpdate={setComplaints} />
        )}

        {/* ── FILE COMPLAINT VIEW ──────────────────────────────────── */}
        {activeView === "file" && (
        <>
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
                You returned to edit your complaint. Update your description, then continue to
                refresh the AI summary and pin the location on the review step.
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
              onClick={handleAnalyze}
              disabled={isAnalyzing || !grievanceText.trim() || grievanceText.trim().length < 10}
              className="w-full bg-[#1a3c6e] hover:bg-[#2563eb] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Sparkles size={18} />
              Continue to AI Analysis
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {activeView === "file" && step === 2 && isAnalyzing && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 text-center mt-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles size={28} className="text-blue-600 animate-pulse" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg mb-2">Analyzing your grievance…</h3>
            <p className="text-slate-500 text-sm mb-6">
              AI is processing your complaint, detecting location, classifying department, and checking for duplicates.
            </p>
            <div className="space-y-2 text-left max-w-xs mx-auto">
              {[
                "🔍 Extracting location entities…",
                "🏛️ Routing to correct department…",
                "📋 Generating formal summary…",
                "🔄 Checking for existing reports…",
              ].map((msg, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2"
                  style={{ animationDelay: `${i * 200}ms` }}
                >
                  <Loader2 size={12} className="animate-spin text-blue-400 flex-shrink-0" />
                  {msg}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 3: Review & Edit ─────────────────────────────────── */}
        {activeView === "file" && step === 3 && analysisResult && (
          <div className="space-y-5">
            <StepBackButton
              label="Back to Describe"
              onClick={() => goToStep(1)}
            />

            {completenessReport && (
              <CompletenessCard
                report={completenessReport}
                enabledDetails={enabledDetails}
                supplementalDetails={supplementalDetails}
                onToggleDetail={handleToggleDetail}
                onDetailChange={handleDetailChange}
                onFixField={handleFixCompletenessField}
              />
            )}

            {/* AI Analysis header */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Sparkles size={18} className="text-blue-500" />
                  AI Analysis Complete
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Confidence:</span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      analysisResult.confidence >= 85
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {analysisResult.confidence}%
                  </span>
                  {analysisResult.model && (
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                      {analysisResult.model}
                    </span>
                  )}
                </div>
              </div>

              {/* Editable summary */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-2">
                  <FileText size={12} />
                  Official Complaint Summary
                  <span className="text-blue-500 font-normal normal-case tracking-normal ml-1">(editable)</span>
                </label>
                <textarea
                  value={editedSummary}
                  onChange={(e) => setEditedSummary(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 text-sm border-2 border-blue-200 bg-blue-50 rounded-xl focus:border-blue-500 focus:outline-none resize-none text-slate-800 focus:bg-white transition-colors"
                />
                <p className="text-xs text-slate-400 mt-1">
                  ✏️ Edit the summary to add more issues — classification tags update automatically
                </p>
                {routingUpdated && (
                  <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    Routing tags updated based on your edits
                  </p>
                )}
              </div>

              {/* Classification tags below summary */}
              {(selectedLocalDepartments.length > 0 || selectedCpgramsCategories.length > 0) && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Classification
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedLocalDepartments.map((dept) => (
                      <span
                        key={dept}
                        className="text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full"
                      >
                        {dept}
                      </span>
                    ))}
                    {selectedCpgramsCategories.map((cat) => (
                      <span
                        key={cat}
                        className="text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-full"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Routing — editable inline selectors */}
              <div id="routing-section" className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-1">
                  <Tag size={12} className="text-slate-500" />
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Routing
                  </span>
                </div>

                <DepartmentSelector
                  label="Local Departments"
                  hint="Departments shown above update here. Search to add or remove."
                  selected={selectedLocalDepartments}
                  options={LOCAL_DEPARTMENTS}
                  onChange={handleLocalDepartmentsChange}
                  chipClassName="bg-blue-100 text-blue-700 border-blue-200"
                  placeholder="Search BBMP, BWSSB, BESCOM departments…"
                />

                <DepartmentSelector
                  label="Central CPGRAMS Ministries"
                  hint="Ministries notified on the central portal. Adjust if needed."
                  selected={selectedCpgramsCategories}
                  options={CPGRAMS_MINISTRIES}
                  onChange={setSelectedCpgramsCategories}
                  chipClassName="bg-purple-100 text-purple-700 border-purple-200"
                  placeholder="Search CPGRAMS ministries…"
                />
              </div>
            </div>

            {/* Area & optional pinpoint */}
            <div
              ref={areaSectionRef}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden space-y-0"
            >
              <div className="bg-slate-50 border-b border-slate-200 px-5 py-4">
                <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                  <MapPin size={16} className="text-blue-500" />
                  Affected Area
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ward and locality auto-fill from your complaint. Pinning on the map is optional for area-wide issues.
                </p>
              </div>
              <div className="p-5 space-y-5">
                <WardAreaSelector
                  value={selectedArea}
                  onChange={(area) => applySelectedArea(area, true)}
                />

                <div ref={locationSectionRef}>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Pinpoint on Map (optional)
                  </p>
                  <LocationPicker
                    location={location}
                    onLocationChange={handleReviewLocationChange}
                    suggestedLocation={suggestedLocation}
                  />
                </div>
              </div>
            </div>

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
                onClick={handleSubmit}
                disabled={isSubmitting || selectedLocalDepartments.length === 0}
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

        {/* ── STEP 4: Submitted ─────────────────────────────────────── */}
        {activeView === "file" && step === 4 && submittedId && (
          <div className="space-y-5">
            <StepBackButton
              label="Back to Review & Edit"
              onClick={() => goToStep(3)}
            />
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
                    setActiveView("history");
                    setStep(1);
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
      </main>

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
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-lg px-3 py-2">
      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</div>
      <div className="text-sm font-medium text-slate-700 mt-0.5">{value}</div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Header from "@/components/Header";
import VoiceTextRecorder from "@/components/VoiceTextRecorder";
import AdvisoryCard from "@/components/AdvisoryCard";
import DuplicateBanner from "@/components/DuplicateBanner";
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
  RotateCcw,
  Download,
  FileText,
  Tag,
  MapPin,
} from "lucide-react";

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
  suggested_actions: string[];
  model?: string;
}

type Step = 1 | 2 | 3 | 4;

const URGENCY_CONFIG = {
  HIGH: { color: "bg-red-100 text-red-700 border-red-300", dot: "bg-red-500", label: "High Priority" },
  MEDIUM: { color: "bg-amber-100 text-amber-700 border-amber-300", dot: "bg-amber-500", label: "Medium Priority" },
  LOW: { color: "bg-green-100 text-green-700 border-green-300", dot: "bg-green-500", label: "Low Priority" },
};

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

function StepIndicator({ current }: { current: Step }) {
  const steps = [
    { num: 1, label: "Describe & Locate" },
    { num: 2, label: "AI Analysis" },
    { num: 3, label: "Review & Edit" },
    { num: 4, label: "Submit" },
  ];
  return (
    <div className="flex items-center justify-center gap-0 mb-6">
      {steps.map((step, i) => (
        <div key={step.num} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step.num < current
                  ? "bg-green-500 text-white"
                  : step.num === current
                  ? "bg-[#1a3c6e] text-white shadow-lg scale-110"
                  : "bg-slate-200 text-slate-400"
              }`}
            >
              {step.num < current ? <CheckCircle2 size={14} /> : step.num}
            </div>
            <span
              className={`text-[10px] mt-1 font-medium text-center leading-tight max-w-[60px] ${
                step.num === current ? "text-[#1a3c6e]" : "text-slate-400"
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
      ))}
    </div>
  );
}

export default function Home() {
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

  // Scroll to top when workflow step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const handleAnalyze = async () => {
    if (!grievanceText.trim() || grievanceText.trim().length < 10) {
      setAnalysisError("Please describe your grievance in at least 10 characters.");
      return;
    }
    setIsAnalyzing(true);
    setAnalysisError(null);
    setStep(2);

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

      // If AI extracted a better location, suggest it
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
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : "Unknown error occurred");
      setStep(1);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // Simulate submission (would be a real API call in production)
    await new Promise((r) => setTimeout(r, 1500));
    const id = `GRV-BLR-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    setSubmittedId(id);
    setStep(4);
    setIsSubmitting(false);
  };

  const handleReset = () => {
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <Header
        selectedLanguage={language}
        onLanguageChange={setLanguage}
        isOnline={isOnline}
        offlineQueueCount={offlineQueueCount}
      />

      <main className="max-w-2xl mx-auto px-4 py-6 pb-12">
        {/* Hero */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-[#1a3c6e]">
            File a Civic Grievance
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            AI-powered routing to BBMP, BWSSB &amp; BESCOM · Bengaluru Municipal Services
          </p>
        </div>

        <StepIndicator current={step} />

        {/* ── STEP 1: Input & Location ─────────────────────────────── */}
        {(step === 1 || step === 2) && (
          <div className="space-y-4">
            {/* Complaint description */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-5 py-4">
                <h3 className="font-semibold text-slate-800 text-sm">
                  Describe Your Grievance
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Type or tap the microphone to speak. Include location landmarks and issue details.
                </p>
              </div>
              <div className="p-5">
                <VoiceTextRecorder
                  text={grievanceText}
                  onTextChange={setGrievanceText}
                  language={language}
                />
              </div>
            </div>

            {/* Location */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-5 py-4">
                <h3 className="font-semibold text-slate-800 text-sm">
                  Pinpoint Location
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Use GPS, upload a photo, or drag the pin on the map to mark the exact spot.
                </p>
              </div>
              <div className="p-5">
                <LocationPicker
                  location={location}
                  onLocationChange={setLocation}
                  suggestedLocation={suggestedLocation}
                />
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

            {/* Error */}
            {analysisError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-red-700 text-sm">
                <AlertCircle size={16} className="flex-shrink-0" />
                {analysisError}
              </div>
            )}

            {/* Analyze button */}
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !grievanceText.trim()}
              className="w-full bg-[#1a3c6e] hover:bg-[#2563eb] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 text-base"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Analyzing with AI…
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  ✨ Summarize &amp; Analyze Complaint
                  <ChevronRight size={18} />
                </>
              )}
            </button>

            {!grievanceText.trim() && (
              <p className="text-center text-xs text-slate-400">
                Fill in your grievance description above to continue
              </p>
            )}
          </div>
        )}

        {/* ── STEP 2: Analyzing loader ──────────────────────────────── */}
        {step === 2 && isAnalyzing && (
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
        {step === 3 && analysisResult && (
          <div className="space-y-5">
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
                  ✏️ You can edit the AI-generated summary before submitting
                </p>
              </div>

              {/* Department badges */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-2">
                  <Tag size={12} />
                  Classification &amp; Routing
                </label>
                <div className="space-y-2">
                  <div>
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                      Local Departments
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(analysisResult.local_departments?.length
                        ? analysisResult.local_departments
                        : [analysisResult.local_department]
                      ).map((dept) => (
                        <Badge key={dept} color="blue">
                          {dept}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                      Central CPGRAMS Ministries
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(analysisResult.cpgrams_categories?.length
                        ? analysisResult.cpgrams_categories
                        : [analysisResult.cpgrams_category]
                      ).map((cat) => (
                        <Badge key={cat} color="purple">
                          {cat}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Badge
                    color={
                      analysisResult.urgency === "HIGH"
                        ? "red"
                        : analysisResult.urgency === "MEDIUM"
                        ? "amber"
                        : "green"
                    }
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${URGENCY_CONFIG[analysisResult.urgency].dot} mr-1`} />
                    Priority: {analysisResult.urgency}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Location confirmed */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <h3 className="font-semibold text-slate-700 text-sm mb-3 flex items-center gap-2">
                <MapPin size={16} className="text-blue-500" />
                Location Confirmed
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <InfoRow label="Ward" value={analysisResult.location.ward} />
                <InfoRow label="Zone" value={analysisResult.location.zone} />
                <InfoRow label="Locality" value={analysisResult.location.locality} />
                <InfoRow
                  label="Coordinates"
                  value={`${analysisResult.location.latitude.toFixed(4)}°N, ${analysisResult.location.longitude.toFixed(4)}°E`}
                />
              </div>
            </div>

            {/* Keywords */}
            {analysisResult.keywords?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Extracted Keywords
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {analysisResult.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full"
                    >
                      #{kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested actions */}
            {analysisResult.suggested_actions?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Suggested Field Actions
                </p>
                <ul className="space-y-1">
                  {analysisResult.suggested_actions.map((action, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                      <ChevronRight size={12} className="text-blue-400 flex-shrink-0" />
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Advisory card */}
            {analysisResult.missing_details_advisory.is_missing && (
              <AdvisoryCard
                observation={analysisResult.missing_details_advisory.observation}
                whyItMatters={analysisResult.missing_details_advisory.why_it_matters}
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
                onClick={() => setStep(1)}
                className="flex items-center gap-2 px-5 py-3 border-2 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-medium transition-colors"
              >
                <RotateCcw size={16} />
                Edit
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
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
        {step === 4 && submittedId && (
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
                          {(analysisResult.local_departments?.length
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
                          {(analysisResult.cpgrams_categories?.length
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
                        {analysisResult.urgency === "HIGH"
                          ? "Field crew dispatch within 24 hours (HIGH priority)"
                          : "Response within 48-72 hours"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const depts = (analysisResult?.local_departments?.length
                      ? analysisResult.local_departments
                      : [analysisResult?.local_department]
                    ).filter(Boolean).join(", ");
                    const cats = (analysisResult?.cpgrams_categories?.length
                      ? analysisResult.cpgrams_categories
                      : [analysisResult?.cpgrams_category]
                    ).filter(Boolean).join(", ");
                    const text = `CPGRAMS Complaint: ${submittedId}\n${editedSummary}\nDepartments: ${depts}\nCPGRAMS: ${cats}\nPriority: ${analysisResult?.urgency}`;
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

function Badge({
  children,
  color,
}: {
  children: React.ReactNode;
  color: "blue" | "purple" | "red" | "amber" | "green";
}) {
  const colorMap = {
    blue: "bg-blue-100 text-blue-700 border border-blue-200",
    purple: "bg-purple-100 text-purple-700 border border-purple-200",
    red: "bg-red-100 text-red-700 border border-red-200",
    amber: "bg-amber-100 text-amber-700 border border-amber-200",
    green: "bg-green-100 text-green-700 border border-green-200",
  };
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-full ${colorMap[color]}`}>
      {children}
    </span>
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

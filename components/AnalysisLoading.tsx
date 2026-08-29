"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

const STEPS = [
  { icon: "🔍", label: "Reading your complaint…" },
  { icon: "📍", label: "Extracting location clues…" },
  { icon: "🏛️", label: "Routing to departments…" },
  { icon: "📋", label: "Drafting official summary…" },
  { icon: "🔄", label: "Checking for duplicates…" },
];

export default function AnalysisLoading() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((s) => (s + 1) % STEPS.length);
    }, 1400);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mt-4">
      <div className="bg-gradient-to-br from-[#1a3c6e] to-[#2563eb] px-6 py-8 text-center text-white">
        <div className="relative w-24 h-24 mx-auto mb-5">
          <div className="absolute inset-0 rounded-full border-4 border-white/20" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-white border-r-white analysis-orbit" />
          <div className="absolute inset-3 rounded-full bg-white/10 backdrop-blur flex items-center justify-center">
            <Sparkles size={32} className="text-white analysis-pulse-icon" />
          </div>
        </div>
        <h3 className="font-bold text-lg mb-1">AI Analysis in Progress</h3>
        <p className="text-blue-100 text-sm">
          Preparing your official complaint summary…
        </p>
      </div>

      <div className="px-6 py-5">
        <div className="flex justify-center gap-1.5 mb-5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === activeStep ? "w-8 bg-[#1a3c6e]" : i < activeStep ? "w-3 bg-blue-300" : "w-3 bg-slate-200"
              }`}
            />
          ))}
        </div>

        <ul className="space-y-2">
          {STEPS.map((step, i) => (
            <li
              key={step.label}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all duration-300 ${
                i === activeStep
                  ? "bg-blue-50 text-[#1a3c6e] font-medium scale-[1.02] shadow-sm"
                  : i < activeStep
                  ? "bg-green-50 text-green-700"
                  : "bg-slate-50 text-slate-400"
              }`}
            >
              <span className="text-base">{i < activeStep ? "✓" : step.icon}</span>
              <span>{step.label}</span>
              {i === activeStep && (
                <span className="ml-auto flex gap-1">
                  {[0, 1, 2].map((d) => (
                    <span
                      key={d}
                      className="w-1.5 h-1.5 bg-[#1a3c6e] rounded-full analysis-dot"
                      style={{ animationDelay: `${d * 0.15}s` }}
                    />
                  ))}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

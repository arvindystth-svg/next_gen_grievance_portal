"use client";

import { useState } from "react";
import { X, User, Phone, MapPin, Shield, ChevronDown, Globe, Wifi, WifiOff, Bell } from "lucide-react";
import { CITIZEN_PROFILE } from "@/lib/seedData";

const LANGUAGES = [
  { code: "en", label: "English", native: "English" },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ" },
  { code: "hi", label: "Hindi", native: "हिंदी" },
  { code: "ta", label: "Tamil", native: "தமிழ்" },
  { code: "hin", label: "Hinglish", native: "Hinglish" },
];

interface HeaderProps {
  selectedLanguage: string;
  onLanguageChange: (code: string) => void;
  isOnline: boolean;
  offlineQueueCount: number;
  onMyComplaintsClick?: () => void;
  complaintCount?: number;
  /** When true, header is inside a sticky shell and should not apply its own positioning. */
  embedded?: boolean;
}

export default function Header({
  selectedLanguage,
  onLanguageChange,
  isOnline,
  offlineQueueCount,
  onMyComplaintsClick,
  complaintCount = 0,
  embedded = false,
}: HeaderProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const currentLang = LANGUAGES.find((l) => l.code === selectedLanguage) || LANGUAGES[0];

  return (
    <>
      {/* Main Header */}
      <header className={`bg-[#1a3c6e] text-white shadow-lg ${embedded ? "" : "sticky top-0 z-50"}`}>
        {/* Government stripe */}
        <div className="bg-[#f97316] h-1 w-full" />

        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            {/* Branding */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex-shrink-0 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow">
                <span className="text-[#1a3c6e] font-black text-sm">🏛️</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-bold text-base leading-tight truncate">AI CPGRAMS Local</h1>
                  <span className="hidden sm:inline-block bg-[#f97316] text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                    Bengaluru
                  </span>
                </div>
                <p className="text-blue-200 text-xs truncate">
                  Bruhat Bengaluru Mahanagara Palike
                </p>
              </div>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Offline/Online indicator */}
              <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${isOnline ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>
                {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
                <span className="hidden sm:inline">{isOnline ? "Online" : "Offline"}</span>
                {!isOnline && offlineQueueCount > 0 && (
                  <span className="bg-red-500 text-white rounded-full text-[10px] w-4 h-4 flex items-center justify-center font-bold">
                    {offlineQueueCount}
                  </span>
                )}
              </div>

              {/* Language selector */}
              <div className="relative">
                <button
                  onClick={() => setLangOpen(!langOpen)}
                  className="flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Globe size={12} />
                  <span>{currentLang.native}</span>
                  <ChevronDown size={10} className={`transition-transform ${langOpen ? "rotate-180" : ""}`} />
                </button>
                {langOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden z-50 min-w-[140px]">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          onLanguageChange(lang.code);
                          setLangOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between hover:bg-blue-50 transition-colors ${
                          selectedLanguage === lang.code
                            ? "bg-blue-50 text-blue-700 font-medium"
                            : "text-slate-700"
                        }`}
                      >
                        <span>{lang.native}</span>
                        {selectedLanguage === lang.code && (
                          <span className="text-blue-500">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* My complaints */}
              <button
                type="button"
                onClick={onMyComplaintsClick}
                className="relative p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                title="My Complaints"
                aria-label="View my complaints"
              >
                <Bell size={14} />
                {complaintCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-orange-400 text-[#1a3c6e] rounded-full text-[9px] font-bold flex items-center justify-center">
                    {complaintCount > 9 ? "9+" : complaintCount}
                  </span>
                )}
              </button>

              {/* Profile button */}
              <button
                onClick={() => setDrawerOpen(true)}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
              >
                <div className="w-6 h-6 bg-blue-400 rounded-full flex items-center justify-center text-xs font-bold">
                  {CITIZEN_PROFILE.name.charAt(0)}
                </div>
                <span className="hidden sm:inline text-xs font-medium truncate max-w-[80px]">
                  {CITIZEN_PROFILE.name.split(" ")[0]}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div className="bg-[#112d56] px-4 py-1.5">
          <div className="max-w-5xl mx-auto flex items-center justify-between text-[11px] text-blue-300">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Shield size={10} />
                <span>Govt. of India Initiative</span>
              </span>
              <span className="hidden sm:flex items-center gap-1">
                <MapPin size={10} />
                <span>BBMP South Zone Coverage</span>
              </span>
            </div>
            <span className="text-blue-400">
              Helpline: <span className="text-orange-300 font-medium">1533</span>
            </span>
          </div>
        </div>
      </header>

      {/* Citizen Profile Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative bg-white w-80 max-w-full h-full shadow-2xl flex flex-col overflow-y-auto">
            {/* Drawer header */}
            <div className="bg-[#1a3c6e] text-white p-6 pb-8">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-blue-200">Citizen Profile</span>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-400 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg">
                  {CITIZEN_PROFILE.name.charAt(0)}
                </div>
                <div>
                  <h2 className="font-bold text-lg">{CITIZEN_PROFILE.name}</h2>
                  <p className="text-blue-200 text-sm">{CITIZEN_PROFILE.city}</p>
                </div>
              </div>
            </div>

            {/* Profile details */}
            <div className="p-6 flex-1">
              <div className="space-y-4">
                <ProfileRow
                  icon={<User size={16} className="text-blue-600" />}
                  label="Citizen ID"
                  value={CITIZEN_PROFILE.id}
                />
                <ProfileRow
                  icon={<Phone size={16} className="text-green-600" />}
                  label="Mobile"
                  value={CITIZEN_PROFILE.phone}
                />
                <ProfileRow
                  icon={<MapPin size={16} className="text-red-500" />}
                  label="Ward"
                  value={CITIZEN_PROFILE.registeredWard}
                />
              </div>

              <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <Shield size={16} className="text-green-600" />
                  <span className="font-semibold text-green-800 text-sm">Verified Citizen</span>
                </div>
                <p className="text-xs text-green-700">
                  Your Aadhaar-linked profile is verified. All submissions are digitally signed and tracked.
                </p>
              </div>

              <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <h3 className="font-semibold text-blue-800 text-sm mb-2">Filing Statistics</h3>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-xl font-bold text-blue-700">3</div>
                    <div className="text-xs text-blue-500">Filed</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-green-600">2</div>
                    <div className="text-xs text-blue-500">Resolved</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-orange-500">1</div>
                    <div className="text-xs text-blue-500">Pending</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer footer */}
            <div className="p-4 border-t border-slate-100">
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-full bg-[#1a3c6e] text-white py-2.5 rounded-xl font-medium hover:bg-[#2563eb] transition-colors"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ProfileRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
      <div className="mt-0.5">{icon}</div>
      <div>
        <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</div>
        <div className="text-sm font-semibold text-slate-800 mt-0.5">{value}</div>
      </div>
    </div>
  );
}

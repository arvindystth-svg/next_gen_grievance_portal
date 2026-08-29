"use client";

import { useState } from "react";
import { X, Shield, ChevronDown, Globe, Wifi, WifiOff, Bell, LogOut } from "lucide-react";
import { LANGUAGE_OPTIONS } from "@/lib/i18n";
import { useLanguage } from "@/lib/LanguageContext";
import { CitizenSession } from "@/lib/citizenAuth";

interface HeaderProps {
  isOnline: boolean;
  offlineQueueCount: number;
  citizen?: CitizenSession | null;
  onLogout?: () => void;
  onMyComplaintsClick?: () => void;
  complaintCount?: number;
  embedded?: boolean;
}

export default function Header({
  isOnline,
  offlineQueueCount,
  citizen,
  onLogout,
  onMyComplaintsClick,
  complaintCount = 0,
  embedded = false,
}: HeaderProps) {
  const { language, setLanguage, t } = useLanguage();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const currentLang = LANGUAGE_OPTIONS.find((l) => l.code === language) || LANGUAGE_OPTIONS[0];

  const displayName = citizen?.name ?? t("app.citizen");
  const displayInitial = displayName.charAt(0);

  return (
    <>
      <header className={`bg-[#1a3c6e] text-white ${embedded ? "shadow-md" : "shadow-lg sticky top-0 z-50"}`}>
        <div className={`bg-[#f97316] w-full ${embedded ? "h-0.5" : "h-1"}`} />

        <div className={`max-w-5xl mx-auto px-3 ${embedded ? "py-1.5" : "px-4 py-3"}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`flex-shrink-0 bg-white rounded-full flex items-center justify-center shadow ${embedded ? "w-7 h-7" : "w-10 h-10"}`}>
                <span className={`text-[#1a3c6e] font-black ${embedded ? "text-xs" : "text-sm"}`}>🏛️</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h1 className={`font-bold leading-tight truncate ${embedded ? "text-sm" : "text-base"}`}>
                    {t("app.name")}
                  </h1>
                  <span className={`bg-[#f97316] text-white font-bold rounded uppercase tracking-wider ${embedded ? "text-[9px] px-1.5 py-0" : "hidden sm:inline-block text-[10px] px-2 py-0.5"}`}>
                    {t("app.bengaluru")}
                  </span>
                </div>
                {!embedded && (
                  <p className="text-blue-200 text-xs truncate">{t("app.tagline")}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <div className={`flex items-center rounded-full ${embedded ? "p-1" : "gap-1.5 text-xs px-2 py-1"} ${isOnline ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>
                {isOnline ? <Wifi size={embedded ? 11 : 12} /> : <WifiOff size={embedded ? 11 : 12} />}
                {!embedded && <span className="hidden sm:inline">{isOnline ? t("app.online") : t("app.offline")}</span>}
                {!isOnline && offlineQueueCount > 0 && (
                  <span className="bg-red-500 text-white rounded-full text-[10px] w-4 h-4 flex items-center justify-center font-bold">
                    {offlineQueueCount}
                  </span>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => setLangOpen(!langOpen)}
                  className={`flex items-center bg-white/10 hover:bg-white/20 rounded-lg transition-colors ${embedded ? "gap-1 px-2 py-1 text-[10px]" : "gap-1.5 text-xs px-3 py-1.5"}`}
                >
                  <Globe size={embedded ? 10 : 12} />
                  <span className={embedded ? "max-w-[52px] truncate" : ""}>{currentLang.native}</span>
                  {!embedded && (
                    <ChevronDown size={10} className={`transition-transform ${langOpen ? "rotate-180" : ""}`} />
                  )}
                </button>
                {langOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden z-50 min-w-[140px]">
                    {LANGUAGE_OPTIONS.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setLanguage(lang.code);
                          setLangOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between hover:bg-blue-50 transition-colors ${
                          language === lang.code ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700"
                        }`}
                      >
                        <span>{lang.native}</span>
                        {language === lang.code && <span className="text-blue-500">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={onMyComplaintsClick}
                className={`relative bg-white/10 hover:bg-white/20 rounded-lg transition-colors ${embedded ? "p-1" : "p-1.5"}`}
                title={t("app.myComplaints")}
                aria-label={t("app.myComplaints")}
              >
                <Bell size={embedded ? 12 : 14} />
                {complaintCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-orange-400 text-[#1a3c6e] rounded-full text-[9px] font-bold flex items-center justify-center">
                    {complaintCount > 9 ? "9+" : complaintCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setDrawerOpen(true)}
                className={`flex items-center bg-white/10 hover:bg-white/20 rounded-lg transition-colors ${embedded ? "p-1" : "gap-2 px-3 py-1.5"}`}
                aria-label={t("app.privacyTitle")}
              >
                <div className={`bg-blue-400 rounded-full flex items-center justify-center font-bold ${embedded ? "w-5 h-5 text-[10px]" : "w-6 h-6 text-xs"}`}>
                  {displayInitial}
                </div>
                {!embedded && (
                  <span className="hidden sm:inline text-xs font-medium truncate max-w-[80px]">
                    {displayName.split(" ")[0]}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {!embedded && (
          <div className="bg-[#112d56] px-4 py-1.5">
            <div className="max-w-5xl mx-auto flex items-center justify-between text-[11px] text-blue-300">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Shield size={10} />
                  <span>{t("app.govtInitiative")}</span>
                </span>
                <span className="hidden sm:inline">{t("app.zoneCoverage")}</span>
              </div>
              <span className="text-blue-400">
                {t("app.helpline")}: <span className="text-orange-300 font-medium">1533</span>
              </span>
            </div>
          </div>
        )}
      </header>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="relative bg-white w-80 max-w-full h-full shadow-2xl flex flex-col overflow-y-auto">
            <div className="bg-[#1a3c6e] text-white p-6 pb-8">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-blue-200">{t("app.privacyTitle")}</span>
                <button onClick={() => setDrawerOpen(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-400 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg">
                  {displayInitial}
                </div>
                <div>
                  <h2 className="font-bold text-lg">{displayName}</h2>
                  <p className="text-blue-200 text-sm">
                    {citizen ? `+91 ${citizen.maskedMobile}` : t("app.bengaluru")}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 flex-1">
              <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                <p className="text-xs text-green-700 leading-relaxed">{t("app.privacyBody")}</p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 space-y-2">
              {onLogout && (
                <button
                  onClick={() => {
                    setDrawerOpen(false);
                    onLogout();
                  }}
                  className="w-full border border-slate-200 text-slate-600 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5"
                >
                  <LogOut size={16} />
                  Log out
                </button>
              )}
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-full bg-[#1a3c6e] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#2563eb] transition-colors"
              >
                {t("app.close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

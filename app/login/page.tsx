"use client";

import { useLayoutEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, Shield, Loader2, ChevronRight, User } from "lucide-react";
import {
  DEMO_CITIZENS,
  findDemoCitizen,
  loadCitizenSession,
  normalizeMobile,
  saveCitizenSession,
  verifyDemoOtp,
} from "@/lib/citizenAuth";
import { redirectToHome } from "@/lib/authRedirect";

export default function LoginPage() {
  const router = useRouter();
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useLayoutEffect(() => {
    const session = loadCitizenSession();
    if (session?.mobile) {
      redirectToHome(router);
      return;
    }
    setCheckingSession(false);
  }, [router]);

  const handleSendOtp = () => {
    setError(null);
    const normalized = normalizeMobile(mobile);
    if (normalized.length !== 10) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    if (!findDemoCitizen(normalized)) {
      setError("This demo portal only accepts the 5 registered test numbers below.");
      return;
    }
    setOtpSent(true);
  };

  const handleVerify = async () => {
    setError(null);
    const normalized = normalizeMobile(mobile);
    const citizen = verifyDemoOtp(normalized, otp);
    if (!citizen) {
      setError("Invalid OTP. Use the OTP shown for your demo account.");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    saveCitizenSession(citizen);
    redirectToHome(router);
  };

  const fillDemo = (demoMobile: string, demoOtp: string) => {
    setMobile(demoMobile);
    setOtp(demoOtp);
    setOtpSent(true);
    setError(null);
  };

  if (checkingSession) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-slate-100 gap-3">
        <Loader2 className="animate-spin text-[#1a3c6e]" size={28} />
        <p className="text-sm text-slate-600">Checking session…</p>
      </div>
    );
  }

  return (
    <>
      <header className="bg-[#1a3c6e] text-white shadow-lg sticky top-0 z-10">
        <div className="h-1 bg-[#f97316]" />
        <div className="max-w-md mx-auto px-4 py-4 text-center">
          <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow">
            <span className="text-xl">🏛️</span>
          </div>
          <h1 className="text-lg font-bold">Next-Gen National Grievance Portal</h1>
          <p className="text-blue-200 text-xs mt-0.5">Citizen login · Government of India</p>
        </div>
      </header>

      <main className="max-w-md w-full mx-auto px-4 py-4 pb-8 space-y-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-3">
          <div className="flex items-center gap-2 text-[#1a3c6e]">
            <Shield size={16} />
            <h2 className="font-bold text-sm">Mobile OTP login</h2>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Mobile number
            </label>
            <div className="mt-1 flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 focus-within:border-blue-500 bg-white">
              <Phone size={15} className="text-slate-400 flex-shrink-0" />
              <span className="text-slate-500 text-sm">+91</span>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={mobile}
                onChange={(e) => setMobile(normalizeMobile(e.target.value))}
                placeholder="9876543210"
                className="flex-1 text-sm outline-none text-slate-800"
              />
            </div>
          </div>

          {!otpSent ? (
            <button
              type="button"
              onClick={handleSendOtp}
              className="w-full bg-[#1a3c6e] hover:bg-[#2563eb] text-white text-sm font-semibold py-2 rounded-lg transition-colors"
            >
              Send OTP
            </button>
          ) : (
            <>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  One-time password
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6-digit OTP"
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 tracking-[0.3em] text-center font-mono"
                />
              </div>

              <button
                type="button"
                onClick={handleVerify}
                disabled={loading || otp.length !== 6}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
                Verify &amp; continue
              </button>

              <button
                type="button"
                onClick={() => {
                  setOtpSent(false);
                  setOtp("");
                }}
                className="w-full text-xs text-slate-500 hover:text-slate-700"
              >
                Change mobile number
              </button>
            </>
          )}

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 py-2 border-b border-slate-100 bg-slate-50">
            <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Demo accounts — tap to fill
            </p>
          </div>
          <ul className="divide-y divide-slate-100">
            {DEMO_CITIZENS.map((citizen) => (
              <li key={citizen.id}>
                <button
                  type="button"
                  onClick={() => fillDemo(citizen.mobile, citizen.otp)}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors flex items-center gap-2.5"
                >
                  <div className="w-8 h-8 rounded-full bg-[#1a3c6e]/10 text-[#1a3c6e] flex items-center justify-center flex-shrink-0">
                    <User size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-800 leading-tight">{citizen.name}</p>
                    <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                      {citizen.mobile} · OTP {citizen.otp}
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-slate-400 flex-shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-center text-[10px] text-slate-400 leading-relaxed px-2 pb-2">
          Demo portal only. OTP verification is simulated for the five test citizens above.
        </p>
      </main>
    </>
  );
}
